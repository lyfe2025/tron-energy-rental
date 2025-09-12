/**
 * Webhook管理服务
 * 提供Webhook特有的管理功能
 */
import { ModeValidationService } from '../../services/ModeValidationService.js';
import { WebhookSetupService } from '../../services/WebhookSetupService.js';
import { WebhookValidator } from '../../validators/WebhookValidator.js';

export class WebhookManagementService {
  /**
   * 获取机器人Webhook状态
   */
  static async getBotWebhookStatus(botId: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    try {
      const result = await WebhookSetupService.getWebhookStatus(botId);
      return {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error: any) {
      return {
        success: false,
        message: `获取Webhook状态失败: ${error.message}`
      };
    }
  }

  /**
   * 应用Webhook设置（智能URL处理）
   */
  static async applyWebhookSettings(botId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // 首先尝试使用改进的方法（从数据库读取配置并智能处理URL）
      const result = await WebhookSetupService.applyBotWebhookSettingsImproved(botId);
      return {
        success: result.success,
        message: result.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: `应用Webhook设置失败: ${error.message}`
      };
    }
  }

  /**
   * 验证Webhook连接
   */
  static async validateWebhookConnection(
    botId: string,
    webhookUrl?: string,
    timeout: number = 5000
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // 如果没有提供URL，从数据库获取
      let targetUrl = webhookUrl;
      if (!targetUrl) {
        const botValidation = await ModeValidationService.validateBotExists(botId);
        if (!botValidation.isValid) {
          return {
            success: false,
            message: botValidation.message
          };
        }
        
        if (botValidation.bot.work_mode !== 'webhook') {
          return {
            success: false,
            message: '该机器人不是Webhook模式'
          };
        }
        
        targetUrl = botValidation.bot.webhook_url;
      }
      
      if (!targetUrl) {
        return {
          success: false,
          message: 'Webhook URL未配置'
        };
      }
      
      // 验证URL格式
      const urlValidation = WebhookValidator.validateWebhookUrl(targetUrl);
      if (!urlValidation.isValid) {
        return {
          success: false,
          message: urlValidation.message
        };
      }
      
      // 验证连接
      const connectionResult = await WebhookSetupService.validateWebhookConnection(
        targetUrl,
        timeout
      );
      
      return {
        success: connectionResult.success,
        message: connectionResult.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: `验证Webhook连接失败: ${error.message}`
      };
    }
  }

  /**
   * 设置自定义Webhook
   */
  static async setCustomWebhook(
    botId: string,
    webhookUrl: string,
    webhookSecret?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // 验证机器人存在和Token有效性
      const botValidation = await ModeValidationService.validateBotToken(botId);
      if (!botValidation.isValid) {
        return {
          success: false,
          message: botValidation.message
        };
      }
      
      // 验证Webhook配置
      const webhookValidation = WebhookValidator.validateWebhookConfig({
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret
      });
      
      if (!webhookValidation.isValid) {
        return {
          success: false,
          message: webhookValidation.message
        };
      }
      
      // 设置Webhook
      const setupResult = await WebhookSetupService.setWebhook(
        botValidation.bot.bot_token,
        webhookUrl,
        webhookSecret
      );
      
      return {
        success: setupResult.success,
        message: setupResult.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: `设置自定义Webhook失败: ${error.message}`
      };
    }
  }

  /**
   * 删除Webhook
   */
  static async deleteWebhook(botId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // 验证机器人存在和Token有效性
      const botValidation = await ModeValidationService.validateBotToken(botId);
      if (!botValidation.isValid) {
        return {
          success: false,
          message: botValidation.message
        };
      }
      
      // 删除Webhook
      const deleteResult = await WebhookSetupService.deleteWebhook(botValidation.bot.bot_token);
      
      return {
        success: deleteResult.success,
        message: deleteResult.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: `删除Webhook失败: ${error.message}`
      };
    }
  }

  /**
   * 获取Webhook配置建议
   */
  static getWebhookSuggestions(botId: string): {
    success: boolean;
    message: string;
    data: any;
  } {
    try {
      // 基于当前环境生成建议
      const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://your-domain.com';
      const suggestions = {
        webhook_url: `${baseUrl}/api/telegram/webhook/${botId}`,
        webhook_secret: this.generateWebhookSecret(),
        max_connections: 40,
        best_practices: [
          '使用HTTPS协议',
          '设置强密钥以增加安全性',
          '确保Webhook端点能够处理Telegram的请求格式',
          '实现适当的错误处理和日志记录',
          '考虑使用反向代理进行负载均衡'
        ],
        security_notes: [
          '定期更换Webhook密钥',
          '验证请求来源',
          '限制请求频率',
          '记录异常请求用于安全审计'
        ]
      };
      
      return {
        success: true,
        message: 'Webhook配置建议获取成功',
        data: suggestions
      };
    } catch (error: any) {
      return {
        success: false,
        message: `获取Webhook配置建议失败: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * 批量Webhook操作
   */
  static async batchWebhookOperation(
    botIds: string[],
    operation: 'set' | 'delete' | 'validate',
    webhookUrl?: string,
    webhookSecret?: string
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      results: Array<{
        bot_id: string;
        success: boolean;
        message: string;
      }>;
      summary: {
        total: number;
        success: number;
        failed: number;
      };
    };
  }> {
    try {
      if (!Array.isArray(botIds) || botIds.length === 0) {
        return {
          success: false,
          message: '需要提供机器人ID列表',
          data: { results: [], summary: { total: 0, success: 0, failed: 0 } }
        };
      }
      
      if (!['set', 'delete', 'validate'].includes(operation)) {
        return {
          success: false,
          message: '无效的操作类型',
          data: { results: [], summary: { total: 0, success: 0, failed: 0 } }
        };
      }
      
      const results: Array<{
        bot_id: string;
        success: boolean;
        message: string;
      }> = [];
      
      // 依次处理每个机器人
      for (const botId of botIds) {
        try {
          const botValidation = await ModeValidationService.validateBotToken(botId);
          if (!botValidation.isValid) {
            results.push({
              bot_id: botId,
              success: false,
              message: botValidation.message
            });
            continue;
          }
          
          let operationResult;
          switch (operation) {
            case 'set':
              if (!webhookUrl) {
                results.push({
                  bot_id: botId,
                  success: false,
                  message: 'Webhook URL是必需的'
                });
                continue;
              }
              operationResult = await WebhookSetupService.setWebhook(
                botValidation.bot.bot_token,
                webhookUrl,
                webhookSecret
              );
              break;
              
            case 'delete':
              operationResult = await WebhookSetupService.deleteWebhook(
                botValidation.bot.bot_token
              );
              break;
              
            case 'validate':
              if (!webhookUrl) {
                results.push({
                  bot_id: botId,
                  success: false,
                  message: 'Webhook URL是必需的'
                });
                continue;
              }
              operationResult = await WebhookSetupService.validateWebhookConnection(webhookUrl);
              break;
              
            default:
              operationResult = { success: false, message: '未知操作' };
          }
          
          results.push({
            bot_id: botId,
            success: operationResult.success,
            message: operationResult.message
          });
          
        } catch (error: any) {
          results.push({
            bot_id: botId,
            success: false,
            message: `处理失败: ${error.message}`
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      return {
        success: successCount > 0,
        message: `批量Webhook操作完成，成功 ${successCount}/${totalCount} 个机器人`,
        data: {
          results,
          summary: {
            total: totalCount,
            success: successCount,
            failed: totalCount - successCount
          }
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `批量Webhook操作失败: ${error.message}`,
        data: { results: [], summary: { total: 0, success: 0, failed: 0 } }
      };
    }
  }

  /**
   * 生成随机Webhook密钥
   */
  static generateWebhookSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
