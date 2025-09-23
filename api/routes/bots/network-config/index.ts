/**
 * 机器人网络配置管理主路由
 * 整合所有网络配置相关的控制器
 */
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../../middleware/auth.ts';

// 导入控制器
import {
    addBotNetwork,
    deleteBotNetwork,
    getBotNetworks,
    updateBotNetwork
} from './controllers/NetworkConfigController.ts';

import {
    setPrimaryNetwork
} from './controllers/NetworkManagementController.ts';

import {
    getBotCurrentNetwork,
    setBotNetwork
} from './controllers/SingleNetworkController.ts';

const router: Router = Router();

// 单网络配置API
router.get('/:id/network', authenticateToken, requireAdmin, getBotCurrentNetwork);
router.put('/:id/network', authenticateToken, requireAdmin, setBotNetwork);

// 原有的多网络配置API（保持向后兼容）
router.get('/:id/networks', authenticateToken, requireAdmin, getBotNetworks);
router.post('/:id/networks', authenticateToken, requireAdmin, addBotNetwork);
router.put('/:id/networks/:networkId', authenticateToken, requireAdmin, updateBotNetwork);
router.delete('/:id/networks/:networkId', authenticateToken, requireAdmin, deleteBotNetwork);
router.patch('/:id/networks/:networkId/primary', authenticateToken, requireAdmin, setPrimaryNetwork);

export default router;
