/**
 * 数据库监控控制器
 * 处理数据库监控相关的API请求
 */
import express from 'express';
import { MonitoringService } from '../../services/monitoring.ts';
import { logger } from '../../utils/logger.ts';

type Request = express.Request;
type Response = express.Response;

export class DatabaseMonitoringController {
  private monitoringService: MonitoringService;

  constructor() {
    this.monitoringService = new MonitoringService();
  }

  /**
   * 获取数据库信息
   * GET /api/monitoring/database-info
   */
  getDatabaseInfo = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const stats = await this.monitoringService.getDatabaseStats(page, limit);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('获取数据库信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取数据库信息失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 分析表结构和性能
   * POST /api/monitoring/database/analyze/:tableName
   */
  analyzeTable = async (req: Request, res: Response) => {
    try {
      const { tableName } = req.params;
      
      // 获取表的详细分析信息
      const analysis = await this.monitoringService.analyzeTable(tableName);
      
      res.json({
        success: true,
        data: analysis,
        message: '表分析完成'
      });
    } catch (error) {
      logger.error('表分析失败:', error);
      res.status(500).json({
        success: false,
        message: '表分析失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

// 创建并导出控制器实例
export const databaseMonitoringController = new DatabaseMonitoringController();
