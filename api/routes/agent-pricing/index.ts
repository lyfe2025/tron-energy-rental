/**
 * 代理商价格配置主路由文件
 * 整合所有路由和中间件
 */
import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
    batchSetConfigs,
    createConfig,
    deleteConfig,
    getAgentConfigs,
    getConfigs,
    getLevelConfigs,
    getLevelStats,
    updateConfig
} from './controllers/agentPricingController.js';
import {
    logOperation,
    rateLimit,
    validateActiveAgent,
    validateBatchOperation,
    validateConfigExists,
    validatePriceData
} from './middleware/agentPricingMiddleware.js';

const router: Router = Router();

// 应用基础中间件
router.use(authenticateToken); // 所有路由都需要认证
router.use(rateLimit(100, 60000)); // 限制每分钟100次请求

/**
 * 获取代理商价格配置列表
 * GET /api/agent-pricing
 */
router.get(
  '/',
  logOperation('获取配置列表'),
  getConfigs
);

/**
 * 获取特定代理商的价格配置
 * GET /api/agent-pricing/agent/:agentId
 */
router.get(
  '/agent/:agentId',
  logOperation('获取代理商配置'),
  validateActiveAgent,
  getAgentConfigs
);

/**
 * 创建代理商价格配置
 * POST /api/agent-pricing
 */
router.post(
  '/',
  logOperation('创建配置'),
  validatePriceData,
  createConfig
);

/**
 * 更新代理商价格配置
 * PUT /api/agent-pricing/:id
 */
router.put(
  '/:id',
  logOperation('更新配置'),
  validateConfigExists,
  validatePriceData,
  updateConfig
);

/**
 * 删除代理商价格配置
 * DELETE /api/agent-pricing/:id
 */
router.delete(
  '/:id',
  logOperation('删除配置'),
  validateConfigExists,
  deleteConfig
);

/**
 * 获取代理商等级价格配置
 * GET /api/agent-pricing/levels
 */
router.get(
  '/levels',
  logOperation('获取等级配置'),
  getLevelConfigs
);

/**
 * 批量设置代理商价格配置
 * POST /api/agent-pricing/batch
 */
router.post(
  '/batch',
  logOperation('批量设置配置'),
  validateBatchOperation,
  validatePriceData,
  batchSetConfigs
);

/**
 * 获取代理商等级价格配置统计
 * GET /api/agent-pricing/level-stats
 */
router.get(
  '/level-stats',
  logOperation('获取等级统计'),
  getLevelStats
);

// 错误处理中间件
router.use((error: any, req: any, res: any, next: any) => {
  console.error('代理商价格配置路由错误:', error);
  
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

export default router;
