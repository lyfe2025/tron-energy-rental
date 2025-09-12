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
        'SELECT id, bot_token, bot_username, work_mode, webhook_url, webhook_secret FROM telegram_bots WHERE id = $1',
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
   * @param maxRetries 最大重试次数
   */
  static async setWebhook(
    botToken: string,
    webhookUrl: string,
    webhookSecret?: string,
    maxRetries: number = 3
  ): Promise<WebhookSetupResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Webhook] 第 ${attempt} 次尝试设置 Webhook: ${webhookUrl}`);
        
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
        
        if (data.ok) {
          console.log(`[Webhook] Webhook设置成功`);
          return {
            success: true,
            message: 'Webhook设置成功'
          };
        }
        
        // 检查是否是速率限制错误
        if (data.error_code === 429 || (data.description && data.description.includes('Too Many Requests'))) {
          const retryAfter = data.parameters?.retry_after || 60;
          console.log(`[Webhook] 触发速率限制，需要等待 ${retryAfter} 秒后重试 (尝试 ${attempt}/${maxRetries})`);
          
          if (attempt < maxRetries) {
            console.log(`[Webhook] 等待 ${retryAfter} 秒...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          } else {
            return {
              success: false,
              message: `设置Webhook失败: 触发速率限制，已重试 ${maxRetries} 次。请稍后手动重试或等待 ${retryAfter} 秒。`
            };
          }
        }
        
        // 其他错误直接返回
        return {
          success: false,
          message: `设置Webhook失败: ${data.description || '未知错误'}`
        };
        
      } catch (apiError: any) {
        console.error(`[Webhook] 第 ${attempt} 次尝试API调用错误:`, apiError);
        
        if (attempt < maxRetries) {
          console.log(`[Webhook] 等待 10 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        } else {
          return {
            success: false,
            message: `Telegram API调用失败: ${apiError.message || '网络错误'}`
          };
        }
      }
    }
    
    return {
      success: false,
      message: '设置Webhook失败: 已达到最大重试次数'
    };
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
   * 应用机器人的Webhook设置（改进版 - 智能URL处理）
   * @param botId 机器人ID
   */
  static async applyBotWebhookSettingsImproved(botId: string): Promise<WebhookSetupResult> {
    try {
      // 获取机器人信息
      const botResult = await query(
        'SELECT id, bot_token, bot_username, work_mode, webhook_url, webhook_secret FROM telegram_bots WHERE id = $1',
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
      
      if (!bot.bot_username) {
        return {
          success: false,
          message: '机器人用户名未配置'
        };
      }
      
      // 构建完整的Webhook URL（确保包含机器人用户名）
      const completeWebhookUrl = this.buildCompleteWebhookUrl(bot.webhook_url, bot.bot_username);
      
      console.log(`[Webhook] 应用机器人 @${bot.bot_username} 的设置，完整URL: ${completeWebhookUrl}`);
      
      return await this.setWebhook(bot.bot_token, completeWebhookUrl, bot.webhook_secret);
      
    } catch (error) {
      console.error('应用Webhook设置错误:', error);
      return {
        success: false,
        message: '服务器内部错误'
      };
    }
  }

  /**
   * 应用机器人的Webhook设置（原版本 - 保留兼容性）
   * @param botId 机器人ID
   */
  static async applyBotWebhookSettings(botId: string): Promise<WebhookSetupResult> {
    try {
      // 获取机器人信息
      const botResult = await query(
        'SELECT id, bot_token, bot_username, work_mode, webhook_url, webhook_secret FROM telegram_bots WHERE id = $1',
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
   * 构建完整的Webhook URL（包含机器人用户名）
   * @param baseUrl 基础URL
   * @param botUsername 机器人用户名
   */
  static buildCompleteWebhookUrl(baseUrl: string, botUsername: string): string {
    // 移除URL末尾的斜杠
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    
    // 检查URL是否已经包含机器人用户名
    if (cleanBaseUrl.endsWith(`/${botUsername}`)) {
      return cleanBaseUrl;
    }
    
    // 添加机器人用户名
    return `${cleanBaseUrl}/${botUsername}`;
  }

  /**
   * 设置机器人Webhook（智能URL处理）
   * @param botId 机器人ID
   * @param baseWebhookUrl 基础Webhook URL
   * @param webhookSecret Webhook密钥（可选）
   */
  static async setBotWebhookWithUrl(
    botId: string,
    baseWebhookUrl: string,
    webhookSecret?: string
  ): Promise<WebhookSetupResult> {
    try {
      // 获取机器人信息
      const botResult = await query(
        'SELECT id, bot_token, bot_username, work_mode FROM telegram_bots WHERE id = $1',
        [botId]
      );
      
      if (botResult.rows.length === 0) {
        return {
          success: false,
          message: '机器人不存在'
        };
      }
      
      const bot = botResult.rows[0];
      
      if (!bot.bot_username) {
        return {
          success: false,
          message: '机器人用户名未配置'
        };
      }
      
      // 构建完整的Webhook URL
      const completeWebhookUrl = this.buildCompleteWebhookUrl(baseWebhookUrl, bot.bot_username);
      
      console.log(`[Webhook] 为机器人 @${bot.bot_username} 设置完整URL: ${completeWebhookUrl}`);
      
      // 设置Webhook
      return await this.setWebhook(bot.bot_token, completeWebhookUrl, webhookSecret);
      
    } catch (error) {
      console.error('设置机器人Webhook错误:', error);
      return {
        success: false,
        message: '服务器内部错误'
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
