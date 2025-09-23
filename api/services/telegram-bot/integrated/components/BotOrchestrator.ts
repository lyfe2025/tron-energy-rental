/**
 * 机器人协调器
 * 负责协调各个模块之间的交互和工作流程
 */
import TelegramBot from 'node-telegram-bot-api';
import { CallbackHandler } from '../../callbacks/CallbackHandler.ts';
import { CommandHandler } from '../../commands/CommandHandler.ts';
import { PriceConfigMessageHandler } from '../../handlers/PriceConfigMessageHandler.ts';
import { KeyboardBuilder } from '../../keyboards/KeyboardBuilder.ts';
import { BotAPIHandler } from '../../modules/BotAPIHandler.ts';
import { BotConfigManager } from '../../modules/BotConfigManager.ts';
import { BotInitializer } from '../../modules/BotInitializer.ts';
import { BotLogger } from '../../modules/BotLogger.ts';
import { BotWorkModeManager } from '../../modules/BotWorkModeManager.ts';
import { BotUtils } from '../../utils/BotUtils.ts';
import type { BotConfig } from '../types/bot.types.ts';

export class BotOrchestrator {
  private bot: TelegramBot;
  private config: BotConfig;
  private isRunning: boolean = false;
  private messageHandlers: Set<(message: any) => Promise<void>> = new Set();
  private callbackHandlers: Set<(query: any) => Promise<void>> = new Set();

  // 模块实例
  private commandHandler: CommandHandler;
  private callbackHandler: CallbackHandler;
  private priceConfigMessageHandler: PriceConfigMessageHandler;
  private keyboardBuilder: KeyboardBuilder;
  private botUtils: BotUtils;
  private botInitializer: BotInitializer;
  private botConfigManager: BotConfigManager;
  private botLogger: BotLogger;
  private botAPIHandler: BotAPIHandler;
  private botWorkModeManager: BotWorkModeManager;

  constructor(
    bot: TelegramBot,
    config: BotConfig,
    modules: {
      commandHandler: CommandHandler;
      callbackHandler: CallbackHandler;
      priceConfigMessageHandler: PriceConfigMessageHandler;
      keyboardBuilder: KeyboardBuilder;
      botUtils: BotUtils;
      botInitializer: BotInitializer;
      botConfigManager: BotConfigManager;
      botLogger: BotLogger;
      botAPIHandler: BotAPIHandler;
      botWorkModeManager: BotWorkModeManager;
    }
  ) {
    this.bot = bot;
    this.config = config;
    
    // 注入模块
    this.commandHandler = modules.commandHandler;
    this.callbackHandler = modules.callbackHandler;
    this.priceConfigMessageHandler = modules.priceConfigMessageHandler;
    this.keyboardBuilder = modules.keyboardBuilder;
    this.botUtils = modules.botUtils;
    this.botInitializer = modules.botInitializer;
    this.botConfigManager = modules.botConfigManager;
    this.botLogger = modules.botLogger;
    this.botAPIHandler = modules.botAPIHandler;
    this.botWorkModeManager = modules.botWorkModeManager;
  }

  /**
   * 启动机器人协调器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('机器人协调器已在运行中');
    }

    try {
      await this.botLogger.logBotActivity('info', 'orchestrator_starting', '开始启动机器人协调器', { botId: this.config.botId });

      // 1. 设置事件监听器
      this.setupEventListeners();

      // 2. 启动工作模式管理器
      await this.botWorkModeManager.start();

      // 3. 标记为运行状态
      this.isRunning = true;

      await this.botLogger.logBotActivity('info', 'orchestrator_started', '机器人协调器启动成功', { botId: this.config.botId });
    } catch (error) {
      await this.botLogger.logBotActivity('error', 'orchestrator_start_failed', '机器人协调器启动失败', {
        botId: this.config.botId,
        error: error instanceof Error ? error.message : '未知错误'
      });
      throw error;
    }
  }

  /**
   * 停止机器人协调器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.botLogger.logBotActivity('info', 'orchestrator_stopping', '开始停止机器人协调器', { botId: this.config.botId });

      // 1. 停止工作模式管理器
      await this.botWorkModeManager.stop();

      // 2. 移除事件监听器
      this.removeEventListeners();

      // 3. 标记为停止状态
      this.isRunning = false;

      await this.botLogger.logBotActivity('info', 'orchestrator_stopped', '机器人协调器停止成功', { botId: this.config.botId });
    } catch (error) {
      await this.botLogger.logBotActivity('error', 'orchestrator_stop_failed', '机器人协调器停止失败', {
        botId: this.config.botId,
        error: error instanceof Error ? error.message : '未知错误'
      });
      throw error;
    }
  }

  /**
   * 重启机器人协调器
   */
  async restart(): Promise<void> {
    await this.botLogger.logBotActivity('info', 'orchestrator_restarting', '重启机器人协调器', { botId: this.config.botId });
    
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    await this.start();
  }

  /**
   * 处理消息
   */
  async handleMessage(message: any): Promise<void> {
    try {
      // 记录消息活动
      await this.botLogger.logBotActivity('debug', 'message_received', '收到消息', {
        botId: this.config.botId,
        messageId: message.message_id,
        userId: message.from?.id,
        chatId: message.chat.id
      });

      // 更新配置（如果需要）
      await this.botConfigManager.refreshConfigIfNeeded();

      // 分发到命令处理器
      const handled = await this.commandHandler.handleCommand(message);
      
      if (!handled) {
        // 优先尝试价格配置消息处理器
        const priceConfigHandled = await this.priceConfigMessageHandler.handleMessage(message);
        
        if (!priceConfigHandled) {
          // 如果价格配置处理器也没有处理，分发到其他消息处理器
          for (const handler of this.messageHandlers) {
            try {
              await handler(message);
            } catch (error) {
              await this.botLogger.logBotActivity('error', 'message_handler_failed', '消息处理器执行失败', {
                botId: this.config.botId,
                error: error instanceof Error ? error.message : '未知错误'
              });
            }
          }
        }
      }

    } catch (error) {
      await this.botLogger.logBotActivity('error', 'message_processing_failed', '消息处理失败', {
        botId: this.config.botId,
        messageId: message.message_id,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 处理回调查询
   */
  async handleCallbackQuery(query: any): Promise<void> {
    try {
      // 记录回调活动
      await this.botLogger.logBotActivity('debug', 'callback_received', '收到回调查询', {
        botId: this.config.botId,
        queryId: query.id,
        userId: query.from?.id,
        data: query.data
      });

      // 更新配置（如果需要）
      await this.botConfigManager.refreshConfigIfNeeded();

      // 分发到回调处理器
      const handled = await this.callbackHandler.handleCallback(query);
      
      if (!handled) {
        // 如果回调处理器没有处理，分发到其他回调处理器
        for (const handler of this.callbackHandlers) {
          try {
            await handler(query);
          } catch (error) {
            await this.botLogger.logBotActivity('error', 'callback_handler_failed', '回调处理器执行失败', {
              botId: this.config.botId,
              error: error instanceof Error ? error.message : '未知错误'
            });
          }
        }
      }

    } catch (error) {
      await this.botLogger.logBotActivity('error', 'callback_processing_failed', '回调查询处理失败', {
        botId: this.config.botId,
        queryId: query.id,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 消息监听器
    this.bot.on('message', (message) => {
      this.handleMessage(message).catch(error => {
        console.error('消息处理异常:', error);
      });
    });

    // 回调查询监听器
    this.bot.on('callback_query', (query) => {
      this.handleCallbackQuery(query).catch(error => {
        console.error('回调查询处理异常:', error);
      });
    });

    // 错误监听器
    this.bot.on('error', (error) => {
      this.botLogger.logBotActivity('error', 'telegram_api_error', 'Telegram API错误', {
        botId: this.config.botId,
        error: error.message
      }).catch(logError => {
        console.error('记录错误日志失败:', logError);
      });
    });

    // Polling错误监听器
    this.bot.on('polling_error', (error) => {
      this.botLogger.logBotActivity('error', 'polling_error', 'Polling错误', {
        botId: this.config.botId,
        error: error.message
      }).catch(logError => {
        console.error('记录Polling错误日志失败:', logError);
      });
    });

    // Webhook错误监听器
    this.bot.on('webhook_error', (error) => {
      this.botLogger.logBotActivity('error', 'webhook_error', 'Webhook错误', {
        botId: this.config.botId,
        error: error.message
      }).catch(logError => {
        console.error('记录Webhook错误日志失败:', logError);
      });
    });
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(): void {
    this.bot.removeAllListeners('message');
    this.bot.removeAllListeners('callback_query');
    this.bot.removeAllListeners('error');
    this.bot.removeAllListeners('polling_error');
    this.bot.removeAllListeners('webhook_error');
  }

  /**
   * 添加消息处理器
   */
  addMessageHandler(handler: (message: any) => Promise<void>): void {
    this.messageHandlers.add(handler);
  }

  /**
   * 移除消息处理器
   */
  removeMessageHandler(handler: (message: any) => Promise<void>): void {
    this.messageHandlers.delete(handler);
  }

  /**
   * 添加回调处理器
   */
  addCallbackHandler(handler: (query: any) => Promise<void>): void {
    this.callbackHandlers.add(handler);
  }

  /**
   * 移除回调处理器
   */
  removeCallbackHandler(handler: (query: any) => Promise<void>): void {
    this.callbackHandlers.delete(handler);
  }

  /**
   * 获取运行状态
   */
  isOrchestratorRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 获取配置
   */
  getConfig(): BotConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: Partial<BotConfig>): Promise<void> {
    try {
      const oldConfig = { ...this.config };
      this.config = { ...this.config, ...newConfig };

      // 通知配置管理器配置已更新
      await this.botConfigManager.updateConfig(newConfig as any, this.botConfigManager.getNetworks());

      // 检查是否需要重启工作模式
      const workModeChanged = oldConfig.polling !== this.config.polling || 
                             oldConfig.webhook !== this.config.webhook ||
                             oldConfig.webhookUrl !== this.config.webhookUrl;

      if (workModeChanged) {
        await this.botLogger.logBotActivity('info', 'workmode_config_changed', '工作模式配置变更，重启工作模式管理器', {
          botId: this.config.botId,
          oldMode: oldConfig.polling ? 'polling' : 'webhook',
          newMode: this.config.polling ? 'polling' : 'webhook'
        });

        await this.botWorkModeManager.restart();
      }

      await this.botLogger.logBotActivity('info', 'config_updated', '配置更新成功', {
        botId: this.config.botId,
        changes: Object.keys(newConfig)
      });

    } catch (error) {
      await this.botLogger.logBotActivity('error', 'config_update_failed', '配置更新失败', {
        botId: this.config.botId,
        error: error instanceof Error ? error.message : '未知错误'
      });
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<any> {
    return {
      isRunning: this.isRunning,
      botId: this.config.botId,
      workMode: this.config.polling ? 'polling' : 'webhook',
      messageHandlers: this.messageHandlers.size,
      callbackHandlers: this.callbackHandlers.size,
      uptime: Date.now() - (this.botInitializer as any).startTime || 0
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      const details: any = {
        orchestrator: this.isRunning,
        workModeManager: this.botWorkModeManager.isStarted(),
        lastActivity: new Date().toISOString()
      };

      // 检查Telegram API连接
      try {
        await this.botAPIHandler.getMe();
        details.telegramAPI = true;
      } catch (error) {
        details.telegramAPI = false;
        details.telegramAPIError = error instanceof Error ? error.message : '未知错误';
      }

      const isHealthy = details.orchestrator && 
                       details.workModeManager && 
                       details.telegramAPI;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        }
      };
    }
  }
}
