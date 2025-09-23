/**
 * 模式分发器
 * 根据机器人的工作模式自动路由到对应的控制器
 */
import { type Request, type Response } from 'express';
import type { RouteHandler } from '../../../types.ts';
import { ModeValidationService } from '../services/ModeValidationService.ts';
import { PollingController } from './PollingController.ts';
import { WebhookController } from './WebhookController.ts';

/**
 * 模式分发器类
 */
export class ModeDispatcher {
  /**
   * 自动分发手动同步请求到对应的控制器
   * POST /api/bots/:id/manual-sync
   * 权限：管理员
   */
  static manualSyncToTelegram: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // 首先验证机器人存在并获取工作模式
      const botValidation = await ModeValidationService.validateBotExists(id);
      if (!botValidation.isValid) {
        res.status(404).json({
          success: false,
          message: botValidation.message
        });
        return;
      }
      
      const bot = botValidation.bot;
      const workMode = bot.work_mode;
      
      console.log(`🎯 [ModeDispatcher] 检测到机器人 ${bot.name} (${id}) 工作模式: ${workMode}`);
      
      // 根据工作模式分发到对应的控制器
      if (workMode === 'polling') {
        console.log(`🔄 [ModeDispatcher] 路由到 PollingController`);
        return await PollingController.manualSyncToTelegramPolling(req, res);
      } else if (workMode === 'webhook') {
        console.log(`🌐 [ModeDispatcher] 路由到 WebhookController`);
        return await WebhookController.manualSyncToTelegramWebhook(req, res);
      } else {
        console.error(`❌ [ModeDispatcher] 未知的工作模式: ${workMode}`);
        res.status(400).json({
          success: false,
          message: `不支持的工作模式: ${workMode}，支持的模式: polling, webhook`
        });
        return;
      }
      
    } catch (error: any) {
      console.error('[ModeDispatcher] 分发错误:', error);
      res.status(500).json({
        success: false,
        message: '模式分发器内部错误',
        error: error.message
      });
    }
  };

  /**
   * 获取分发器状态信息
   * GET /api/bots/dispatcher-status
   * 权限：管理员
   */
  static getDispatcherStatus: RouteHandler = async (req: Request, res: Response) => {
    try {
      // 统计不同工作模式的机器人数量
      const { query } = await import('../../../../../config/database.ts');
      const result = await query(
        'SELECT work_mode, COUNT(*) as count FROM telegram_bots WHERE is_active = true GROUP BY work_mode'
      );
      
      const stats: Record<string, number> = {};
      result.rows.forEach((row: any) => {
        stats[row.work_mode] = parseInt(row.count);
      });
      
      res.status(200).json({
        success: true,
        message: '模式分发器状态获取成功',
        data: {
          dispatcher: {
            version: '1.0.0',
            description: '根据机器人工作模式自动分发请求到对应控制器',
            supportedModes: ['polling', 'webhook'],
            controllers: {
              polling: 'PollingController',
              webhook: 'WebhookController'
            }
          },
          statistics: {
            total: Object.values(stats).reduce((sum, count) => sum + count, 0),
            byMode: stats
          },
          routingRules: [
            {
              mode: 'polling',
              controller: 'PollingController.manualSyncToTelegramPolling',
              description: 'Polling模式机器人，使用getUpdates获取聊天ID并发送测试消息'
            },
            {
              mode: 'webhook', 
              controller: 'WebhookController.manualSyncToTelegramWebhook',
              description: 'Webhook模式机器人，避免getUpdates冲突，只验证配置'
            }
          ]
        }
      });
      
    } catch (error: any) {
      console.error('[ModeDispatcher] 获取状态错误:', error);
      res.status(500).json({
        success: false,
        message: '获取分发器状态失败',
        error: error.message
      });
    }
  };

  /**
   * 批量检查机器人模式分布
   * POST /api/bots/check-mode-distribution
   * 权限：管理员
   */
  static checkModeDistribution: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { query } = await import('../../../../../config/database.ts');
      
      // 获取详细的机器人模式分布
      const detailResult = await query(`
        SELECT 
          id,
          name,
          work_mode,
          webhook_url,
          is_active,
          created_at,
          updated_at
        FROM telegram_bots 
        ORDER BY work_mode, name
      `);
      
      const bots = detailResult.rows;
      const distribution = {
        polling: bots.filter((bot: any) => bot.work_mode === 'polling'),
        webhook: bots.filter((bot: any) => bot.work_mode === 'webhook'),
        unknown: bots.filter((bot: any) => !['polling', 'webhook'].includes(bot.work_mode))
      };
      
      const summary = {
        total: bots.length,
        active: bots.filter((bot: any) => bot.is_active).length,
        inactive: bots.filter((bot: any) => !bot.is_active).length,
        polling: distribution.polling.length,
        webhook: distribution.webhook.length,
        unknown: distribution.unknown.length
      };
      
      res.status(200).json({
        success: true,
        message: '机器人模式分布检查完成',
        data: {
          summary,
          distribution,
          recommendations: [
            summary.unknown > 0 ? '发现未知工作模式的机器人，建议检查数据一致性' : null,
            summary.inactive > 0 ? `有 ${summary.inactive} 个机器人处于非激活状态` : null,
            summary.webhook > 0 ? `Webhook模式机器人将使用专用的同步逻辑` : null,
            summary.polling > 0 ? `Polling模式机器人将使用getUpdates获取聊天信息` : null
          ].filter(Boolean)
        }
      });
      
    } catch (error: any) {
      console.error('[ModeDispatcher] 检查模式分布错误:', error);
      res.status(500).json({
        success: false,
        message: '检查机器人模式分布失败',
        error: error.message
      });
    }
  };
}
