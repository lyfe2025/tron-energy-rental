/**
 * 机器人统计路由
 */
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../../middleware/auth.js';
import {
    getAllBotStatistics,
    getBotOrders,
    getBotStatistics,
    getBotUsers
} from './BotStatisticsController.js';

const router = Router();

// 应用认证中间件
router.use(authenticateToken);
router.use(requireAdmin);

// 路由定义
router.get('/statistics', getAllBotStatistics);
router.get('/:id/statistics', getBotStatistics);
router.get('/:id/users', getBotUsers);
router.get('/:id/orders', getBotOrders);

export default router;
