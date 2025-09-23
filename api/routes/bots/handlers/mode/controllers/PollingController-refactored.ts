/**
 * 轮询控制器
 * 处理机器人轮询模式相关的操作和手动同步
 * 重构后只保留路由处理逻辑，具体实现委托给专用服务
 */
import { type Request, type Response } from 'express';
import type { RouteHandler } from '../../../types.ts';
import { ModeValidationService } from '../services/ModeValidationService.ts';
import { WebhookSetupService } from '../services/WebhookSetupService.ts';
import { PollingKeyboardHandler } from './polling/PollingKeyboardHandler.ts';
import { BasicSyncService } from './shared/BasicSyncService.ts';
import { ConfigValidationService } from './shared/ConfigValidationService.ts';

/**
 * 轮询控制器类
 */
export class PollingController {
  /**
   * 手动同步机器人设置到Telegram (Polling模式专用)
   * POST /api/bots/:id/manual-sync (Polling模式)
   * 权限：管理员
   */
  static manualSyncToTelegramPolling: RouteHandler = async (req: Request, res: Response) => {
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
      
      // 确保是Polling模式
      if (bot.work_mode !== 'polling') {
        res.status(400).json({
          success: false,
          message: 'Polling控制器只能处理Polling模式的机器人'
        });
        return;
      }
      
      const results: Record<string, boolean | null> = {};
      const errors: string[] = [];
      const logs: string[] = [];
      
      logs.push(`🔄 [Polling模式] 开始手动同步`);
      
      try {
        // 1. 同步机器人名称
        if (options.name && formData.name) {
          const nameResult = await BasicSyncService.syncBotName(bot.bot_token, formData.name, logs, 'Polling');
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
          const descResult = await BasicSyncService.syncBotDescription(bot.bot_token, formData.description, logs, 'Polling');
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
            bot.bot_token, formData.short_description, logs, 'Polling'
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
            bot.bot_token, formData, logs, 'Polling'
          );
          results.commands = commandsResult.success;
          if (!commandsResult.success && commandsResult.error) {
            errors.push(commandsResult.error);
          }
        }

        // 5. 同步工作模式
        if (options.workMode) {
          const workModeResult = await PollingController.syncWorkMode(
            bot.bot_token, formData, logs
          );
          results.workMode = workModeResult.success;
          if (!workModeResult.success && workModeResult.error) {
            errors.push(workModeResult.error);
          }
        }

        // 6. 同步Webhook URL
        if (options.webhookUrl) {
          if (formData.work_mode === 'webhook' && formData.webhook_url) {
            const webhookResult = await PollingController.syncWebhookUrl(
              bot.bot_token, formData.webhook_url, formData.webhook_secret, logs
            );
            results.webhookUrl = webhookResult.success;
            if (!webhookResult.success && webhookResult.error) {
              errors.push(webhookResult.error);
            }
          } else {
            results.webhookUrl = null;
            logs.push(`⏭️ 跳过Webhook URL同步（非Webhook模式或URL未设置）`);
          }
        }

        // 7. 同步菜单按钮
        if (options.menuButton && formData.menu_button_enabled) {
          const menuResult = await BasicSyncService.syncMenuButton(
            bot.bot_token, formData, logs, 'Polling'
          );
          results.menuButton = menuResult.success;
          if (!menuResult.success && menuResult.error) {
            errors.push(menuResult.error);
          }
        } else if (options.menuButton) {
          results.menuButton = null;
          logs.push(`⏭️ 跳过菜单按钮同步（未启用或配置不完整）`);
        }

        // 8. 同步回复键盘
        if (options.replyKeyboard) {
          const replyKeyboardResult = await PollingKeyboardHandler.syncReplyKeyboard(
            bot.bot_token, formData, logs
          );
          results.replyKeyboard = replyKeyboardResult.success;
          if (!replyKeyboardResult.success && replyKeyboardResult.error) {
            errors.push(replyKeyboardResult.error);
          }
        }

        // 9. 同步内嵌键盘
        if (options.inlineKeyboard) {
          const inlineKeyboardResult = await PollingKeyboardHandler.syncInlineKeyboard(
            bot.bot_token, formData, logs
          );
          results.inlineKeyboard = inlineKeyboardResult.success;
          if (!inlineKeyboardResult.success && inlineKeyboardResult.error) {
            errors.push(inlineKeyboardResult.error);
          }
        }

        // 10. 键盘类型验证
        if (options.keyboardType) {
          const keyboardResult = await ConfigValidationService.validateKeyboardType(formData, logs, 'Polling');
          results.keyboardType = keyboardResult.success;
          if (!keyboardResult.success && keyboardResult.error) {
            errors.push(keyboardResult.error);
          }
        }

        // 11. 价格配置验证
        if (options.priceConfig) {
          const priceConfigResult = await ConfigValidationService.validatePriceConfig(formData, logs, 'Polling');
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
        
        logs.push(`📊 [Polling模式] 同步完成: 成功 ${successCount}/${totalSelected} 项`);

        res.status(200).json({
          success: true,
          message: 'Polling模式手动同步完成',
          data: {
            success,
            hasPartialSuccess,
            results,
            errors,
            logs,
            summary: `成功同步 ${successCount}/${totalSelected} 项设置 (Polling模式)`
          }
        });

      } catch (error: any) {
        console.error('Polling模式手动同步失败:', error);
        res.status(500).json({
          success: false,
          message: 'Polling模式同步过程中发生错误',
          data: {
            success: false,
            hasPartialSuccess: false,
            results: {},
            errors: [error.message || '未知错误'],
            logs: [...logs, `❌ Polling模式同步失败: ${error.message}`],
            summary: 'Polling模式同步失败'
          }
        });
      }
      
    } catch (error) {
      console.error('Polling模式手动同步错误:', error);
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
   * 同步工作模式
   */
  private static async syncWorkMode(
    botToken: string, 
    formData: any, 
    logs: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logs.push(`🎯 [Polling] 开始同步工作模式: ${formData.work_mode}`);
      
      const result = await WebhookSetupService.syncWorkModeToTelegram(
        botToken,
        formData.work_mode,
        formData.webhook_url,
        formData.webhook_secret
      );
      
      if (result.success) {
        logs.push(`✅ [Polling] ${formData.work_mode === 'webhook' ? 'Webhook' : 'Polling'}模式设置成功`);
        return { success: true };
      } else {
        logs.push(`❌ [Polling] ${result.message}`);
        return { success: false, error: result.message };
      }
    } catch (error: any) {
      const errorMsg = `工作模式同步失败: ${error.message}`;
      logs.push(`❌ [Polling] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 同步Webhook URL
   */
  private static async syncWebhookUrl(
    botToken: string, 
    webhookUrl: string, 
    webhookSecret?: string,
    logs: string[] = []
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logs.push(`🎯 [Polling] 开始同步Webhook URL: ${webhookUrl}`);
      
      // 调用WebhookSetupService设置webhook
      const result = await WebhookSetupService.setWebhook(
        botToken,
        webhookUrl,
        webhookSecret
      );
      
      if (result.success) {
        logs.push(`✅ [Polling] Webhook URL设置成功`);
        return { success: true };
      } else {
        const error = `Webhook URL设置失败: ${result.message}`;
        logs.push(`❌ [Polling] ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMsg = `Webhook URL同步失败: ${error.message}`;
      logs.push(`❌ [Polling] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}
