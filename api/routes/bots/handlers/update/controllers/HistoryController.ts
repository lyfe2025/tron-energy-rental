/**
 * 机器人历史记录控制器
 * 负责更新和删除历史记录的查询功能
 */
import type { Request, Response } from 'express';
import { ConfigUpdateService } from '../services/ConfigUpdateService.js';
import { DeleteService } from '../services/DeleteService.js';
import { UpdateUtils } from '../utils/updateUtils.js';

export class HistoryController {
  /**
   * 获取更新历史
   */
  static async getUpdateHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;

      const history = await ConfigUpdateService.getUpdateHistory(id, Number(limit));

      res.json({
        success: true,
        data: {
          bot_id: id,
          history: history,
          total: history.length
        }
      });

    } catch (error) {
      console.error('获取更新历史失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '获取更新历史失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 获取删除历史
   */
  static async getDeleteHistory(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50 } = req.query;

      const history = await DeleteService.getDeleteHistory(Number(limit));

      res.json({
        success: true,
        data: {
          history: history,
          total: history.length
        }
      });

    } catch (error) {
      console.error('获取删除历史失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '获取删除历史失败',
        [errorMessage]
      ));
    }
  }
}
