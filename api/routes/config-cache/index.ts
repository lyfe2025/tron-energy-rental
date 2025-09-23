/**
 * 配置缓存管理API路由 - 模块化版本
 * 提供缓存状态查询、手动清除缓存、配置预热等功能
 */
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth.ts';

// 导入控制器
import {
    clearBatchCache,
    clearBotCache,
    clearNetworkCache,
    clearPoolCache,
    clearSystemCache
} from './controllers/CacheClearController.ts';
import { getCacheStatus } from './controllers/CacheStatusController.ts';
import {
    publishNotification,
    warmupCache
} from './controllers/CacheWarmupController.ts';
import { getConfigHistory } from './controllers/ConfigHistoryController.ts';

const router: Router = Router();

// 缓存状态路由
router.get('/status', authenticateToken, requireAdmin, getCacheStatus);

// 缓存清除路由
router.delete('/bot/:id', authenticateToken, requireAdmin, clearBotCache);
router.delete('/network/:id', authenticateToken, requireAdmin, clearNetworkCache);
router.delete('/pool/:id', authenticateToken, requireAdmin, clearPoolCache);
router.delete('/system', authenticateToken, requireAdmin, clearSystemCache);
router.delete('/batch', authenticateToken, requireAdmin, clearBatchCache);

// 缓存预热和通知路由
router.post('/warmup', authenticateToken, requireAdmin, warmupCache);
router.post('/notify', authenticateToken, requireAdmin, publishNotification);

// 配置历史路由
router.get('/history', authenticateToken, requireAdmin, getConfigHistory);

export default router;
