/**
 * 在线用户监控控制器
 * 处理在线用户相关的API请求
 */
import express from 'express';
import { MonitoringService } from '../../services/monitoring.ts';
import { logger } from '../../utils/logger.ts';

type Request = express.Request;
type Response = express.Response;

export class OnlineUsersController {
  private monitoringService: MonitoringService;

  constructor() {
    this.monitoringService = new MonitoringService();
  }

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
   * 强制下线用户
   * POST /api/monitoring/online-users/force-logout
   */
  forceLogout = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const adminId = req.user?.id;
      
      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '缺少用户ID参数'
        });
      }
      
      const result = await this.monitoringService.forceLogoutUserById(userId);
      
      // 记录操作日志
      try {
        await this.monitoringService.logSystemAction(adminId, 'force_logout', {
          targetUserId: userId,
          affectedSessions: result.loggedOutSessions
        });
      } catch (logError) {
        logger.error('记录强制下线操作日志失败:', logError);
        // 不影响主要功能，继续执行
      }
      
      res.json({
        success: true,
        message: '用户已强制下线',
        data: {
          userId,
          affectedSessions: result.loggedOutSessions
        }
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
}

// 创建并导出控制器实例
export const onlineUsersController = new OnlineUsersController();
