/**
 * 定时任务监控控制器
 * 处理定时任务相关的API请求
 */
import express from 'express';
import { MonitoringService } from '../../services/monitoring.ts';
import { logger } from '../../utils/logger.ts';

type Request = express.Request;
type Response = express.Response;

export class ScheduledTasksController {
  private monitoringService: MonitoringService;

  constructor() {
    this.monitoringService = new MonitoringService();
  }

  /**
   * 获取定时任务列表
   * GET /api/monitoring/scheduled-tasks
   */
  getScheduledTasks = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await this.monitoringService.getScheduledTasks(page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('获取定时任务失败:', error);
      res.status(500).json({
        success: false,
        message: '获取定时任务失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 暂停定时任务
   * POST /api/monitoring/scheduled-tasks/:taskId/pause
   */
  pauseTask = async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      await this.monitoringService.pauseTask(taskId);
      
      res.json({
        success: true,
        message: '任务已暂停'
      });
    } catch (error) {
      logger.error('暂停任务失败:', error);
      res.status(500).json({
        success: false,
        message: '暂停任务失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 恢复定时任务
   * POST /api/monitoring/scheduled-tasks/:taskId/resume
   */
  resumeTask = async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      await this.monitoringService.resumeTask(taskId);
      
      res.json({
        success: true,
        message: '任务已恢复'
      });
    } catch (error) {
      logger.error('恢复任务失败:', error);
      res.status(500).json({
        success: false,
        message: '恢复任务失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 立即执行任务
   * POST /api/monitoring/scheduled-tasks/:taskId/execute
   */
  executeTask = async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      await this.monitoringService.executeTask(taskId);
      
      res.json({
        success: true,
        message: '任务已执行'
      });
    } catch (error) {
      logger.error('执行任务失败:', error);
      res.status(500).json({
        success: false,
        message: '执行任务失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 获取任务日志
   * GET /api/monitoring/scheduled-tasks/:taskId/logs
   */
  getTaskLogs = async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await this.monitoringService.getTaskExecutionLogs(taskId, page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('获取任务日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取任务日志失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 更新定时任务
   * PUT /api/monitoring/scheduled-tasks/:taskId
   */
  updateTask = async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const taskData = req.body;
      
      const result = await this.monitoringService.updateTask(taskId, taskData);
      
      res.json({
        success: true,
        data: result,
        message: '任务已更新'
      });
    } catch (error) {
      logger.error('更新任务失败:', error);
      res.status(500).json({
        success: false,
        message: '更新任务失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 删除定时任务
   * DELETE /api/monitoring/scheduled-tasks/:taskId
   */
  deleteTask = async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      await this.monitoringService.deleteTask(taskId);
      
      res.json({
        success: true,
        message: '任务已删除'
      });
    } catch (error) {
      logger.error('删除任务失败:', error);
      res.status(500).json({
        success: false,
        message: '删除任务失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

// 创建并导出控制器实例
export const scheduledTasksController = new ScheduledTasksController();
