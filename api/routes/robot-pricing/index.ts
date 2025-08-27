/**
 * 机器人价格配置主路由文件
 */
import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
    batchSetConfigs,
    copyConfig,
    createConfig,
    deleteConfig,
    getBotConfigs,
    getConfigs,
    updateConfig
} from './controllers/robotPricingController.js';
import {
    logOperation,
    validateActiveBot,
    validateBatchOperation,
    validateConfigExists,
    validatePriceData
} from './middleware/robotPricingMiddleware.js';

const router: Router = Router();

// 应用基础中间件
router.use(authenticateToken);

/**
 * 获取机器人价格配置列表
 * GET /api/robot-pricing
 */
router.get(
  '/',
  logOperation('获取配置列表'),
  getConfigs
);

/**
 * 获取特定机器人的价格配置
 * GET /api/robot-pricing/bot/:botId
 */
router.get(
  '/bot/:botId',
  logOperation('获取机器人配置'),
  validateActiveBot,
  getBotConfigs
);

/**
 * 创建机器人价格配置
 * POST /api/robot-pricing
 */
router.post(
  '/',
  logOperation('创建配置'),
  validatePriceData,
  createConfig
);

/**
 * 更新机器人价格配置
 * PUT /api/robot-pricing/:id
 */
router.put(
  '/:id',
  logOperation('更新配置'),
  validateConfigExists,
  validatePriceData,
  updateConfig
);

/**
 * 删除机器人价格配置
 * DELETE /api/robot-pricing/:id
 */
router.delete(
  '/:id',
  logOperation('删除配置'),
  validateConfigExists,
  deleteConfig
);

/**
 * 批量设置机器人价格配置
 * POST /api/robot-pricing/batch
 */
router.post(
  '/batch',
  logOperation('批量设置配置'),
  validateBatchOperation,
  validatePriceData,
  batchSetConfigs
);

/**
 * 复制机器人价格配置
 * POST /api/robot-pricing/:id/copy
 */
router.post(
  '/:id/copy',
  logOperation('复制配置'),
  validateConfigExists,
  copyConfig
);

// 错误处理中间件
router.use((error: any, req: any, res: any, next: any) => {
  console.error('机器人价格配置路由错误:', error);
  
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

export default router;
