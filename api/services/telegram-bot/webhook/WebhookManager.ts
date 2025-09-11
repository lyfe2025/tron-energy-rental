/**
 * Webhook 管理器
 * 负责 Webhook 的设置、获取、删除和处理
 */
import TelegramBot from 'node-telegram-bot-api';
import { DatabaseAdapter } from '../integrated/adapters/DatabaseAdapter.js';
import { BotOrchestrator } from '../integrated/components/BotOrchestrator.js';

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface WebhookSetupOptions {
  url: string;
  certificate?: string | Buffer;
  max_connections?: number;
  allowed_updates?: string[];
  ip_address?: string;
  drop_pending_updates?: boolean;
  secret_token?: string;
}

export interface WebhookResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class WebhookManager {
  private bot: TelegramBot;
  private databaseAdapter: DatabaseAdapter;
  private botId: string | null = null;

  constructor(bot: TelegramBot, botId?: string) {
    this.bot = bot;
    this.databaseAdapter = DatabaseAdapter.getInstance();
    this.botId = botId || null;
  }

  /**
   * 设置机器人 ID
   */
  setBotId(botId: string): void {
    this.botId = botId;
  }

  /**
   * 设置 Webhook
   */
  async setWebhook(options: WebhookSetupOptions): Promise<WebhookResult> {
    try {
      const webhookOptions: any = {
        url: options.url
      };

      // 添加可选参数
      if (options.certificate) {
        webhookOptions.certificate = options.certificate;
      }
      if (options.max_connections) {
        webhookOptions.max_connections = options.max_connections;
      }
      if (options.allowed_updates) {
        webhookOptions.allowed_updates = options.allowed_updates;
      }
      if (options.ip_address) {
        webhookOptions.ip_address = options.ip_address;
      }
      if (options.drop_pending_updates) {
        webhookOptions.drop_pending_updates = options.drop_pending_updates;
      }
      if (options.secret_token) {
        webhookOptions.secret_token = options.secret_token;
      }

      const result = await this.bot.setWebHook(options.url, webhookOptions);
      
      // 记录活动
      await this.updateActivity();
      
      // 记录 Webhook 设置
      await this.logWebhookActivity('set_webhook', `设置 Webhook: ${options.url}`, {
        url: options.url,
        max_connections: options.max_connections,
        allowed_updates: options.allowed_updates
      });

      return {
        success: result,
        data: { url: options.url }
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置 Webhook 失败'
      };
    }
  }

  /**
   * 获取 Webhook 信息
   */
  async getWebhookInfo(): Promise<WebhookResult> {
    try {
      const info = await this.bot.getWebHookInfo();
      
      return {
        success: true,
        data: info as WebhookInfo
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取 Webhook 信息失败'
      };
    }
  }

  /**
   * 删除 Webhook
   */
  async deleteWebhook(dropPendingUpdates: boolean = false): Promise<WebhookResult> {
    try {
      const result = await this.bot.deleteWebHook();
      
      // 记录活动
      await this.updateActivity();
      
      // 记录 Webhook 删除
      await this.logWebhookActivity('delete_webhook', 'Webhook 已删除', {
        drop_pending_updates: dropPendingUpdates
      });

      return {
        success: result
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除 Webhook 失败'
      };
    }
  }

  /**
   * 检查 Webhook 状态
   */
  async checkWebhookStatus(): Promise<{
    isActive: boolean;
    info?: WebhookInfo;
    issues?: string[];
  }> {
    try {
      const webhookResult = await this.getWebhookInfo();
      
      if (!webhookResult.success) {
        return {
          isActive: false,
          issues: ['无法获取 Webhook 信息']
        };
      }

      const info = webhookResult.data as WebhookInfo;
      const issues: string[] = [];

      // 检查是否设置了 Webhook
      if (!info.url) {
        return {
          isActive: false,
          info,
          issues: ['未设置 Webhook URL']
        };
      }

      // 检查错误
      if (info.last_error_message) {
        issues.push(`最后错误: ${info.last_error_message}`);
      }

      // 检查待处理更新数量
      if (info.pending_update_count > 100) {
        issues.push(`待处理更新过多: ${info.pending_update_count}`);
      }

      return {
        isActive: true,
        info,
        issues: issues.length > 0 ? issues : undefined
      };
    } catch (error) {
      return {
        isActive: false,
        issues: [error instanceof Error ? error.message : '检查失败']
      };
    }
  }

  /**
   * 处理 Webhook 更新
   */
  async processWebhookUpdate(update: any, orchestrator: BotOrchestrator): Promise<WebhookResult> {
    try {
      // 根据更新类型分发到相应的处理器
      if (update.message) {
        await orchestrator.handleMessage(update.message);
      } else if (update.callback_query) {
        await orchestrator.handleCallbackQuery(update.callback_query);
      } else if (update.edited_message) {
        // 将编辑的消息当作普通消息处理
        await orchestrator.handleMessage(update.edited_message);
      } else if (update.channel_post) {
        // 将频道消息当作普通消息处理
        await orchestrator.handleMessage(update.channel_post);
      } else if (update.edited_channel_post) {
        // 将编辑的频道消息当作普通消息处理
        await orchestrator.handleMessage(update.edited_channel_post);
      }
      // 注意：inline_query 和 chosen_inline_result 暂时不处理，因为 BotOrchestrator 中没有对应的方法

      // 记录活动
      await this.updateActivity();

      return { success: true };
    } catch (error) {
      await this.recordError();
      
      // 记录处理错误
      await this.logWebhookActivity('process_error', '处理 Webhook 更新失败', {
        error: error instanceof Error ? error.message : '未知错误',
        update_type: this.getUpdateType(update)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '处理 Webhook 更新失败'
      };
    }
  }

  /**
   * 重新设置 Webhook（用于故障恢复）
   */
  async resetWebhook(url: string, options?: Partial<WebhookSetupOptions>): Promise<WebhookResult> {
    try {
      console.log('🔄 重新设置 Webhook...');

      // 先删除现有的 Webhook
      await this.deleteWebhook(true);
      
      // 等待一秒
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 设置新的 Webhook
      const result = await this.setWebhook({
        url,
        drop_pending_updates: true,
        ...options
      });

      if (result.success) {
        console.log('✅ Webhook 重新设置成功');
        await this.logWebhookActivity('reset_webhook', 'Webhook 重新设置成功', { url });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重新设置 Webhook 失败';
      console.error('❌ 重新设置 Webhook 失败:', error);
      
      await this.logWebhookActivity('reset_webhook_error', errorMessage, { url });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 获取 Webhook 统计信息
   */
  async getWebhookStats(): Promise<any> {
    try {
      const statusResult = await this.checkWebhookStatus();
      
      return {
        isActive: statusResult.isActive,
        url: statusResult.info?.url,
        pendingUpdates: statusResult.info?.pending_update_count || 0,
        maxConnections: statusResult.info?.max_connections,
        lastError: statusResult.info?.last_error_message,
        lastErrorDate: statusResult.info?.last_error_date,
        issues: statusResult.issues,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        isActive: false,
        error: error instanceof Error ? error.message : '获取统计信息失败',
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * 获取更新类型
   */
  private getUpdateType(update: any): string {
    if (update.message) return 'message';
    if (update.callback_query) return 'callback_query';
    if (update.inline_query) return 'inline_query';
    if (update.chosen_inline_result) return 'chosen_inline_result';
    if (update.edited_message) return 'edited_message';
    if (update.channel_post) return 'channel_post';
    if (update.edited_channel_post) return 'edited_channel_post';
    return 'unknown';
  }

  /**
   * 记录 Webhook 活动
   */
  private async logWebhookActivity(action: string, message: string, metadata?: any): Promise<void> {
    if (this.botId) {
      try {
        await this.databaseAdapter.logBotActivity(this.botId, action, message, metadata);
      } catch (error) {
        console.error('记录 Webhook 活动失败:', error);
      }
    }
  }

  /**
   * 更新活动记录
   */
  private async updateActivity(): Promise<void> {
    if (this.botId) {
      try {
        await this.databaseAdapter.updateLastActivity(this.botId);
      } catch (error) {
        console.error('更新活动记录失败:', error);
      }
    }
  }

  /**
   * 记录错误
   */
  private async recordError(): Promise<void> {
    if (this.botId) {
      try {
        await this.databaseAdapter.incrementErrorCount(this.botId);
      } catch (error) {
        console.error('记录错误失败:', error);
      }
    }
  }
}
