/**
 * 模式切换控制器
 * 处理机器人工作模式的切换逻辑
 */
import { type Request, type Response } from 'express';
import type { BotModeSwitchData, RouteHandler } from '../../../types.ts';
import { BotRestartService } from '../services/BotRestartService.ts';
import { ModeValidationService } from '../services/ModeValidationService.ts';
import { WebhookSetupService } from '../services/WebhookSetupService.ts';

/**
 * 模式切换控制器类
 */
export class ModeSwitchController {
  /**
   * 机器人模式切换
   * POST /api/bots/:id/switch-mode
   * 权限：管理员
   */
  static switchBotMode: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body as BotModeSwitchData;
      
      // 1. 综合验证请求数据
      const validationResult = await ModeValidationService.validateFullModeSwitchRequest(id, data);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: validationResult.message
        });
        return;
      }
      
      // 2. 如果切换到Webhook模式，先验证Webhook设置
      if (data.work_mode === 'webhook' && data.webhook_url) {
        const webhookSetupResult = await WebhookSetupService.setWebhook(
          validationResult.bot.bot_token,
          data.webhook_url,
          data.webhook_secret
        );
        
        if (!webhookSetupResult.success) {
          res.status(400).json({
            success: false,
            message: `Webhook设置失败: ${webhookSetupResult.message}`
          });
          return;
        }
      } else if (data.work_mode === 'polling') {
        // 切换到Polling模式，删除现有Webhook
        const deleteResult = await WebhookSetupService.deleteWebhook(
          validationResult.bot.bot_token
        );
        
        if (!deleteResult.success) {
          console.warn('删除Webhook失败，但继续切换模式:', deleteResult.message);
        }
      }
      
      // 3. 执行完整的模式切换流程
      const switchResult = await BotRestartService.executeModeSwitchFlow(
        id,
        data.work_mode,
        data.webhook_url,
        data.webhook_secret,
        data.max_connections
      );
      
      if (!switchResult.success) {
        res.status(500).json({
          success: false,
          message: switchResult.message
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: switchResult.message,
        data: switchResult.data
      });
      
    } catch (error) {
      console.error('切换机器人模式错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 获取机器人模式状态
   * GET /api/bots/:id/mode-status
   * 权限：管理员
   */
  static getBotModeStatus: RouteHandler = async (req: Request, res: Response) => {
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
      
      // 检查运行状态
      const statusResult = await BotRestartService.checkBotRunningStatus(id);
      
      let webhookStatus = null;
      if (botValidation.bot.work_mode === 'webhook') {
        const webhookResult = await WebhookSetupService.getWebhookStatus(id);
        if (webhookResult.success) {
          webhookStatus = webhookResult.data.webhook_info;
        }
      }
      
      res.status(200).json({
        success: true,
        message: '模式状态获取成功',
        data: {
          bot: botValidation.bot,
          status: statusResult.data,
          webhook_status: webhookStatus
        }
      });
      
    } catch (error) {
      console.error('获取机器人模式状态错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 批量模式切换
   * POST /api/bots/batch-switch-mode
   * 权限：管理员
   */
  static batchSwitchMode: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { bot_ids, work_mode, webhook_url, webhook_secret, max_connections } = req.body;
      
      if (!Array.isArray(bot_ids) || bot_ids.length === 0) {
        res.status(400).json({
          success: false,
          message: '需要提供机器人ID列表'
        });
        return;
      }
      
      const results: Array<{
        bot_id: string;
        success: boolean;
        message: string;
      }> = [];
      
      // 依次处理每个机器人
      for (const botId of bot_ids) {
        try {
          const data: BotModeSwitchData = {
            work_mode,
            webhook_url,
            webhook_secret,
            max_connections
          };
          
          // 验证请求数据
          const validationResult = await ModeValidationService.validateFullModeSwitchRequest(botId, data);
          if (!validationResult.isValid) {
            results.push({
              bot_id: botId,
              success: false,
              message: validationResult.message
            });
            continue;
          }
          
          // 执行模式切换
          const switchResult = await BotRestartService.executeModeSwitchFlow(
            botId,
            work_mode,
            webhook_url,
            webhook_secret,
            max_connections
          );
          
          results.push({
            bot_id: botId,
            success: switchResult.success,
            message: switchResult.message
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
      
      res.status(200).json({
        success: successCount > 0,
        message: `批量模式切换完成，成功 ${successCount}/${totalCount} 个机器人`,
        data: {
          results,
          summary: {
            total: totalCount,
            success: successCount,
            failed: totalCount - successCount
          }
        }
      });
      
    } catch (error) {
      console.error('批量切换机器人模式错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 重新应用模式设置
   * POST /api/bots/:id/reapply-mode
   * 权限：管理员
   */
  static reapplyModeSettings: RouteHandler = async (req: Request, res: Response) => {
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
      
      const bot = botValidation.bot;
      
      // 根据当前模式重新应用设置
      if (bot.work_mode === 'webhook') {
        if (!bot.webhook_url) {
          res.status(400).json({
            success: false,
            message: 'Webhook URL未配置'
          });
          return;
        }
        
        const applyResult = await WebhookSetupService.applyBotWebhookSettings(id);
        res.status(applyResult.success ? 200 : 400).json({
          success: applyResult.success,
          message: applyResult.message
        });
      } else {
        // Polling模式，删除可能存在的Webhook
        const deleteResult = await WebhookSetupService.deleteWebhook(bot.bot_token);
        res.status(deleteResult.success ? 200 : 400).json({
          success: deleteResult.success,
          message: deleteResult.message
        });
      }
      
    } catch (error) {
      console.error('重新应用模式设置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
}
