/**
 * 基础回调处理器
 * 为所有回调处理器提供通用功能，特别是webhook URL获取
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../config/database.js';
import type { CallbackHandler } from '../core/CallbackDispatcher.js';
import { WebhookURLService } from '../utils/WebhookURLService.js';

export abstract class BaseCallbackHandler implements CallbackHandler {
  protected bot: TelegramBot;
  protected botId: string;

  // 索引签名以支持动态方法调用
  [methodName: string]: any;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
  }

  /**
   * 获取当前机器人的webhook基础URL
   * 使用共享的WebhookURLService
   */
  protected async getWebhookBaseUrl(): Promise<string> {
    return WebhookURLService.getWebhookBaseUrl(this.botId);
  }

  /**
   * 构建完整的资源URL
   * @param resourcePath 资源路径，如 /uploads/image.jpg
   * @returns 完整的URL
   */
  protected async buildResourceUrl(resourcePath: string): Promise<string> {
    return WebhookURLService.buildResourceUrl(this.botId, resourcePath);
  }

  /**
   * 发送错误消息的通用方法
   */
  protected async sendErrorMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, `❌ ${message}`);
    } catch (error) {
      console.error('发送错误消息失败:', error);
    }
  }

  /**
   * 发送成功消息的通用方法
   */
  protected async sendSuccessMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, `✅ ${message}`);
    } catch (error) {
      console.error('发送成功消息失败:', error);
    }
  }

  /**
   * 获取机器人配置信息
   */
  protected async getBotConfig(): Promise<any | null> {
    try {
      const result = await query(
        'SELECT * FROM telegram_bots WHERE id = $1 AND is_active = true',
        [this.botId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error(`获取机器人 ${this.botId} 配置失败:`, error);
      return null;
    }
  }

  /**
   * 记录处理器活动日志
   */
  protected logActivity(level: 'info' | 'warn' | 'error', action: string, message: string, metadata?: any): void {
    const logMessage = `[${this.constructor.name}] ${message}`;
    const logMetadata = {
      botId: this.botId,
      handler: this.constructor.name,
      ...metadata
    };

    switch (level) {
      case 'info':
        console.log(`ℹ️ ${logMessage}`, logMetadata);
        break;
      case 'warn':
        console.warn(`⚠️ ${logMessage}`, logMetadata);
        break;
      case 'error':
        console.error(`❌ ${logMessage}`, logMetadata);
        break;
    }
  }
}
