import { Router } from 'express';
import orderCrudRoutes from './order-crud';
import orderLifecycleRoutes from './order-lifecycle';
import orderPaymentRoutes from './order-payment';
import orderSearchRoutes from './order-search';
import orderStatsRoutes from './order-stats';

const router: Router = Router();

// 注册所有子路由模块
// 注意：具体路由必须在动态路由之前注册，避免路由冲突

// 搜索相关路由（具体路由：/search）
router.use('/', orderSearchRoutes);

// 统计相关路由（具体路由：/stats）
router.use('/', orderStatsRoutes);

// 生命周期管理路由（具体路由：/active, /process-expired等）
router.use('/', orderLifecycleRoutes);

// 支付相关路由（具体路由：/:id/payment-confirmed）
router.use('/', orderPaymentRoutes);

// 基本CRUD操作路由（包含动态路由：/:id）
// 必须放在最后，以避免捕获具体路由
router.use('/', orderCrudRoutes);

export default router;
