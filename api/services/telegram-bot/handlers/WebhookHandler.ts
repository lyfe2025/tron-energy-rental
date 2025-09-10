/**
 * Webhook处理器
 * 负责处理Telegram Bot的Webhook模式相关功能
 */
import TelegramBot from 'node-telegram-bot-api';

export class WebhookHandler {
  private bot: TelegramBot;
  private config: {
    webhook: boolean;
    polling: boolean;
  };
  private logger: {
    logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, metadata?: any) => Promise<void>;
  };
  private messageProcessor: {
    processMessage: (message: TelegramBot.Message) => Promise<void>;
    processCallbackQuery: (callbackQuery: TelegramBot.CallbackQuery) => Promise<void>;
  };

  constructor(
    bot: TelegramBot,
    config: {
      webhook: boolean;
      polling: boolean;
    },
    logger: {
      logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, metadata?: any) => Promise<void>;
    },
    messageProcessor: {
      processMessage: (message: TelegramBot.Message) => Promise<void>;
      processCallbackQuery: (callbackQuery: TelegramBot.CallbackQuery) => Promise<void>;
    }
  ) {
    this.bot = bot;
    this.config = config;
    this.logger = logger;
    this.messageProcessor = messageProcessor;
  }

  /**
   * 设置Webhook
   */
  async setWebhook(url: string, options?: TelegramBot.SetWebHookOptions): Promise<boolean> {
    try {
      await this.logger.logBotActivity('info', 'webhook_setup_start', `开始设置Webhook: ${url}`, { url, options });
      
      const result = await this.bot.setWebHook(url, options);
      
      if (result) {
        await this.logger.logBotActivity('info', 'webhook_setup_success', `Webhook设置成功: ${url}`, { url });
      } else {
        await this.logger.logBotActivity('error', 'webhook_setup_failed', `Webhook设置失败: ${url}`, { url });
      }
      
      return result;
    } catch (error) {
      await this.logger.logBotActivity('error', 'webhook_setup_error', `Webhook设置错误: ${error.message}`, { 
        url, 
        error: error.stack 
      });
      return false;
    }
  }

  /**
   * 获取Webhook信息
   */
  async getWebhookInfo(): Promise<TelegramBot.WebhookInfo> {
    try {
      const info = await this.bot.getWebHookInfo();
      
      await this.logger.logBotActivity('debug', 'webhook_info_retrieved', `获取Webhook信息成功`, {
        url: info.url,
        pending_update_count: info.pending_update_count,
        max_connections: info.max_connections
      });
      
      return info;
    } catch (error) {
      await this.logger.logBotActivity('error', 'webhook_info_error', `获取Webhook信息失败: ${error.message}`, {
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 删除Webhook
   */
  async deleteWebhook(): Promise<boolean> {
    try {
      await this.logger.logBotActivity('info', 'webhook_delete_start', `开始删除Webhook`);
      
      const result = await this.bot.deleteWebHook();
      
      if (result) {
        await this.logger.logBotActivity('info', 'webhook_delete_success', `Webhook删除成功`);
      } else {
        await this.logger.logBotActivity('error', 'webhook_delete_failed', `Webhook删除失败`);
      }
      
      return result;
    } catch (error) {
      await this.logger.logBotActivity('error', 'webhook_delete_error', `Webhook删除错误: ${error.message}`, {
        error: error.stack
      });
      return false;
    }
  }

  /**
   * 获取Webhook信息（增强版，支持模式检查）
   */
  async getWebhookInfoEnhanced(): Promise<{
    webhookInfo: TelegramBot.WebhookInfo;
    currentMode: 'webhook' | 'polling' | 'unknown';
    isWebhookActive: boolean;
    recommendations: string[];
  }> {
    try {
      const webhookInfo = await this.getWebhookInfo();
      const isWebhookActive = !!webhookInfo.url;
      
      let currentMode: 'webhook' | 'polling' | 'unknown' = 'unknown';
      const recommendations: string[] = [];

      if (isWebhookActive) {
        currentMode = 'webhook';
        if (this.config.polling) {
          recommendations.push('检测到Webhook模式，建议关闭polling以避免冲突');
        }
      } else {
        if (this.config.polling) {
          currentMode = 'polling';
        } else {
          recommendations.push('Webhook未设置且polling未启用，机器人可能无法接收消息');
        }
      }

      // 检查pending updates
      if (webhookInfo.pending_update_count && webhookInfo.pending_update_count > 100) {
        recommendations.push(`有${webhookInfo.pending_update_count}个待处理更新，建议检查Webhook端点是否正常工作`);
      }

      // 检查最大连接数
      if (webhookInfo.max_connections && webhookInfo.max_connections < 10) {
        recommendations.push('最大连接数较低，可能影响高并发场景的性能');
      }

      await this.logger.logBotActivity('debug', 'webhook_info_enhanced', `增强Webhook信息获取完成`, {
        currentMode,
        isWebhookActive,
        pending_updates: webhookInfo.pending_update_count,
        recommendations: recommendations.length
      });

      return {
        webhookInfo,
        currentMode,
        isWebhookActive,
        recommendations
      };
    } catch (error) {
      await this.logger.logBotActivity('error', 'webhook_info_enhanced_error', `增强Webhook信息获取失败: ${error.message}`, {
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 设置Webhook（仅webhook模式）
   */
  async setWebhookUrl(url: string, options?: {
    secret?: string;
    maxConnections?: number;
    allowedUpdates?: string[];
  }): Promise<boolean> {
    try {
      const webhookOptions: TelegramBot.SetWebHookOptions = {
        max_connections: options?.maxConnections || 40,
        allowed_updates: options?.allowedUpdates || ['message', 'callback_query']
      };

      if (options?.secret) {
        webhookOptions.secret_token = options.secret;
      }

      await this.logger.logBotActivity('info', 'webhook_url_setup_start', `设置Webhook URL: ${url}`, {
        url,
        maxConnections: webhookOptions.max_connections,
        allowedUpdates: webhookOptions.allowed_updates,
        hasSecret: !!options?.secret
      });

      const result = await this.setWebhook(url, webhookOptions);

      if (result) {
        // 验证设置结果
        const info = await this.getWebhookInfo();
        if (info.url === url) {
          await this.logger.logBotActivity('info', 'webhook_url_setup_success', `Webhook URL设置并验证成功: ${url}`, {
            url,
            pending_updates: info.pending_update_count
          });
          return true;
        } else {
          await this.logger.logBotActivity('error', 'webhook_url_setup_mismatch', `Webhook URL设置后验证不匹配`, {
            expected: url,
            actual: info.url
          });
          return false;
        }
      }

      return false;
    } catch (error) {
      await this.logger.logBotActivity('error', 'webhook_url_setup_error', `设置Webhook URL失败: ${error.message}`, {
        url,
        error: error.stack
      });
      return false;
    }
  }

  /**
   * 处理webhook接收的更新消息
   */
  async processWebhookUpdate(update: any): Promise<void> {
    try {
      await this.logger.logBotActivity('debug', 'webhook_update_received', `收到Webhook更新`, {
        updateId: update.update_id,
        hasMessage: !!update.message,
        hasCallbackQuery: !!update.callback_query,
        hasInlineQuery: !!update.inline_query
      });

      // 处理消息
      if (update.message) {
        await this.messageProcessor.processMessage(update.message);
      }

      // 处理回调查询
      if (update.callback_query) {
        await this.messageProcessor.processCallbackQuery(update.callback_query);
      }

      // 处理内联查询
      if (update.inline_query) {
        await this.handleInlineQuery(update.inline_query);
      }

      // 处理其他类型的更新
      if (update.edited_message) {
        await this.handleEditedMessage(update.edited_message);
      }

      if (update.channel_post) {
        await this.handleChannelPost(update.channel_post);
      }

      if (update.edited_channel_post) {
        await this.handleEditedChannelPost(update.edited_channel_post);
      }

    } catch (error) {
      await this.logger.logBotActivity('error', 'webhook_update_error', `处理Webhook更新失败: ${error.message}`, {
        updateId: update.update_id,
        error: error.stack
      });
    }
  }

  /**
   * 处理内联查询
   */
  private async handleInlineQuery(inlineQuery: any): Promise<void> {
    await this.logger.logBotActivity('debug', 'inline_query_webhook', `Webhook收到内联查询: ${inlineQuery.query}`, {
      queryId: inlineQuery.id,
      userId: inlineQuery.from.id,
      query: inlineQuery.query
    });
    
    // 暂时返回空结果
    await this.bot.answerInlineQuery(inlineQuery.id, []);
  }

  /**
   * 处理编辑的消息
   */
  private async handleEditedMessage(message: any): Promise<void> {
    await this.logger.logBotActivity('debug', 'edited_message_webhook', `Webhook收到编辑的消息`, {
      messageId: message.message_id,
      chatId: message.chat.id,
      userId: message.from?.id
    });
  }

  /**
   * 处理频道帖子
   */
  private async handleChannelPost(message: any): Promise<void> {
    await this.logger.logBotActivity('debug', 'channel_post_webhook', `Webhook收到频道帖子`, {
      messageId: message.message_id,
      chatId: message.chat.id,
      chatTitle: message.chat.title
    });
  }

  /**
   * 处理编辑的频道帖子
   */
  private async handleEditedChannelPost(message: any): Promise<void> {
    await this.logger.logBotActivity('debug', 'edited_channel_post_webhook', `Webhook收到编辑的频道帖子`, {
      messageId: message.message_id,
      chatId: message.chat.id,
      chatTitle: message.chat.title
    });
  }

  /**
   * 更新机器人实例
   */
  updateBot(bot: TelegramBot): void {
    this.bot = bot;
  }
}
