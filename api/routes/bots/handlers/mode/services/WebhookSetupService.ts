/**
 * Webhook设置服务
 * 处理Telegram Bot Webhook的设置、获取状态和管理
 */
import { query } from '../../../../../config/database.js';

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
  configured_url?: string;
  configured_secret?: string;
  is_url_synced?: boolean;
}

export interface WebhookSetupResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Webhook设置服务类
 */
export class WebhookSetupService {
  /**
   * 获取机器人Webhook状态
   * @param botId 机器人ID
   */
  static async getWebhookStatus(botId: string): Promise<WebhookSetupResult> {
    try {
      // 获取机器人信息
      const botResult = await query(
        'SELECT id, bot_token, work_mode, webhook_url, webhook_secret FROM telegram_bots WHERE id = $1',
        [botId]
      );
      
      if (botResult.rows.length === 0) {
        return {
          success: false,
          message: '机器人不存在'
        };
      }
      
      const bot = botResult.rows[0];
      
      if (bot.work_mode !== 'webhook') {
        return {
          success: false,
          message: '该机器人不是Webhook模式'
        };
      }
      
      try {
        // 调用Telegram Bot API获取实际的webhook信息
        const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getWebhookInfo`);
        const data = await response.json();
        
        if (!data.ok) {
          return {
            success: false,
            message: '获取Webhook状态失败'
          };
        }
        
        // 合并配置的信息和实际状态
        const webhookInfo: WebhookInfo = {
          ...data.result,
          configured_url: bot.webhook_url || '',
          configured_secret: bot.webhook_secret ? '已配置' : '未配置',
          is_url_synced: data.result.url === (bot.webhook_url || '')
        };
        
        return {
          success: true,
          message: 'Webhook状态获取成功',
          data: {
            webhook_info: webhookInfo
          }
        };
        
      } catch (apiError) {
        console.error('Telegram API调用错误:', apiError);
        return {
          success: false,
          message: 'Telegram API调用失败'
        };
      }
      
    } catch (error) {
      console.error('获取Webhook状态错误:', error);
      return {
        success: false,
        message: '服务器内部错误'
      };
    }
  }

  /**
   * 设置Webhook
   * @param botToken 机器人Token
   * @param webhookUrl Webhook URL
   * @param webhookSecret Webhook密钥（可选）
   */
  static async setWebhook(
    botToken: string,
    webhookUrl: string,
    webhookSecret?: string
  ): Promise<WebhookSetupResult> {
    try {
      // 构建setWebhook请求参数
      const webhookParams = new URLSearchParams({
        url: webhookUrl
      });
      
      if (webhookSecret) {
        webhookParams.append('secret_token', webhookSecret);
      }
      
      // 调用Telegram Bot API设置webhook
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: webhookParams
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        return {
          success: false,
          message: `设置Webhook失败: ${data.description || '未知错误'}`
        };
      }
      
      return {
        success: true,
        message: 'Webhook设置成功'
      };
      
    } catch (apiError) {
      console.error('Telegram API调用错误:', apiError);
      return {
        success: false,
        message: 'Telegram API调用失败'
      };
    }
  }

  /**
   * 删除Webhook（切换到Polling模式）
   * @param botToken 机器人Token
   */
  static async deleteWebhook(botToken: string): Promise<WebhookSetupResult> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (!data.ok) {
        return {
          success: false,
          message: `删除Webhook失败: ${data.description || '未知错误'}`
        };
      }
      
      return {
        success: true,
        message: 'Webhook删除成功，已切换到Polling模式'
      };
      
    } catch (apiError) {
      console.error('删除Webhook时API调用错误:', apiError);
      return {
        success: false,
        message: 'Telegram API调用失败'
      };
    }
  }

  /**
   * 应用机器人的Webhook设置
   * @param botId 机器人ID
   */
  static async applyBotWebhookSettings(botId: string): Promise<WebhookSetupResult> {
    try {
      // 获取机器人信息
      const botResult = await query(
        'SELECT id, bot_token, work_mode, webhook_url, webhook_secret FROM telegram_bots WHERE id = $1',
        [botId]
      );
      
      if (botResult.rows.length === 0) {
        return {
          success: false,
          message: '机器人不存在'
        };
      }
      
      const bot = botResult.rows[0];
      
      if (bot.work_mode !== 'webhook') {
        return {
          success: false,
          message: '该机器人不是Webhook模式'
        };
      }
      
      if (!bot.webhook_url) {
        return {
          success: false,
          message: 'Webhook URL未配置'
        };
      }
      
      return await this.setWebhook(bot.bot_token, bot.webhook_url, bot.webhook_secret);
      
    } catch (error) {
      console.error('应用Webhook设置错误:', error);
      return {
        success: false,
        message: '服务器内部错误'
      };
    }
  }

  /**
   * 验证Webhook连接
   * @param webhookUrl Webhook URL
   * @param timeout 超时时间（毫秒）
   */
  static async validateWebhookConnection(
    webhookUrl: string,
    timeout: number = 5000
  ): Promise<WebhookSetupResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 发送一个测试消息
          update_id: 0,
          message: {
            message_id: 0,
            date: Math.floor(Date.now() / 1000),
            chat: { id: 0, type: 'private' },
            from: { id: 0, is_bot: false, first_name: 'Test' },
            text: '/test'
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Webhook应该返回200状态码
      if (response.ok) {
        return {
          success: true,
          message: 'Webhook连接验证成功'
        };
      } else {
        return {
          success: false,
          message: `Webhook响应异常，状态码：${response.status}`
        };
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Webhook连接超时'
        };
      }
      
      return {
        success: false,
        message: `Webhook连接失败：${error.message}`
      };
    }
  }

  /**
   * 同步工作模式到Telegram
   * @param botToken 机器人Token
   * @param workMode 工作模式
   * @param webhookUrl Webhook URL（仅Webhook模式需要）
   * @param webhookSecret Webhook密钥（可选）
   */
  static async syncWorkModeToTelegram(
    botToken: string,
    workMode: string,
    webhookUrl?: string,
    webhookSecret?: string
  ): Promise<WebhookSetupResult> {
    try {
      if (workMode === 'webhook' && webhookUrl) {
        // 设置Webhook
        return await this.setWebhook(botToken, webhookUrl, webhookSecret);
      } else if (workMode === 'polling') {
        // 删除Webhook
        return await this.deleteWebhook(botToken);
      } else {
        return {
          success: false,
          message: '工作模式配置不完整'
        };
      }
    } catch (error) {
      console.error('同步工作模式错误:', error);
      return {
        success: false,
        message: '同步工作模式失败'
      };
    }
  }
}
