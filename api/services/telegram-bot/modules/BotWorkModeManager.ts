/**
 * 机器人工作模式管理模块
 * 负责工作模式的切换和Webhook管理
 */
import TelegramBot from 'node-telegram-bot-api';
import { CallbackHandler } from '../callbacks/CallbackHandler.js';
import { CommandHandler } from '../commands/CommandHandler.js';
import { KeyboardBuilder } from '../keyboards/KeyboardBuilder.js';
import type { BotConfig } from '../types/bot.types.js';
import { BotUtils } from '../utils/BotUtils.js';

export class BotWorkModeManager {
  private config: BotConfig;

  constructor(config: BotConfig) {
    this.config = config;
  }

  /**
   * 动态切换机器人工作模式
   */
  async switchWorkMode(
    currentBot: TelegramBot,
    mode: 'polling' | 'webhook',
    webhookConfig?: {
      url?: string;
      secret?: string;
      maxConnections?: number;
    },
    botId?: string
  ): Promise<{
    success: boolean;
    bot?: TelegramBot;
    handlers?: {
      commandHandler: CommandHandler;
      callbackHandler: CallbackHandler;
      keyboardBuilder: KeyboardBuilder;
      botUtils: BotUtils;
    };
  }> {
    try {
      console.log(`🔄 切换机器人工作模式到: ${mode}`);
      
      // 如果当前有机器人实例，先停止
      if (currentBot) {
        try {
          if (this.config.polling) {
            await currentBot.stopPolling();
            console.log('✅ 已停止轮询模式');
          }
          if (this.config.webhook && webhookConfig?.url) {
            await currentBot.deleteWebHook();
            console.log('✅ 已删除Webhook');
          }
        } catch (error) {
          console.warn('⚠️ 停止当前模式时出现警告:', error);
        }
      }
      
      // 更新配置
      this.config.polling = mode === 'polling';
      this.config.webhook = mode === 'webhook';
      
      // 重新创建机器人实例
      let bot: TelegramBot;
      if (mode === 'webhook') {
        bot = new TelegramBot(this.config.token, {
          polling: false,
          webHook: false
        });
        
        // 如果提供了webhook配置，设置webhook
        if (webhookConfig?.url) {
          const options: any = {
            max_connections: webhookConfig.maxConnections || 40,
            allowed_updates: ['message', 'callback_query'],
            drop_pending_updates: true
          };
          
          if (webhookConfig.secret) {
            options.secret_token = webhookConfig.secret;
          }
          
          await bot.setWebHook(webhookConfig.url, options);
          console.log('✅ Webhook已设置:', webhookConfig.url);
        }
      } else {
        // Polling模式
        bot = new TelegramBot(this.config.token, {
          polling: true
        });
        console.log('✅ 轮询模式已启动');
      }
      
      // 重新初始化处理器
      const commandHandler = new CommandHandler({ bot, botId });
      const callbackHandler = new CallbackHandler(bot);
      const keyboardBuilder = new KeyboardBuilder(bot, botId || 'unknown');
      const botUtils = new BotUtils(bot);
      
      console.log(`✅ 机器人已成功切换到 ${mode} 模式`);
      
      return {
        success: true,
        bot,
        handlers: {
          commandHandler,
          callbackHandler,
          keyboardBuilder,
          botUtils
        }
      };
      
    } catch (error) {
      console.error(`❌ 切换到 ${mode} 模式失败:`, error);
      return { success: false };
    }
  }

  /**
   * 获取当前工作模式
   */
  getCurrentWorkMode(): 'polling' | 'webhook' | 'unknown' {
    if (this.config.polling) return 'polling';
    if (this.config.webhook) return 'webhook';
    return 'unknown';
  }

  /**
   * 检查机器人是否支持某种工作模式
   */
  async canSwitchToMode(
    bot: TelegramBot,
    mode: 'polling' | 'webhook'
  ): Promise<{ canSwitch: boolean; reason?: string }> {
    try {
      if (!bot) {
        return { canSwitch: false, reason: '机器人实例未初始化' };
      }
      
      if (mode === 'webhook') {
        // 检查是否有有效的Token
        if (!this.config.token || this.config.token === 'temp-token') {
          return { canSwitch: false, reason: '无效的Bot Token' };
        }
        
        // 测试Token是否有效
        try {
          await bot.getMe();
        } catch (error) {
          return { canSwitch: false, reason: 'Bot Token无效或已过期' };
        }
      }
      
      return { canSwitch: true };
      
    } catch (error) {
      return { canSwitch: false, reason: `检查失败: ${error.message}` };
    }
  }

  /**
   * 获取Webhook信息（增强版，支持模式检查）
   */
  async getWebhookInfoEnhanced(bot: TelegramBot): Promise<any> {
    if (!bot) {
      throw new Error('机器人实例未初始化');
    }
    
    if (this.getCurrentWorkMode() !== 'webhook') {
      throw new Error('当前不是Webhook模式');
    }
    
    return await bot.getWebHookInfo();
  }

  /**
   * 设置Webhook URL
   */
  async setWebhookUrl(
    bot: TelegramBot,
    url: string,
    options?: {
      secret?: string;
      maxConnections?: number;
      allowedUpdates?: string[];
    }
  ): Promise<boolean> {
    if (!bot) {
      throw new Error('机器人实例未初始化');
    }
    
    const webhookOptions: any = {
      max_connections: options?.maxConnections || 40,
      allowed_updates: options?.allowedUpdates || ['message', 'callback_query'],
      drop_pending_updates: true
    };
    
    if (options?.secret) {
      webhookOptions.secret_token = options.secret;
    }
    
    return await bot.setWebHook(url, webhookOptions);
  }

  /**
   * 更新配置
   */
  updateConfig(config: BotConfig): void {
    this.config = config;
  }

  /**
   * 启动工作模式管理器
   */
  async start(): Promise<void> {
    // 工作模式管理器启动逻辑（如果需要）
    console.log(`工作模式管理器已启动: ${this.config.workMode || (this.config.polling ? 'polling' : 'webhook')}`);
  }

  /**
   * 停止工作模式管理器
   */
  async stop(): Promise<void> {
    // 工作模式管理器停止逻辑（如果需要）
    console.log('工作模式管理器已停止');
  }

  /**
   * 重启工作模式管理器
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * 检查是否已启动
   */
  isStarted(): boolean {
    // 简单实现，总是返回 true
    return true;
  }
}
