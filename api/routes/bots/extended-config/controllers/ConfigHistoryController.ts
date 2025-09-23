/**
 * 配置历史控制器
 * 负责机器人配置变更历史记录的查询
 */
import type { Request, Response } from 'express';
import { ExtendedConfigService } from '../services/ExtendedConfigService.ts';

export class ConfigHistoryController {
  /**
   * 获取机器人配置历史
   * GET /api/bots/:id/config-history
   * 权限：管理员
   */
  static async getBotConfigHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const result = await ExtendedConfigService.getConfigHistory(
        id, 
        Number(page), 
        Number(limit)
      );
      
      res.status(200).json({
        success: true,
        message: '配置历史获取成功',
        data: result
      });
      
    } catch (error) {
      console.error('获取配置历史错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}
