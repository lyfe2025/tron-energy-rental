/**
 * 监控中心控制器
 * 处理监控相关的API请求
 */
import express from 'express';
import { MonitoringService } from '../services/monitoring.ts';

type Request = express.Request;
type Response = express.Response;
import { logger } from '../utils/logger.ts';

export class MonitoringController {
  private monitoringService: MonitoringService;

  constructor() {
    this.monitoringService = new MonitoringService();
  }

  /**
   * 获取监控概览
   * GET /api/monitoring/overview
   */
  getOverview = async (req: Request, res: Response) => {
    try {
      const overview = await this.monitoringService.getOverview();
      
      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      logger.error('获取监控概览失败:', error);
      res.status(500).json({
        success: false,
        message: '获取监控概览失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 获取在线用户列表
   * GET /api/monitoring/online-users
   */
  getOnlineUsers = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await this.monitoringService.getOnlineUsers(page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('获取在线用户失败:', error);
      res.status(500).json({
        success: false,
        message: '获取在线用户失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };



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
   * 获取服务状态监控
   * GET /api/monitoring/service-status
   */
  getServiceStatus = async (req: Request, res: Response) => {
    try {
      const status = await this.monitoringService.getServiceStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('获取服务状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取服务状态失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 获取缓存监控信息
   * GET /api/monitoring/cache-status
   */
  getCacheStatus = async (req: Request, res: Response) => {
    try {
      // 这里可以集成Redis监控信息
      // 暂时返回基本信息
      const cacheStatus = {
        redis: {
          status: 'connected',
          memory_usage: '0MB',
          connected_clients: 0,
          total_commands_processed: 0
        }
      };
      
      res.json({
        success: true,
        data: cacheStatus
      });
    } catch (error) {
      logger.error('获取缓存状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取缓存状态失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 强制下线用户
   * POST /api/monitoring/online-users/:sessionId/force-logout
   */
  forceLogout = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const adminId = req.user?.id;
      
      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }
      
      const result = await this.monitoringService.forceLogoutUser(sessionId);
      
      // 记录操作日志
      await this.monitoringService.logSystemAction(adminId, 'force_logout', {
        sessionId,
        targetUserId: result.admin_id
      });
      
      res.json({
        success: true,
        message: '用户已强制下线',
        data: result
      });
    } catch (error) {
      logger.error('强制下线用户失败:', error);
      res.status(500).json({
        success: false,
        message: '强制下线用户失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 暂停定时任务
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
   * 获取数据库信息
   */
  getDatabaseInfo = async (req: Request, res: Response) => {
    try {
      const stats = await this.monitoringService.getDatabaseStats();
      
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
   * 检查服务
   */
  checkService = async (req: Request, res: Response) => {
    try {
      const { serviceName } = req.params;
      const result = await this.monitoringService.checkService(serviceName);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('检查服务失败:', error);
      res.status(500).json({
        success: false,
        message: '检查服务失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 测试缓存连接
   */
  testCacheConnection = async (req: Request, res: Response) => {
    try {
      const result = await this.monitoringService.testCacheConnection();
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('测试缓存连接失败:', error);
      res.status(500).json({
        success: false,
        message: '测试缓存连接失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 清空缓存
   */
  clearCache = async (req: Request, res: Response) => {
    try {
      await this.monitoringService.clearCache();
      
      res.json({
        success: true,
        message: '缓存已清空'
      });
    } catch (error) {
      logger.error('清空缓存失败:', error);
      res.status(500).json({
        success: false,
        message: '清空缓存失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 删除缓存键
   */
  deleteCacheKey = async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      await this.monitoringService.deleteCacheKey(key);
      
      res.json({
        success: true,
        message: '缓存键已删除'
      });
    } catch (error) {
      logger.error('删除缓存键失败:', error);
      res.status(500).json({
        success: false,
        message: '删除缓存键失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

// 创建并导出控制器实例
export const monitoringController = new MonitoringController();