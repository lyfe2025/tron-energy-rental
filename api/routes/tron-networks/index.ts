/**
 * TRON网络配置管理路由主入口
 * 包含：网络配置的增删改查、连接测试、健康检查等功能
 * 
 * 此文件是对原始 tron-networks.ts 文件的安全分离重构版本
 * 保持所有原有功能和API接口不变，仅将代码按功能模块分离以提升可维护性
 */
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/rbac.js';

// 导入各功能模块的控制器
import {
    createNetwork,
    deleteNetwork,
    getNetworkDetails,
    getNetworksList,
    updateNetwork
} from './controllers/NetworkController.js';

import {
    batchHealthCheck,
    testAllNetworks,
    testNetworkConnection
} from './controllers/NetworkTestController.js';

import {
    getBlockInfo,
    getChainParameters,
    getNetworkStats,
    getNodeInfo
} from './controllers/NetworkStatsController.js';

import {
    batchUpdateNetworkStatus,
    toggleNetworkStatus
} from './controllers/NetworkHealthController.js';

const router: Router = Router();

// ==================== 基础CRUD操作路由 ====================
// 网络列表和详情
router.get('/', authenticateToken, requireAdmin, getNetworksList);
router.get('/:id', authenticateToken, requireAdmin, getNetworkDetails);

// 网络创建、更新、删除
router.post('/', authenticateToken, requireAdmin, createNetwork);
router.put('/:id', authenticateToken, requireAdmin, updateNetwork);
router.delete('/:id', authenticateToken, requireAdmin, deleteNetwork);

// ==================== 连接测试相关路由 ====================
// 单个网络连接测试
router.post('/:id/test', authenticateToken, requireAdmin, testNetworkConnection);

// 批量操作
router.post('/test-all', authenticateToken, requireAdmin, testAllNetworks);
router.post('/health-check', authenticateToken, requireAdmin, batchHealthCheck);

// ==================== 状态管理路由 ====================
// 单个网络状态切换
router.patch('/:id/toggle', authenticateToken, requireAdmin, toggleNetworkStatus);

// 批量状态更新
router.put('/batch/status', authenticateToken, requireAdmin, batchUpdateNetworkStatus);

// ==================== 网络统计信息路由 ====================
// 链参数和节点信息
router.get('/:id/chain-parameters', authenticateToken, requireAdmin, getChainParameters);
router.get('/:id/node-info', authenticateToken, requireAdmin, getNodeInfo);
router.get('/:id/block-info', authenticateToken, requireAdmin, getBlockInfo);
router.get('/:id/stats', authenticateToken, requireAdmin, getNetworkStats);

// ==================== TODO: 待实现的功能路由 ====================
// 注意：这些路由在原文件中被注释，保持与原文件一致
// router.get('/:id/energy-pools', authenticateToken, requireAdmin, getNetworkEnergyPools);
// router.post('/:id/associate-accounts', authenticateToken, requireAdmin, batchAssociateAccounts);

export default router;
