/**
 * 机器人扩展配置管理路由
 * 包含：网络配置、webhook配置、消息模板、限流设置、安全设置等
 * 重构后的模块化架构，保持原有API接口不变
 */
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../../middleware/auth.ts';
import { ConfigHistoryController } from './controllers/ConfigHistoryController.ts';
import { ExtendedConfigController } from './controllers/ExtendedConfigController.ts';
import { HealthCheckController } from './controllers/HealthCheckController.ts';

const router: Router = Router();

// 注册路由 - 保持原有路径和权限不变
router.get('/:id/extended-config', authenticateToken, requireAdmin, ExtendedConfigController.getBotExtendedConfig);
router.put('/:id/extended-config', authenticateToken, requireAdmin, ExtendedConfigController.updateBotExtendedConfig);
router.post('/:id/health-check', authenticateToken, requireAdmin, HealthCheckController.performHealthCheck);
router.get('/:id/config-history', authenticateToken, requireAdmin, ConfigHistoryController.getBotConfigHistory);

// 导出路由器
export default router;

// 导出所有控制器，支持直接使用
export {
    ConfigHistoryController, ExtendedConfigController,
    HealthCheckController
};

// 导出服务层
    export { ExtendedConfigService } from './services/ExtendedConfigService.ts';

