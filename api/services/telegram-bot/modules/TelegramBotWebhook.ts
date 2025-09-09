/**
 * Telegram机器人Webhook处理模块
 * 负责处理Webhook相关功能
 */
import TelegramBot from 'node-telegram-bot-api';

export class TelegramBotWebhook {
  constructor(
    private bot: TelegramBot,
    private config: { webhook: boolean; polling: boolean },
    private logger: {
      logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
    },
    private processor: {
      processMessage: (message: any) => Promise<void>;
      processCallbackQuery: (callbackQuery: any) => Promise<void>;
    }
  ) {}

  /**
   * 更新bot实例
   */
  updateBot(bot: TelegramBot): void {
    this.bot = bot;
  }

  /**
   * 设置Webhook
   */
  async setWebhook(url: string, options?: TelegramBot.SetWebHookOptions): Promise<boolean> {
    return await this.bot.setWebHook(url, options);
  }

  /**
   * 获取Webhook信息
   */
  async getWebhookInfo(): Promise<TelegramBot.WebhookInfo> {
    return await this.bot.getWebHookInfo();
  }

  /**
   * 删除Webhook
   */
  async deleteWebhook(): Promise<boolean> {
    return await this.bot.deleteWebHook();
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
   * 获取Webhook信息（增强版，支持模式检查）
   */
  async getWebhookInfoEnhanced(): Promise<any> {
    if (!this.bot) {
      throw new Error('机器人实例未初始化');
    }
    
    if (this.getCurrentWorkMode() !== 'webhook') {
      throw new Error('当前不是Webhook模式');
    }
    
    return await this.bot.getWebHookInfo();
  }

  /**
   * 设置Webhook（仅webhook模式）
   */
  async setWebhookUrl(url: string, options?: {
    secret?: string;
    maxConnections?: number;
    allowedUpdates?: string[];
  }): Promise<boolean> {
    if (!this.bot) {
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
    
    return await this.bot.setWebHook(url, webhookOptions);
  }

  /**
   * 处理webhook接收的更新消息
   * 这个方法将webhook消息路由到相应的处理器
   */
  async processWebhookUpdate(update: any): Promise<void> {
    try {
      console.log('🔄 TelegramBotWebhook处理webhook更新:', {
        updateId: update.update_id,
        hasMessage: !!update.message,
        hasCallback: !!update.callback_query
      });

      // 处理文本消息和命令
      if (update.message) {
        await this.processor.processMessage(update.message);
      }

      // 处理回调查询
      if (update.callback_query) {
        await this.processor.processCallbackQuery(update.callback_query);
      }

    } catch (error) {
      console.error('❌ 处理webhook更新失败:', error);
      await this.logger.logBotActivity('error', 'webhook_update_failed', `处理webhook更新失败: ${error.message}`, {
        error: error.stack,
        update
      });
      throw error;
    }
  }
}
