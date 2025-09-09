/**
 * Telegram机器人主服务 - 重构后的集成版本
 * 整合命令处理、回调处理、键盘构建等模块
 * 支持从数据库读取配置
 * 
 * 重构说明：
 * - 将原来的巨型类分离为多个专门的模块
 * - 保持完全相同的公共接口和方法签名
 * - 确保功能完整性和向后兼容性
 */
import TelegramBot from 'node-telegram-bot-api';
import type { TelegramBotConfig, TronNetworkConfig } from '../config/ConfigService.js';
import { CallbackHandler } from './callbacks/CallbackHandler.js';
import { CommandHandler } from './commands/CommandHandler.js';
import { KeyboardBuilder } from './keyboards/KeyboardBuilder.js';
import { BotAPIHandler } from './modules/BotAPIHandler.js';
import { BotConfigManager } from './modules/BotConfigManager.js';
import { BotInitializer } from './modules/BotInitializer.js';
import { BotLogger } from './modules/BotLogger.js';
import { BotWorkModeManager } from './modules/BotWorkModeManager.js';
import type { BotConfig } from './types/bot.types.js';
import { BotUtils } from './utils/BotUtils.js';

export class TelegramBotService {
  private bot: TelegramBot;
  private commandHandler: CommandHandler;
  private callbackHandler: CallbackHandler;
  private keyboardBuilder: KeyboardBuilder;
  private botUtils: BotUtils;
  private config: BotConfig;
  private isInitialized: boolean = false;
  private botId: string | null = null;

  // 分离后的模块
  private botInitializer: BotInitializer;
  private botConfigManager: BotConfigManager;
  private botLogger: BotLogger;
  private botAPIHandler: BotAPIHandler;
  private botWorkModeManager: BotWorkModeManager;

  constructor(config?: Partial<BotConfig>) {
    // 临时配置，实际配置将从数据库加载
    this.config = {
      token: config?.token || 'temp-token',
      polling: config?.polling !== false,
      webhook: false,
      ...config
    };

    // 初始化模块
    this.botInitializer = new BotInitializer();
    this.botConfigManager = new BotConfigManager(null, []);
    this.botLogger = new BotLogger(null, null);
    this.botWorkModeManager = new BotWorkModeManager(this.config);

    // 延迟初始化，等待从数据库加载配置
    this.initializeFromDatabase();
  }

  /**
   * 从数据库初始化机器人配置
   */
  private async initializeFromDatabase(): Promise<void> {
    try {
      const initResult = await this.botInitializer.initializeFromDatabase(this.config);
      
      this.bot = initResult.bot;
      this.botId = initResult.botId;
      this.botConfigManager = new BotConfigManager(initResult.botConfig, initResult.networks);
      this.botLogger = new BotLogger(initResult.botId, initResult.fileLogger);
      this.botAPIHandler = new BotAPIHandler(this.bot, this.config);

      // 初始化各个处理模块
      this.commandHandler = new CommandHandler(this.bot);
      this.callbackHandler = new CallbackHandler(this.bot);
      this.keyboardBuilder = new KeyboardBuilder(this.bot, this.botId || 'unknown');
      this.botUtils = new BotUtils(this.bot);

      // 设置处理器
      this.setupHandlers();
      this.setupErrorHandling();
      this.setupConfigChangeListener();

      this.isInitialized = true;
      
      if (initResult.botConfig) {
        console.log(`✅ 机器人已从数据库配置初始化: ${initResult.botConfig.botName}`);
        await this.botLogger.logBotInitialization(initResult.botConfig.botName);
      }
      
    } catch (error) {
      console.error('从数据库初始化机器人配置失败:', error);
      this.isInitialized = true; // 标记为已初始化，避免无限等待
    }
  }

  /**
   * 设置配置变更监听器
   */
  private setupConfigChangeListener(): void {
    this.botConfigManager.setupConfigChangeListener(async () => {
      await this.reloadConfiguration();
    });
  }

  /**
   * 重新加载配置
   */
  async reloadConfiguration(): Promise<void> {
    await this.botConfigManager.reloadConfiguration(async () => {
      await this.stop();
    });
  }

  /**
   * 等待初始化完成
   */
  async waitForInitialization(): Promise<void> {
    await this.botInitializer.waitForInitialization();
  }

  /**
   * 记录机器人活动日志 - 分层日志架构
   * 业务事件写入数据库，运行日志写入文件
   */
  async logBotActivity(
    level: 'info' | 'warn' | 'error' | 'debug',
    action: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    await this.botLogger.logBotActivity(level, action, message, metadata);
  }

  /**
   * 获取当前机器人配置
   */
  getBotConfig(): TelegramBotConfig | null {
    return this.botConfigManager.getBotConfig();
  }

  /**
   * 获取当前网络配置
   */
  getNetworks(): TronNetworkConfig[] {
    return this.botConfigManager.getNetworks();
  }

  /**
   * 获取默认网络配置
   */
  getDefaultNetwork(): TronNetworkConfig | null {
    return this.botConfigManager.getDefaultNetwork();
  }

  /**
   * 根据网络类型获取网络配置
   */
  getNetworkByType(networkType: string): TronNetworkConfig | null {
    return this.botConfigManager.getNetworkByType(networkType);
  }

  /**
   * 设置所有处理器
   */
  private setupHandlers(): void {
    // 注册命令处理器
    this.commandHandler.registerCommands();
    
    // 注册回调查询处理器
    this.callbackHandler.registerCallbacks();

    // 重写命令处理器中需要调用键盘构建器的方法
    this.overrideCommandHandlerMethods();
    
    // 重写回调处理器中需要调用其他模块的方法
    this.overrideCallbackHandlerMethods();
  }

  /**
   * 重写命令处理器的方法，以便调用键盘构建器
   */
  private overrideCommandHandlerMethods(): void {
    // 重写 /start 命令的后续处理
    const originalHandleStart = this.commandHandler.handleStartCommand.bind(this.commandHandler);
    this.commandHandler.handleStartCommand = async (msg: TelegramBot.Message) => {
      await originalHandleStart(msg);
      // 显示主菜单
      await this.keyboardBuilder.showMainMenu(msg.chat.id);
    };

    // 重写 /menu 命令处理
    this.commandHandler.handleMenuCommand = async (msg: TelegramBot.Message) => {
      await this.keyboardBuilder.showMainMenu(msg.chat.id);
    };
  }

  /**
   * 重写回调处理器的方法，以便调用其他模块
   */
  private overrideCallbackHandlerMethods(): void {
    // 保存原始的路由方法
    const originalRouteCallback = (this.callbackHandler as any).routeCallback.bind(this.callbackHandler);
    
    // 重写路由方法
    (this.callbackHandler as any).routeCallback = async (chatId: number, data: string, callbackQuery: TelegramBot.CallbackQuery) => {
      switch (data) {
        case 'buy_energy':
          await this.keyboardBuilder.showEnergyPackages(chatId);
          break;
        case 'my_orders':
          await this.commandHandler.handleOrdersCommand({ 
            chat: { id: chatId }, 
            from: callbackQuery.from 
          } as TelegramBot.Message);
          break;
        case 'check_balance':
          await this.commandHandler.handleBalanceCommand({ 
            chat: { id: chatId }, 
            from: callbackQuery.from 
          } as TelegramBot.Message);
          break;
        case 'help_support':
          await this.commandHandler.handleHelpCommand({ 
            chat: { id: chatId }, 
            from: callbackQuery.from 
          } as TelegramBot.Message);
          break;
        case 'refresh_menu':
          await this.keyboardBuilder.showMainMenu(chatId);
          break;
        default:
          // 调用原始的路由处理
          await originalRouteCallback(chatId, data, callbackQuery);
          break;
      }
    };
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    // 处理轮询错误
    this.bot.on('polling_error', async (error) => {
      console.error('Telegram Bot polling error:', error);
      await this.botLogger.logBotError('polling_error', `轮询错误: ${error.message}`, error);
    });

    // 处理一般错误
    this.bot.on('error', async (error) => {
      console.error('Telegram Bot error:', error);
      await this.botLogger.logBotError('bot_error', `机器人错误: ${error.message}`, error);
    });

    // 处理未捕获的异常
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception in Telegram Bot:', error);
      await this.botLogger.logBotError('uncaught_exception', `未捕获异常: ${error.message}`, error);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled Rejection in Telegram Bot:', reason);
      await this.botLogger.logBotError('unhandled_rejection', `未处理的Promise拒绝: ${reason}`, { reason, promise });
    });
  }

  // ========== 公共API方法（保持完全兼容） ==========

  /**
   * 获取机器人信息
   */
  async getBotInfo(): Promise<TelegramBot.User> {
    return await this.botAPIHandler.getBotInfo();
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId: number, message: string, options?: TelegramBot.SendMessageOptions): Promise<TelegramBot.Message> {
    try {
      const result = await this.botAPIHandler.sendMessage(chatId, message, options);
      await this.botLogger.logBotActivity('info', 'send_message', `发送消息到聊天 ${chatId}`, { 
        chatId, 
        messageLength: message.length,
        messageId: result.message_id 
      });
      return result;
    } catch (error) {
      await this.botLogger.logBotActivity('error', 'send_message_failed', `发送消息失败到聊天 ${chatId}: ${error.message}`, { 
        chatId, 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * 发送照片
   */
  async sendPhoto(chatId: number, photo: string | Buffer, options?: TelegramBot.SendPhotoOptions): Promise<TelegramBot.Message> {
    return await this.botAPIHandler.sendPhoto(chatId, photo, options);
  }

  /**
   * 发送文档
   */
  async sendDocument(chatId: number, document: string | Buffer, options?: TelegramBot.SendDocumentOptions): Promise<TelegramBot.Message> {
    return await this.botAPIHandler.sendDocument(chatId, document, options);
  }

  /**
   * 编辑消息
   */
  async editMessageText(text: string, options: TelegramBot.EditMessageTextOptions): Promise<TelegramBot.Message | boolean> {
    return await this.botAPIHandler.editMessageText(text, options);
  }

  /**
   * 删除消息
   */
  async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
    return await this.botAPIHandler.deleteMessage(chatId, messageId);
  }

  /**
   * 回答回调查询
   */
  async answerCallbackQuery(callbackQueryId: string, options?: TelegramBot.AnswerCallbackQueryOptions): Promise<boolean> {
    return await this.botAPIHandler.answerCallbackQuery(callbackQueryId, options);
  }

  /**
   * 设置机器人命令菜单
   */
  async setMyCommands(commands: TelegramBot.BotCommand[]): Promise<boolean> {
    try {
      const result = await this.botAPIHandler.setMyCommands(commands);
      if (result) {
        await this.botLogger.logSyncSuccess('commands', '命令菜单', { commands, commandCount: commands.length });
      } else {
        await this.botLogger.logSyncFailure('commands', '命令菜单', '设置失败');
      }
      return result;
    } catch (error) {
      await this.botLogger.logSyncFailure('commands', '命令菜单', error.message);
      return false;
    }
  }

  /**
   * 设置机器人名称
   */
  async setMyName(name: string): Promise<boolean> {
    try {
      const result = await this.botAPIHandler.setMyName(name);
      if (result) {
        await this.botLogger.logSyncSuccess('name', name);
      } else {
        await this.botLogger.logSyncFailure('name', name, '设置失败');
      }
      return result;
    } catch (error) {
      await this.botLogger.logSyncFailure('name', name, error.message);
      return false;
    }
  }

  /**
   * 设置机器人描述
   */
  async setMyDescription(description: string): Promise<boolean> {
    try {
      const result = await this.botAPIHandler.setMyDescription(description);
      if (result) {
        await this.botLogger.logSyncSuccess('description', description);
      } else {
        await this.botLogger.logSyncFailure('description', description, '设置失败');
      }
      return result;
    } catch (error) {
      await this.botLogger.logSyncFailure('description', description, error.message);
      return false;
    }
  }

  /**
   * 从Telegram获取机器人名称
   */
  async getMyName(): Promise<string | null> {
    return await this.botAPIHandler.getMyName();
  }

  /**
   * 从Telegram获取机器人描述
   */
  async getMyDescription(): Promise<string | null> {
    return await this.botAPIHandler.getMyDescription();
  }

  /**
   * 从Telegram获取机器人命令列表
   */
  async getMyCommands(): Promise<TelegramBot.BotCommand[] | null> {
    return await this.botAPIHandler.getMyCommands();
  }

  /**
   * 从Telegram同步机器人信息到数据库
   */
  async syncFromTelegram(): Promise<{
    success: boolean;
    data?: {
      name: string | null;
      description: string | null;
      commands: TelegramBot.BotCommand[] | null;
      botInfo: any;
    };
    error?: string;
  }> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        // 尝试重新初始化机器人
        console.log('机器人未初始化，尝试重新初始化...');
        try {
          await this.initializeFromDatabase();
          if (!this.bot) {
            return {
              success: false,
              error: '机器人初始化失败，请检查Token是否有效'
            };
          }
        } catch (initError) {
          console.error('重新初始化机器人失败:', initError);
          return {
            success: false,
            error: `机器人初始化失败: ${initError.message}`
          };
        }
      }

      // 获取机器人基本信息
      const botInfo = await this.getBotInfo();
      
      // 获取机器人名称
      const name = await this.getMyName();
      
      // 获取机器人描述
      const description = await this.getMyDescription();
      
      // 获取机器人命令列表
      const commands = await this.getMyCommands();

      console.log('✅ 从Telegram获取机器人信息成功:', {
        botInfo: { id: botInfo.id, username: botInfo.username, first_name: botInfo.first_name },
        name,
        description,
        commands: commands?.length || 0
      });

      return {
        success: true,
        data: {
          name,
          description,
          commands,
          botInfo
        }
      };
    } catch (error) {
      console.error('从Telegram同步机器人信息失败:', error);
      
      // 提供更详细的错误信息
      let errorMessage = error.message;
      if (error.code === 'ETELEGRAM') {
        if (error.response?.body?.error_code === 401) {
          errorMessage = 'Bot Token无效，请检查Token是否正确';
        } else if (error.response?.body?.description) {
          errorMessage = `Telegram API错误: ${error.response.body.description}`;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 设置Webhook
   */
  async setWebhook(url: string, options?: TelegramBot.SetWebHookOptions): Promise<boolean> {
    return await this.botAPIHandler.setWebhook(url, options);
  }

  /**
   * 获取Webhook信息
   */
  async getWebhookInfo(): Promise<TelegramBot.WebhookInfo> {
    return await this.botAPIHandler.getWebhookInfo();
  }

  /**
   * 删除Webhook
   */
  async deleteWebhook(): Promise<boolean> {
    return await this.botAPIHandler.deleteWebhook();
  }

  /**
   * 启动机器人
   */
  async start(): Promise<void> {
    try {
      // 等待初始化完成
      await this.waitForInitialization();
      
      // 检查机器人是否正确初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未正确初始化，跳过启动');
        return;
      }
      
      const botInfo = await this.getBotInfo();
      const botName = this.getBotConfig()?.botName || 'Unknown';
      console.log(`Telegram Bot started: @${botInfo.username} (${botName})`);

      // 设置机器人命令菜单
      await this.setMyCommands([
        { command: 'start', description: '启动机器人' },
        { command: 'menu', description: '显示主菜单' },
        { command: 'help', description: '获取帮助' },
        { command: 'balance', description: '查询余额' },
        { command: 'orders', description: '查看订单' }
      ]);

      console.log('Telegram Bot commands menu set successfully');
      
      // 记录机器人启动成功日志
      await this.botLogger.logBotStart(`@${botInfo.username} (${botName})`, this.getCurrentWorkMode());
    } catch (error) {
      console.error('Failed to start Telegram Bot:', error);
      console.warn('⚠️ 机器人启动失败，但应用将继续运行。请检查机器人配置。');
      
      // 记录启动失败日志
      await this.botLogger.logBotError('bot_start_failed', `机器人启动失败: ${error.message}`, error);
      
      // 不抛出错误，让应用继续运行
    }
  }

  /**
   * 停止机器人
   */
  async stop(): Promise<void> {
    try {
      if (this.bot) {
        await this.bot.stopPolling();
      }
      const botName = this.getBotConfig()?.botName || 'Unknown';
      console.log(`Telegram Bot stopped: ${botName}`);
      
      // 记录机器人停止日志
      await this.botLogger.logBotStop(botName);
      
    } catch (error) {
      console.error('Failed to stop Telegram Bot:', error);
      
      // 记录停止失败日志
      await this.botLogger.logBotError('bot_stop_failed', `机器人停止失败: ${error.message}`, error);
      
      throw error;
    }
  }

  /**
   * 获取机器人实例（用于高级操作）
   */
  getBotInstance(): TelegramBot {
    return this.bot;
  }

  /**
   * 获取命令处理器实例
   */
  getCommandHandler(): CommandHandler {
    return this.commandHandler;
  }

  /**
   * 获取回调处理器实例
   */
  getCallbackHandler(): CallbackHandler {
    return this.callbackHandler;
  }

  /**
   * 获取键盘构建器实例
   */
  getKeyboardBuilder(): KeyboardBuilder {
    return this.keyboardBuilder;
  }

  /**
   * 获取工具类实例
   */
  getBotUtils(): BotUtils {
    return this.botUtils;
  }

  /**
   * 广播消息给所有用户（管理员功能）
   */
  async broadcastMessage(message: string, userIds?: number[]): Promise<void> {
    // 这里需要实现广播逻辑
    // 如果没有指定用户ID，则需要从数据库获取所有活跃用户
    console.log('Broadcast message:', message);
  }

  /**
   * 获取机器人统计信息
   */
  async getStats(): Promise<any> {
    // 这里可以返回机器人的使用统计
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      // 其他统计信息...
    };
  }

  /**
   * 动态切换机器人工作模式
   */
  async switchWorkMode(mode: 'polling' | 'webhook', webhookConfig?: {
    url?: string;
    secret?: string;
    maxConnections?: number;
  }): Promise<boolean> {
    const result = await this.botWorkModeManager.switchWorkMode(this.bot, mode, webhookConfig);
    
    if (result.success && result.bot && result.handlers) {
      // 更新实例
      this.bot = result.bot;
      this.commandHandler = result.handlers.commandHandler;
      this.callbackHandler = result.handlers.callbackHandler;
      this.keyboardBuilder = result.handlers.keyboardBuilder;
      this.botUtils = result.handlers.botUtils;
      
      // 更新API处理器
      this.botAPIHandler = new BotAPIHandler(this.bot, this.config);
      
      // 重新设置处理器
      this.setupHandlers();
      this.setupErrorHandling();
    }
    
    return result.success;
  }

  /**
   * 获取当前工作模式
   */
  getCurrentWorkMode(): 'polling' | 'webhook' | 'unknown' {
    return this.botWorkModeManager.getCurrentWorkMode();
  }

  /**
   * 检查机器人是否支持某种工作模式
   */
  async canSwitchToMode(mode: 'polling' | 'webhook'): Promise<{ canSwitch: boolean; reason?: string }> {
    return await this.botWorkModeManager.canSwitchToMode(this.bot, mode);
  }

  /**
   * 获取Webhook信息（增强版，支持模式检查）
   */
  async getWebhookInfoEnhanced(): Promise<any> {
    return await this.botWorkModeManager.getWebhookInfoEnhanced(this.bot);
  }

  /**
   * 设置Webhook（仅webhook模式）
   */
  async setWebhookUrl(url: string, options?: {
    secret?: string;
    maxConnections?: number;
    allowedUpdates?: string[];
  }): Promise<boolean> {
    return await this.botWorkModeManager.setWebhookUrl(this.bot, url, options);
  }
}
