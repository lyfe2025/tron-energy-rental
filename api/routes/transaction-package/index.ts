import { Router } from 'express';
import dailyFeeRouter from './daily-fee';
import delegationRouter from './delegation';
import energyUsageRouter from './energy-usage';
import monitoringRouter from './monitoring';
import ordersRouter from './orders';

const router: Router = Router();

/**
 * 笔数套餐路由聚合器
 * 
 * 路由结构：
 * - /orders - 订单相关路由
 * - /delegation - 代理相关路由  
 * - /monitoring - 监控相关路由
 * - /daily-fee - 日费相关路由
 * - /energy-usage - 能量使用相关路由
 */

// 订单相关路由
router.use('/orders', ordersRouter);

// 代理相关路由（包含单笔代理、批量代理等）
router.use('/', delegationRouter);

// 监控相关路由（能量监听服务）
router.use('/', monitoringRouter);

// 日费相关路由（占费服务）
router.use('/daily-fee', dailyFeeRouter);

// 能量使用相关路由
router.use('/', energyUsageRouter);

/**
 * 健康检查端点
 * GET /api/transaction-package/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'transaction-package',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    message: 'Transaction package service is healthy'
  });
});

/**
 * 服务信息端点
 * GET /api/transaction-package/info
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'transaction-package',
      description: 'TRON energy rental transaction package service',
      features: [
        'Order management',
        'Energy delegation',
        'Usage monitoring', 
        'Daily fee processing',
        'Batch operations'
      ],
      endpoints: {
        orders: '/orders',
        delegation: '/delegate, /batch-delegation, /pending-delegations, /trigger-next-delegation',
        monitoring: '/energy-monitor/*',
        dailyFee: '/daily-fee/*',
        energyUsage: '/energy-usage/*'
      },
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    },
    message: 'Transaction package service information'
  });
});

export default router;
