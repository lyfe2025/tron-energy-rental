/**
 * 监控中心主控制器
 * 聚合所有监控相关的子控制器
 */
import express from 'express';
import { MonitoringService } from '../../services/monitoring.ts';
import { logger } from '../../utils/logger.ts';
import { cacheMonitoringController } from './CacheMonitoringController.ts';
import { databaseMonitoringController } from './DatabaseMonitoringController.ts';
import { onlineUsersController } from './OnlineUsersController.ts';
import { scheduledTasksController } from './ScheduledTasksController.ts';
import { serviceStatusController } from './ServiceStatusController.ts';

type Request = express.Request;
type Response = express.Response;

export class MonitoringController {
  private monitoringService: MonitoringService;

  // 子控制器实例
  public onlineUsers = onlineUsersController;
  public scheduledTasks = scheduledTasksController;
  public serviceStatus = serviceStatusController;
  public cacheMonitoring = cacheMonitoringController;
  public databaseMonitoring = databaseMonitoringController;

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

  // 代理方法 - 保持向后兼容
  getOnlineUsers = this.onlineUsers.getOnlineUsers;
  forceLogout = this.onlineUsers.forceLogout;
  
  getScheduledTasks = this.scheduledTasks.getScheduledTasks;
  updateTask = this.scheduledTasks.updateTask;
  pauseTask = this.scheduledTasks.pauseTask;
  resumeTask = this.scheduledTasks.resumeTask;
  executeTask = this.scheduledTasks.executeTask;
  getTaskLogs = this.scheduledTasks.getTaskLogs;
  deleteTask = this.scheduledTasks.deleteTask;
  
  getServiceStatus = this.serviceStatus.getServiceStatus;
  checkService = this.serviceStatus.checkService;
  
  getCacheStatus = this.cacheMonitoring.getCacheStatus;
  testCacheConnection = this.cacheMonitoring.testCacheConnection;
  clearCache = this.cacheMonitoring.clearCache;
  deleteCacheKey = this.cacheMonitoring.deleteCacheKey;
  
  getDatabaseInfo = this.databaseMonitoring.getDatabaseInfo;
  analyzeTable = this.databaseMonitoring.analyzeTable;
}

// 创建并导出控制器实例
export const monitoringController = new MonitoringController();
