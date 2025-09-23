/**
 * 统计分析主路由文件
 */
import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.ts';
import {
    getBots,
    getBotStatus,
    getOrders,
    getOverview,
    getRealtime,
    getRevenue,
    getUsers
} from './controllers/statisticsController.ts';
import {
    logAccess,
    requireAdmin,
    setCacheHeaders,
    validateStatsParams
} from './middleware/statisticsMiddleware.ts';

const router: Router = Router();

// 应用基础中间件
router.use(authenticateToken);
router.use(requireAdmin); // 所有统计接口都需要管理员权限

/**
 * 获取总览统计数据
 * GET /api/statistics/overview
 */
router.get(
  '/overview',
  logAccess('总览统计'),
  validateStatsParams,
  setCacheHeaders(300), // 缓存5分钟
  getOverview
);

/**
 * 获取订单统计数据
 * GET /api/statistics/orders
 */
router.get(
  '/orders',
  logAccess('订单统计'),
  validateStatsParams,
  setCacheHeaders(300),
  getOrders
);

/**
 * 获取收入统计数据
 * GET /api/statistics/revenue
 */
router.get(
  '/revenue',
  logAccess('收入统计'),
  validateStatsParams,
  setCacheHeaders(300),
  getRevenue
);

/**
 * 获取用户活跃度统计
 * GET /api/statistics/users
 */
router.get(
  '/users',
  logAccess('用户统计'),
  validateStatsParams,
  setCacheHeaders(300),
  getUsers
);

/**
 * 获取机器人使用率统计
 * GET /api/statistics/bots
 */
router.get(
  '/bots',
  logAccess('机器人统计'),
  validateStatsParams,
  setCacheHeaders(300),
  getBots
);

/**
 * 获取实时统计数据
 * GET /api/statistics/realtime
 */
router.get(
  '/realtime',
  logAccess('实时统计'),
  setCacheHeaders(60), // 实时数据缓存1分钟
  getRealtime
);

/**
 * 获取机器人状态统计
 * GET /api/statistics/bot-status
 */
router.get(
  '/bot-status',
  logAccess('机器人状态统计'),
  setCacheHeaders(300),
  getBotStatus
);

// 错误处理中间件
router.use((error: any, req: any, res: any, next: any) => {
  console.error('统计分析路由错误:', error);
  
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

export default router;
