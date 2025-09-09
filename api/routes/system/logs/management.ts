/**
 * 日志管理路由
 * 提供日志轮转、清理和统计功能
 */
import { Router, type Request, type Response } from 'express';
import { LogRotationManager, cleanupOldLogs, appLogger } from '../../../utils/logger.js';
import { authenticateToken, requireAdmin } from '../../../middleware/auth.js';
import type { RouteHandler } from '../../bots/types.js';

const router: Router = Router();

/**
 * 获取日志统计信息
 * GET /api/system/logs/stats
 */
const getLogStats: RouteHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const logManager = LogRotationManager.getInstance();
    const stats = logManager.getLogStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        totalSizeMB: Math.round(stats.totalSize / 1024 / 1024 * 100) / 100,
        oldestLogAge: stats.oldestLog ? Math.floor((Date.now() - stats.oldestLog.getTime()) / (1000 * 60 * 60 * 24)) : null,
        newestLogAge: stats.newestLog ? Math.floor((Date.now() - stats.newestLog.getTime()) / (1000 * 60 * 60 * 24)) : null
      }
    });
  } catch (error: any) {
    appLogger.error('获取日志统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取日志统计失败',
      error: error.message
    });
  }
};

/**
 * 手动触发日志清理
 * POST /api/system/logs/cleanup
 */
const triggerCleanup: RouteHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { botId, daysToKeep = 30 } = req.body;
    
    if (botId) {
      // 清理指定机器人的日志
      await cleanupOldLogs(botId, daysToKeep);
      appLogger.info(`手动清理机器人 ${botId} 的日志完成`);
    } else {
      // 触发全局清理
      const logManager = LogRotationManager.getInstance();
      await (logManager as any).performCleanup(); // 访问私有方法进行清理
      appLogger.info('手动触发全局日志清理完成');
    }
    
    res.json({
      success: true,
      message: '日志清理完成'
    });
  } catch (error: any) {
    appLogger.error('手动日志清理失败:', error);
    res.status(500).json({
      success: false,
      message: '日志清理失败',
      error: error.message
    });
  }
};

/**
 * 获取日志清理配置
 * GET /api/system/logs/config
 */
const getLogConfig: RouteHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        cleanupInterval: 24, // 小时
        retentionPeriod: {
          botLogs: 30, // 天
          appLogs: 14, // 天
          errorLogs: 30 // 天
        },
        maxFileSize: '20MB',
        rotationPattern: 'daily'
      }
    });
  } catch (error: any) {
    appLogger.error('获取日志配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取日志配置失败',
      error: error.message
    });
  }
};

/**
 * 重启日志清理调度器
 * POST /api/system/logs/restart-scheduler
 */
const restartScheduler: RouteHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { intervalHours = 24 } = req.body;
    
    const logManager = LogRotationManager.getInstance();
    logManager.stopCleanupScheduler();
    logManager.startCleanupScheduler(intervalHours);
    
    appLogger.info(`日志清理调度器已重启，间隔: ${intervalHours}小时`);
    
    res.json({
      success: true,
      message: `日志清理调度器已重启，间隔: ${intervalHours}小时`
    });
  } catch (error: any) {
    appLogger.error('重启日志调度器失败:', error);
    res.status(500).json({
      success: false,
      message: '重启日志调度器失败',
      error: error.message
    });
  }
};

// 注册路由
router.get('/stats', authenticateToken, requireAdmin, getLogStats);
router.post('/cleanup', authenticateToken, requireAdmin, triggerCleanup);
router.get('/config', authenticateToken, requireAdmin, getLogConfig);
router.post('/restart-scheduler', authenticateToken, requireAdmin, restartScheduler);

export default router;