/**
 * 机器人删除控制器
 * 负责机器人删除、批量删除、恢复和清理功能
 */
import type { Request, Response } from 'express';
import { DeleteService } from '../services/DeleteService.ts';
import { UpdateUtils } from '../utils/updateUtils.ts';
import { UpdateValidators } from '../validators/updateValidators.ts';

export class DeleteController {
  /**
   * 删除机器人
   */
  static async deleteBot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        cleanup_api = true,
        hard_delete = false,
        force = false,
        reason = '用户删除'
      } = req.body;

      console.log(`\n🗑️ 收到机器人删除请求:`);
      console.log(`📋 机器人ID: ${id}`);
      console.log(`🔧 删除选项:`, { cleanup_api, hard_delete, force, reason });
      console.log(`===============================`);

      // 验证机器人是否存在
      const botExists = await UpdateValidators.validateBotExists(id);
      if (!botExists.exists) {
        res.status(404).json(UpdateUtils.createErrorResponse('机器人不存在'));
        return;
      }

      // 执行完整删除
      const deleteResult = await DeleteService.completeDeleteBot(id, {
        cleanupAPI: cleanup_api,
        hardDelete: hard_delete,
        force: force,
        reason: reason
      });

      if (deleteResult.success) {
        console.log('🎉 机器人删除成功:', id);
        res.json({
          success: true,
          message: `机器人${hard_delete ? '彻底' : ''}删除成功`,
          data: {
            bot_id: id,
            delete_type: hard_delete ? 'hard_delete' : 'soft_delete',
            api_cleanup: deleteResult.apiCleanup,
            warnings: deleteResult.errors.length > 0 ? deleteResult.errors : undefined
          }
        });
      } else {
        res.status(500).json(UpdateUtils.createErrorResponse(
          '删除机器人失败',
          deleteResult.errors
        ));
      }

    } catch (error) {
      console.error('删除机器人失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '删除机器人失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 批量删除机器人
   */
  static async batchDeleteBots(req: Request, res: Response): Promise<void> {
    try {
      const { bot_ids, ...options } = req.body;

      if (!Array.isArray(bot_ids) || bot_ids.length === 0) {
        res.status(400).json(UpdateUtils.createErrorResponse('请提供要删除的机器人ID列表'));
        return;
      }

      console.log(`\n🗑️ 批量删除机器人请求: ${bot_ids.length} 个`);

      const result = await DeleteService.batchDeleteBots(bot_ids, options);

      res.json({
        success: result.success,
        message: `批量删除完成`,
        data: {
          total: bot_ids.length,
          results: result.results,
          errors: result.totalErrors
        }
      });

    } catch (error) {
      console.error('批量删除机器人失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '批量删除机器人失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 恢复软删除的机器人
   */
  static async restoreBot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      console.log(`\n🔄 恢复机器人请求: ${id}`);

      await DeleteService.restoreBot(id);

      res.json({
        success: true,
        message: '机器人恢复成功',
        data: { bot_id: id }
      });

    } catch (error) {
      console.error('恢复机器人失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '恢复机器人失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 清理过期的软删除机器人
   */
  static async cleanupExpiredDeletes(req: Request, res: Response): Promise<void> {
    try {
      const { days_old = 30 } = req.body;

      console.log(`\n🧹 清理 ${days_old} 天前的软删除机器人...`);

      const result = await DeleteService.cleanupExpiredSoftDeletes(days_old);

      res.json({
        success: true,
        message: '清理完成',
        data: {
          cleaned_count: result.cleaned,
          errors: result.errors
        }
      });

    } catch (error) {
      console.error('清理过期删除失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '清理过期删除失败',
        [errorMessage]
      ));
    }
  }
}
