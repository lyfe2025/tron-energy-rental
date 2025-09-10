/**
 * Webhook URL 服务
 * 为所有 Telegram 机器人组件提供统一的 webhook URL 获取和资源 URL 构建功能
 * 消除代码重复，提供一致的实现
 */
import { query } from '../../../config/database.js';

export class WebhookURLService {
  /**
   * 根据机器人ID获取webhook基础URL
   * @param botId 机器人ID
   * @returns Promise<string> webhook基础URL
   */
  static async getWebhookBaseUrl(botId: string): Promise<string> {
    try {
      // 从数据库获取当前机器人的webhook URL
      const result = await query(
        'SELECT webhook_url FROM telegram_bots WHERE id = $1 AND is_active = true',
        [botId]
      );

      if (result.rows.length === 0 || !result.rows[0].webhook_url) {
        // 如果没有webhook URL，回退到环境变量或默认值
        console.warn(`机器人 ${botId} 没有配置webhook URL，使用默认域名`);
        return process.env.APP_BASE_URL || 'http://localhost:3001';
      }

      const webhookUrl = result.rows[0].webhook_url;
      
      // 从webhook URL中提取域名和协议
      // 例如：https://ed1cfac836d2.ngrok-free.app/api/telegram/webhook/bot-id
      // 提取：https://ed1cfac836d2.ngrok-free.app
      try {
        const url = new URL(webhookUrl);
        const baseUrl = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
        
        console.log(`📡 机器人 ${botId} webhook基础URL: ${baseUrl}`);
        return baseUrl;
      } catch (urlError) {
        console.error(`解析webhook URL失败 (${webhookUrl}):`, urlError);
        // 回退到环境变量或默认值
        return process.env.APP_BASE_URL || 'http://localhost:3001';
      }
    } catch (error) {
      console.error(`获取机器人 ${botId} webhook基础URL失败:`, error);
      // 回退到环境变量或默认值
      return process.env.APP_BASE_URL || 'http://localhost:3001';
    }
  }

  /**
   * 构建完整的资源URL
   * @param botId 机器人ID
   * @param resourcePath 资源路径，如 /uploads/image.jpg 或 /assets/defaults/image.jpg
   * @returns Promise<string> 完整的URL
   */
  static async buildResourceUrl(botId: string, resourcePath: string): Promise<string> {
    if (!resourcePath) {
      return '';
    }

    // 如果已经是完整URL，直接返回
    if (resourcePath.startsWith('http://') || resourcePath.startsWith('https://')) {
      return resourcePath;
    }

    // 如果是相对路径（以/开头），构建完整URL
    if (resourcePath.startsWith('/')) {
      const baseUrl = await WebhookURLService.getWebhookBaseUrl(botId);
      return `${baseUrl}${resourcePath}`;
    }

    // 其他情况，添加前缀斜杠后构建URL
    const baseUrl = await WebhookURLService.getWebhookBaseUrl(botId);
    return `${baseUrl}/${resourcePath}`;
  }

  /**
   * 检查资源路径是否需要构建完整URL
   * @param resourcePath 资源路径
   * @returns boolean 是否需要构建完整URL
   */
  static needsFullUrl(resourcePath: string): boolean {
    if (!resourcePath) {
      return false;
    }

    // 已经是完整URL，不需要构建
    if (resourcePath.startsWith('http://') || resourcePath.startsWith('https://')) {
      return false;
    }

    // 相对路径（特别是/uploads/和/assets/），需要构建
    if (resourcePath.startsWith('/uploads/') || resourcePath.startsWith('/assets/')) {
      return true;
    }

    // 其他以/开头的路径，也需要构建
    return resourcePath.startsWith('/');
  }

  /**
   * 批量构建多个资源URL
   * @param botId 机器人ID
   * @param resourcePaths 资源路径数组
   * @returns Promise<string[]> 完整URL数组
   */
  static async buildMultipleResourceUrls(botId: string, resourcePaths: string[]): Promise<string[]> {
    if (!resourcePaths || resourcePaths.length === 0) {
      return [];
    }

    // 为了性能，只获取一次baseUrl，然后批量处理
    const baseUrl = await WebhookURLService.getWebhookBaseUrl(botId);
    
    return resourcePaths.map(resourcePath => {
      if (!resourcePath) {
        return '';
      }

      // 如果已经是完整URL，直接返回
      if (resourcePath.startsWith('http://') || resourcePath.startsWith('https://')) {
        return resourcePath;
      }

      // 如果是相对路径（以/开头），构建完整URL
      if (resourcePath.startsWith('/')) {
        return `${baseUrl}${resourcePath}`;
      }

      // 其他情况，添加前缀斜杠后构建URL
      return `${baseUrl}/${resourcePath}`;
    });
  }

  /**
   * 验证webhook URL的格式
   * @param webhookUrl webhook URL
   * @returns boolean 是否为有效的webhook URL
   */
  static isValidWebhookUrl(webhookUrl: string): boolean {
    if (!webhookUrl) {
      return false;
    }

    try {
      const url = new URL(webhookUrl);
      // 必须是https协议（生产环境）或localhost的http（开发环境）
      if (url.protocol === 'https:') {
        return true;
      }
      if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 从webhook URL中提取域名信息
   * @param webhookUrl webhook URL
   * @returns object 包含协议、主机名、端口等信息
   */
  static parseWebhookUrl(webhookUrl: string): {
    protocol: string;
    hostname: string;
    port: string;
    baseUrl: string;
  } | null {
    if (!webhookUrl) {
      return null;
    }

    try {
      const url = new URL(webhookUrl);
      return {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        baseUrl: `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`
      };
    } catch {
      return null;
    }
  }
}
