/**
 * 监控中心路由
 * 处理监控相关的API路由
 */
import { Router } from 'express';
import { monitoringController } from '../controllers/MonitoringController.ts';
import { authenticateToken, requireAdmin } from '../middleware/rbac.ts';

const router: Router = Router();

// 所有监控接口都需要认证
router.use(authenticateToken);

// 监控概览
router.get('/overview', requireAdmin, monitoringController.getOverview);

// 在线用户管理
router.get('/online-users', requireAdmin, monitoringController.getOnlineUsers);
router.post('/online-users/force-logout', requireAdmin, monitoringController.forceLogout);

// 定时任务管理
router.get('/scheduled-tasks', requireAdmin, monitoringController.getScheduledTasks);
router.put('/scheduled-tasks/:taskId', requireAdmin, monitoringController.updateTask);
router.post('/scheduled-tasks/:taskId/pause', requireAdmin, monitoringController.pauseTask);
router.post('/scheduled-tasks/:taskId/resume', requireAdmin, monitoringController.resumeTask);
router.post('/scheduled-tasks/:taskId/execute', requireAdmin, monitoringController.executeTask);
router.delete('/scheduled-tasks/:taskId', requireAdmin, monitoringController.deleteTask);
router.get('/scheduled-tasks/:taskId/logs', requireAdmin, monitoringController.getTaskLogs);

// 数据监控
router.get('/database', requireAdmin, monitoringController.getDatabaseInfo);
router.post('/database/analyze/:tableName', requireAdmin, monitoringController.analyzeTable);

// 服务状态监控
router.get('/service-status', requireAdmin, monitoringController.getServiceStatus);
router.post('/service-status/:serviceName/check', requireAdmin, monitoringController.checkService);

// 缓存状态监控
router.get('/cache-status', requireAdmin, monitoringController.getCacheStatus);
router.post('/cache-status/test-connection', requireAdmin, monitoringController.testCacheConnection);
router.post('/cache-status/clear', requireAdmin, monitoringController.clearCache);
router.delete('/cache-status/keys/:key', requireAdmin, monitoringController.deleteCacheKey);

export default router;