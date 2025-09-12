/**
 * Webhook控制器
 * 处理机器人Webhook相关的操作
 * 重构后只保留路由处理逻辑，具体实现委托给专用服务
 */
import { type Request, type Response } from 'express';
import type { RouteHandler } from '../../../types.js';
import { ModeValidationService } from '../services/ModeValidationService.js';
import { WebhookSetupService } from '../services/WebhookSetupService.js';
import { BasicSyncService } from './shared/BasicSyncService.js';
import { ConfigValidationService } from './shared/ConfigValidationService.js';
import { WebhookKeyboardHandler } from './webhook/WebhookKeyboardHandler.js';
import { WebhookManagementService } from './webhook/WebhookManagementService.js';

/**
 * Webhook控制器类
 */
export class WebhookController {
  /**
   * 获取机器人Webhook状态
   * GET /api/bots/:id/webhook-status
   * 权限：管理员
   */
  static getBotWebhookStatus: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await WebhookManagementService.getBotWebhookStatus(id);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        message: result.message,
        data: result.data
      });
      
    } catch (error) {
      console.error('获取Webhook状态错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 应用Webhook设置
   * POST /api/bots/:id/apply-webhook
   * 权限：管理员
   */
  static applyWebhookSettings: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await WebhookManagementService.applyWebhookSettings(id);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        message: result.message
      });
      
    } catch (error) {
      console.error('应用Webhook设置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 验证Webhook连接
   * POST /api/bots/:id/validate-webhook
   * 权限：管理员
   */
  static validateWebhookConnection: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { webhook_url, timeout } = req.body;
      
      const result = await WebhookManagementService.validateWebhookConnection(
        id,
        webhook_url,
        timeout || 5000
      );
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        message: result.message
      });
      
    } catch (error) {
      console.error('验证Webhook连接错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 设置自定义Webhook
   * POST /api/bots/:id/set-custom-webhook
   * 权限：管理员
   */
  static setCustomWebhook: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { webhook_url, webhook_secret } = req.body;
      
      const result = await WebhookManagementService.setCustomWebhook(
        id,
        webhook_url,
        webhook_secret
      );
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        message: result.message
      });
      
    } catch (error) {
      console.error('设置自定义Webhook错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 删除Webhook
   * DELETE /api/bots/:id/webhook
   * 权限：管理员
   */
  static deleteWebhook: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await WebhookManagementService.deleteWebhook(id);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        message: result.message
      });
      
    } catch (error) {
      console.error('删除Webhook错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 获取Webhook配置建议
   * GET /api/bots/:id/webhook-suggestions
   * 权限：管理员
   */
  static getWebhookSuggestions: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // 验证机器人存在
      const botValidation = await ModeValidationService.validateBotExists(id);
      if (!botValidation.isValid) {
        res.status(404).json({
          success: false,
          message: botValidation.message
        });
        return;
      }
      
      const result = WebhookManagementService.getWebhookSuggestions(id);
      
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        message: result.message,
        data: result.data
      });
      
    } catch (error) {
      console.error('获取Webhook配置建议错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 批量Webhook操作
   * POST /api/bots/batch-webhook-operation
   * 权限：管理员
   */
  static batchWebhookOperation: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { bot_ids, operation, webhook_url, webhook_secret } = req.body;
      
      const result = await WebhookManagementService.batchWebhookOperation(
        bot_ids,
        operation,
        webhook_url,
        webhook_secret
      );
      
      res.status(200).json({
        success: result.success,
        message: result.message,
        data: result.data
      });
      
    } catch (error) {
      console.error('批量Webhook操作错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 手动同步机器人设置到Telegram (Webhook模式专用)
   * POST /api/bots/:id/manual-sync (Webhook模式)
   * 权限：管理员
   */
  static manualSyncToTelegramWebhook: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { options, formData } = req.body;
      
      // 验证同步前置条件
      const validationResult = await ModeValidationService.validateSyncPrerequisites(
        id, options, formData
      );
      
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: validationResult.message
        });
        return;
      }
      
      const bot = validationResult.bot;
      
      // 确保是Webhook模式
      if (bot.work_mode !== 'webhook') {
        res.status(400).json({
          success: false,
          message: 'Webhook控制器只能处理Webhook模式的机器人'
        });
        return;
      }
      
      const results: Record<string, boolean | null> = {};
      const errors: string[] = [];
      const logs: string[] = [];
      
      logs.push(`🌐 [Webhook模式] 开始手动同步`);
      
      try {
        // 1. 同步机器人名称
        if (options.name && formData.name) {
          const nameResult = await BasicSyncService.syncBotName(bot.bot_token, formData.name, logs, 'Webhook');
          results.name = nameResult.success;
          if (!nameResult.success && nameResult.error) {
            errors.push(nameResult.error);
          }
        } else if (options.name) {
          results.name = null;
          logs.push(`⏭️ 跳过机器人名称同步（未提供名称）`);
        }

        // 2. 同步机器人描述
        if (options.description && formData.description) {
          const descResult = await BasicSyncService.syncBotDescription(bot.bot_token, formData.description, logs, 'Webhook');
          results.description = descResult.success;
          if (!descResult.success && descResult.error) {
            errors.push(descResult.error);
          }
        } else if (options.description) {
          results.description = null;
          logs.push(`⏭️ 跳过机器人描述同步（未提供描述）`);
        }

        // 3. 同步短描述
        if (options.shortDescription && formData.short_description) {
          const shortDescResult = await BasicSyncService.syncBotShortDescription(
            bot.bot_token, formData.short_description, logs, 'Webhook'
          );
          results.shortDescription = shortDescResult.success;
          if (!shortDescResult.success && shortDescResult.error) {
            errors.push(shortDescResult.error);
          }
        } else if (options.shortDescription) {
          results.shortDescription = null;
          logs.push(`⏭️ 跳过机器人短描述同步（未提供短描述）`);
        }

        // 4. 同步命令列表
        if (options.commands) {
          const commandsResult = await BasicSyncService.syncBotCommands(
            bot.bot_token, formData, logs, 'Webhook'
          );
          results.commands = commandsResult.success;
          if (!commandsResult.success && commandsResult.error) {
            errors.push(commandsResult.error);
          }
        }

        // 5. 同步工作模式 (Webhook专用)
        if (options.workMode) {
          const workModeResult = await WebhookController.syncWorkModeWebhook(
            bot.bot_token, formData, logs
          );
          results.workMode = workModeResult.success;
          if (!workModeResult.success && workModeResult.error) {
            errors.push(workModeResult.error);
          }
        }

        // 6. 同步Webhook URL (Webhook模式必需)
        if (options.webhookUrl && formData.webhook_url) {
          const webhookResult = await WebhookController.syncWebhookUrlWithBotId(
            id, formData.webhook_url, formData.webhook_secret, logs
          );
          results.webhookUrl = webhookResult.success;
          if (!webhookResult.success && webhookResult.error) {
            errors.push(webhookResult.error);
          }
        } else if (options.webhookUrl) {
          results.webhookUrl = false;
          errors.push('Webhook模式必须提供有效的Webhook URL');
          logs.push(`❌ Webhook模式但未提供URL`);
        }

        // 7. 同步菜单按钮
        if (options.menuButton && formData.menu_button_enabled) {
          const menuResult = await BasicSyncService.syncMenuButton(
            bot.bot_token, formData, logs, 'Webhook'
          );
          results.menuButton = menuResult.success;
          if (!menuResult.success && menuResult.error) {
            errors.push(menuResult.error);
          }
        } else if (options.menuButton) {
          results.menuButton = null;
          logs.push(`⏭️ 跳过菜单按钮同步（未启用或配置不完整）`);
        }

        // 8. 同步回复键盘 (Webhook模式特殊处理)
        if (options.replyKeyboard) {
          const replyKeyboardResult = await WebhookKeyboardHandler.syncReplyKeyboard(
            bot.bot_token, formData, logs
          );
          results.replyKeyboard = replyKeyboardResult.success;
          if (!replyKeyboardResult.success && replyKeyboardResult.error) {
            errors.push(replyKeyboardResult.error);
          }
        }

        // 9. 同步内嵌键盘 (Webhook模式特殊处理)
        if (options.inlineKeyboard) {
          const inlineKeyboardResult = await WebhookKeyboardHandler.syncInlineKeyboard(
            bot.bot_token, formData, logs
          );
          results.inlineKeyboard = inlineKeyboardResult.success;
          if (!inlineKeyboardResult.success && inlineKeyboardResult.error) {
            errors.push(inlineKeyboardResult.error);
          }
        }

        // 10. 键盘类型验证
        if (options.keyboardType) {
          const keyboardResult = await ConfigValidationService.validateKeyboardType(formData, logs, 'Webhook');
          results.keyboardType = keyboardResult.success;
          if (!keyboardResult.success && keyboardResult.error) {
            errors.push(keyboardResult.error);
          }
        }

        // 11. 价格配置验证
        if (options.priceConfig) {
          const priceConfigResult = await ConfigValidationService.validatePriceConfig(formData, logs, 'Webhook');
          results.priceConfig = priceConfigResult.success;
          if (!priceConfigResult.success && priceConfigResult.error) {
            errors.push(priceConfigResult.error);
          }
        }

        // 计算成功率
        const totalSelected = Object.keys(results).length;
        const successCount = Object.values(results).filter(r => r === true).length;
        const failedCount = Object.values(results).filter(r => r === false).length;
        
        const success = failedCount === 0 && successCount > 0;
        const hasPartialSuccess = successCount > 0 && failedCount > 0;
        
        logs.push(`📊 [Webhook模式] 同步完成: 成功 ${successCount}/${totalSelected} 项`);

        res.status(200).json({
          success: true,
          message: 'Webhook模式手动同步完成',
          data: {
            success,
            hasPartialSuccess,
            results,
            errors,
            logs,
            summary: `成功同步 ${successCount}/${totalSelected} 项设置 (Webhook模式)`
          }
        });

      } catch (error: any) {
        console.error('Webhook模式手动同步失败:', error);
        res.status(500).json({
          success: false,
          message: 'Webhook模式同步过程中发生错误',
          data: {
            success: false,
            hasPartialSuccess: false,
            results: {},
            errors: [error.message || '未知错误'],
            logs: [...logs, `❌ Webhook模式同步失败: ${error.message}`],
            summary: 'Webhook模式同步失败'
          }
        });
      }
      
    } catch (error) {
      console.error('Webhook模式手动同步错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  // =================
  // 保留的辅助方法 (将被进一步重构)
  // =================

  /**
   * 同步工作模式 (Webhook模式)
   */
  private static async syncWorkModeWebhook(
    botToken: string, 
    formData: any, 
    logs: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logs.push(`🎯 [Webhook] 开始同步工作模式: ${formData.work_mode}`);
      
      if (formData.work_mode !== 'webhook') {
        logs.push(`❌ [Webhook] 控制器只能处理Webhook模式`);
        return { success: false, error: 'WebhookController只能处理Webhook模式' };
      }
      
      const result = await WebhookSetupService.syncWorkModeToTelegram(
        botToken,
        formData.work_mode,
        formData.webhook_url,
        formData.webhook_secret
      );
      
      if (result.success) {
        logs.push(`✅ [Webhook] Webhook模式设置成功`);
        return { success: true };
      } else {
        logs.push(`❌ [Webhook] ${result.message}`);
        return { success: false, error: result.message };
      }
    } catch (error: any) {
      const errorMsg = `工作模式同步失败: ${error.message}`;
      logs.push(`❌ [Webhook] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 同步Webhook URL (Webhook模式) - 智能URL处理版本
   */
  private static async syncWebhookUrlWithBotId(
    botId: string,
    baseWebhookUrl: string, 
    webhookSecret?: string,
    logs: string[] = []
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logs.push(`🎯 [Webhook] 开始同步Webhook URL (智能处理): ${baseWebhookUrl}`);
      
      // 使用新的智能URL处理方法
      const result = await WebhookSetupService.setBotWebhookWithUrl(
        botId,
        baseWebhookUrl,
        webhookSecret
      );
      
      if (result.success) {
        logs.push(`✅ [Webhook] Webhook URL设置成功（已自动添加机器人用户名）`);
        return { success: true };
      } else {
        const error = `Webhook URL设置失败: ${result.message}`;
        logs.push(`❌ [Webhook] ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMsg = `Webhook URL同步失败: ${error.message}`;
      logs.push(`❌ [Webhook] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 同步Webhook URL (Webhook模式) - 原版本保留兼容性
   */
  private static async syncWebhookUrl(
    botToken: string, 
    webhookUrl: string, 
    webhookSecret?: string,
    logs: string[] = []
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logs.push(`🎯 [Webhook] 开始同步Webhook URL: ${webhookUrl}`);
      
      // 调用WebhookSetupService设置webhook
      const result = await WebhookSetupService.setWebhook(
        botToken,
        webhookUrl,
        webhookSecret
      );
      
      if (result.success) {
        logs.push(`✅ [Webhook] Webhook URL设置成功`);
        return { success: true };
      } else {
        const error = `Webhook URL设置失败: ${result.message}`;
        logs.push(`❌ [Webhook] ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMsg = `Webhook URL同步失败: ${error.message}`;
      logs.push(`❌ [Webhook] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}
