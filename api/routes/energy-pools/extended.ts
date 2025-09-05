/**
 * 扩展的能量池管理API - 主入口文件
 * 包含：网络关联、批量操作、余额同步、健康检查等新功能
 */
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth.ts';

// 导入各个控制器模块
import {
    getPoolCurrentNetwork,
    getPoolNetworkConfig,
    setPoolNetwork
} from './controllers/NetworkConfigController.ts';

import {
    batchSetPoolsNetwork,
    batchUpdateConfig
} from './controllers/BatchOperationController.ts';

import {
    batchSyncBalances
} from './controllers/SyncController.ts';

import {
    getPoolStatistics,
    performPoolHealthCheck
} from './controllers/HealthController.ts';

const router: Router = Router();

// 单网络配置API（新的简化接口）
router.get('/:id/network', authenticateToken, requireAdmin, getPoolCurrentNetwork);
router.put('/:id/network', authenticateToken, requireAdmin, setPoolNetwork);
router.put('/batch-network', authenticateToken, requireAdmin, batchSetPoolsNetwork);

// 原有的扩展功能API
router.get('/:id/network-config', authenticateToken, requireAdmin, getPoolNetworkConfig);
router.post('/batch-sync', authenticateToken, requireAdmin, batchSyncBalances);
router.put('/batch-config', authenticateToken, requireAdmin, batchUpdateConfig);
router.post('/:id/health-check', authenticateToken, requireAdmin, performPoolHealthCheck);
router.get('/statistics', authenticateToken, requireAdmin, getPoolStatistics);

export default router;
