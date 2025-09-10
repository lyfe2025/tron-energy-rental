/**
 * 基础回调处理器
 * 为所有回调处理器提供通用功能，特别是webhook URL获取
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../config/database.js';
import type { CallbackHandler } from '../core/CallbackDispatcher.js';

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
   * 从数据库查询机器人的webhook_url，然后提取基础域名
   */
  protected async getWebhookBaseUrl(): Promise<string> {
    try {
      // 从数据库获取当前机器人的webhook URL
      const result = await query(
        'SELECT webhook_url FROM telegram_bots WHERE id = $1 AND is_active = true',
        [this.botId]
      );

      if (result.rows.length === 0 || !result.rows[0].webhook_url) {
        // 如果没有webhook URL，回退到环境变量或默认值
        console.warn(`机器人 ${this.botId} 没有配置webhook URL，使用默认域名`);
        return process.env.APP_BASE_URL || 'http://localhost:3001';
      }

      const webhookUrl = result.rows[0].webhook_url;
      
      // 从webhook URL中提取域名和协议
      // 例如：https://ed1cfac836d2.ngrok-free.app/api/telegram/webhook/bot-id
      // 提取：https://ed1cfac836d2.ngrok-free.app
      try {
        const url = new URL(webhookUrl);
        const baseUrl = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
        
        console.log(`📡 机器人 ${this.botId} webhook基础URL: ${baseUrl}`);
        return baseUrl;
      } catch (urlError) {
        console.error(`解析webhook URL失败 (${webhookUrl}):`, urlError);
        // 回退到环境变量或默认值
        return process.env.APP_BASE_URL || 'http://localhost:3001';
      }
    } catch (error) {
      console.error(`获取机器人 ${this.botId} webhook基础URL失败:`, error);
      // 回退到环境变量或默认值
      return process.env.APP_BASE_URL || 'http://localhost:3001';
    }
  }

  /**
   * 构建完整的资源URL
   * @param resourcePath 资源路径，如 /uploads/image.jpg
   * @returns 完整的URL
   */
  protected async buildResourceUrl(resourcePath: string): Promise<string> {
    if (!resourcePath) {
      return '';
    }

    // 如果已经是完整URL，直接返回
    if (resourcePath.startsWith('http://') || resourcePath.startsWith('https://')) {
      return resourcePath;
    }

    // 如果是相对路径，构建完整URL
    if (resourcePath.startsWith('/')) {
      const baseUrl = await this.getWebhookBaseUrl();
      return `${baseUrl}${resourcePath}`;
    }

    // 其他情况，添加前缀斜杠后构建URL
    const baseUrl = await this.getWebhookBaseUrl();
    return `${baseUrl}/${resourcePath}`;
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
