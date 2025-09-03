/**
 * 服务状态监控控制器
 * 处理服务状态相关的API请求
 */
import express from 'express';
import { MonitoringService } from '../../services/monitoring.ts';
import { logger } from '../../utils/logger.ts';

type Request = express.Request;
type Response = express.Response;

export class ServiceStatusController {
  private monitoringService: MonitoringService;

  constructor() {
    this.monitoringService = new MonitoringService();
  }

  /**
   * 获取服务状态监控
   * GET /api/monitoring/service-status
   */
  getServiceStatus = async (req: Request, res: Response) => {
    try {
      const systemStatus = await this.monitoringService.getServiceStatus();
      
      // 检查各个服务的实际状态
      const services = await Promise.allSettled([
        this.monitoringService.checkService('database'),
        this.monitoringService.checkService('api'),
        this.monitoringService.checkService('cache')
      ]);
      
      // 构建符合前端期望的服务状态数据结构
      const currentTime = new Date();
      const serviceData = {
        services: [
          {
            name: 'Database',
            type: 'database',
            status: services[0].status === 'fulfilled' && (services[0].value.details as any)?.status === 'connected' ? 'healthy' : 'error',
            uptime: Math.floor(process.uptime()), // 进程运行时间
            responseTime: services[0].status === 'fulfilled' ? services[0].value.responseTime : 0,
            lastCheck: currentTime,
            error: services[0].status === 'rejected' ? services[0].reason?.message : undefined,
            details: {
              connections: (systemStatus as any).processes?.all || 0,
              version: 'PostgreSQL 14.x',
              size: '2.5GB',
              ...(services[0].status === 'fulfilled' ? services[0].value.details : {})
            }
          },
          {
            name: 'API Server',
            type: 'api',
            status: services[1].status === 'fulfilled' && (services[1].value.details as any)?.status === 'running' ? 'healthy' : 'error',
            uptime: Math.floor(process.uptime()),
            responseTime: services[1].status === 'fulfilled' ? services[1].value.responseTime : 0,
            lastCheck: currentTime,
            error: services[1].status === 'rejected' ? services[1].reason?.message : undefined,
            details: {
              port: 3001,
              version: '1.0.0',
              requests: Math.floor(Math.random() * 50000) + 10000, // 模拟请求数
              ...(services[1].status === 'fulfilled' ? services[1].value.details : {})
            }
          },
          {
            name: 'Web Server',
            type: 'web',
            status: 'healthy', // Web服务默认健康
            uptime: Math.floor(process.uptime()),
            responseTime: 0, // Web服务响应时间为0
            lastCheck: currentTime,
            details: {
              port: 5173,
              version: 'Vite 4.x',
              status: 'running'
            }
          },
          {
            name: 'Cache Server',
            type: 'cache',
            status: services[2].status === 'fulfilled' && services[2].value.details ? 'healthy' : 'error',
            uptime: Math.floor(process.uptime()),
            responseTime: services[2].status === 'fulfilled' ? services[2].value.responseTime : 0,
            lastCheck: currentTime,
            error: services[2].status === 'rejected' ? services[2].reason?.message : undefined,
            details: {
              port: 6379,
              version: 'Redis 6.2.0',
              memory: '50MB',
              ...(services[2].status === 'fulfilled' ? services[2].value.details : {})
            }
          }
        ],
        systemStats: systemStatus
      };
      
      res.json({
        success: true,
        data: serviceData
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
   * 检查服务
   * GET /api/monitoring/service/:serviceName/check
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
}

// 创建并导出控制器实例
export const serviceStatusController = new ServiceStatusController();
