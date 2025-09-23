/**
 * Telegram机器人工作模式管理模块
 * 负责处理工作模式切换和管理
 */
import TelegramBot from 'node-telegram-bot-api';
import { CallbackHandler } from '../callbacks/CallbackHandler.ts';
import { CommandHandler } from '../commands/CommandHandler.ts';
import { KeyboardBuilder } from '../keyboards/KeyboardBuilder.ts';
import { BotUtils } from '../utils/BotUtils.ts';

export class TelegramBotWorkMode {
  constructor(
    private config: { polling: boolean; webhook: boolean; token: string },
    private context: {
      getBot: () => TelegramBot;
      setBot: (bot: TelegramBot) => void;
      getBotId: () => string;
      createHandlers: (bot: TelegramBot, botId: string) => {
        commandHandler: CommandHandler;
        callbackHandler: CallbackHandler;
        keyboardBuilder: KeyboardBuilder;
        botUtils: BotUtils;
      };
      setHandlers: (handlers: {
        commandHandler: CommandHandler;
        callbackHandler: CallbackHandler;
        keyboardBuilder: KeyboardBuilder;
        botUtils: BotUtils;
      }) => void;
      setupHandlers: () => void;
      setupErrorHandling: () => void;
    }
  ) {}

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
  async canSwitchToMode(mode: 'polling' | 'webhook'): Promise<{ canSwitch: boolean; reason?: string }> {
    try {
      const bot = this.context.getBot();
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
   * 动态切换机器人工作模式
   */
  async switchWorkMode(mode: 'polling' | 'webhook', webhookConfig?: {
    url?: string;
    secret?: string;
    maxConnections?: number;
  }): Promise<boolean> {
    try {
      console.log(`🔄 切换机器人工作模式到: ${mode}`);
      
      const currentBot = this.context.getBot();
      
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
      let newBot: TelegramBot;
      if (mode === 'webhook') {
        newBot = new TelegramBot(this.config.token, {
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
          
          await newBot.setWebHook(webhookConfig.url, options);
          console.log('✅ Webhook已设置:', webhookConfig.url);
        }
      } else {
        // Polling模式
        newBot = new TelegramBot(this.config.token, {
          polling: true
        });
        console.log('✅ 轮询模式已启动');
      }
      
      // 更新bot实例
      this.context.setBot(newBot);
      
      // 重新初始化处理器
      const handlers = this.context.createHandlers(newBot, this.context.getBotId());
      this.context.setHandlers(handlers);
      
      // 重新设置处理器
      this.context.setupHandlers();
      this.context.setupErrorHandling();
      
      console.log(`✅ 机器人已成功切换到 ${mode} 模式`);
      return true;
      
    } catch (error) {
      console.error(`❌ 切换到 ${mode} 模式失败:`, error);
      return false;
    }
  }
}
