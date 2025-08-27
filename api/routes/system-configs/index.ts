/**
 * 系统配置模块主路由
 * 
 * 整合所有系统配置相关的路由和中间件
 * 提供完整的系统配置管理API接口
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
    batchUpdateConfigs,
    createConfig,
    deleteConfig,
    getConfigByKey,
    getConfigCategories,
    getConfigHistory,
    getConfigs,
    getConfigStats,
    resetConfig,
    updateConfig,
    validateConfigValue
} from './controllers/systemConfigsController.js';
import {
    logConfigOperation,
    rateLimit,
    requireAdmin,
    setCacheHeaders,
    validateBatchUpdateRequest,
    validateConfigAccess,
    validateConfigEditable,
    validateConfigExists,
    validateConfigKey,
    validateCreateRequest,
    validatePaginationParams,
    validateSearchParams,
    validateUpdateRequest
} from './middleware/systemConfigsMiddleware.js';

const router: Router = Router();

/**
 * 系统配置路由定义
 * 所有路由都需要身份验证，管理操作需要管理员权限
 */

// 获取系统配置列表
router.get('/', 
  authenticateToken,
  validatePaginationParams,
  validateSearchParams,
  setCacheHeaders(300),
  logConfigOperation('获取配置列表'),
  rateLimit(50, 60000),
  getConfigs
);

// 获取配置分类列表
router.get('/categories/list', 
  authenticateToken,
  setCacheHeaders(600),
  logConfigOperation('获取配置分类'),
  getConfigCategories
);

// 获取配置统计信息
router.get('/stats', 
  authenticateToken,
  setCacheHeaders(300),
  logConfigOperation('获取配置统计'),
  getConfigStats
);

// 验证配置值格式（工具接口）
router.post('/validate', 
  authenticateToken,
  logConfigOperation('验证配置值'),
  validateConfigValue
);

// 批量更新配置
router.put('/batch/update', 
  authenticateToken,
  requireAdmin,
  validateBatchUpdateRequest,
  logConfigOperation('批量更新配置'),
  batchUpdateConfigs
);

// 获取单个配置
router.get('/:key', 
  authenticateToken,
  validateConfigKey,
  validateConfigAccess,
  setCacheHeaders(300),
  logConfigOperation('获取单个配置'),
  rateLimit(100, 60000),
  getConfigByKey
);

// 创建配置
router.post('/', 
  authenticateToken,
  requireAdmin,
  validateCreateRequest,
  logConfigOperation('创建配置'),
  createConfig
);

// 更新配置
router.put('/:key', 
  authenticateToken,
  requireAdmin,
  validateConfigKey,
  validateConfigEditable,
  validateUpdateRequest,
  logConfigOperation('更新配置'),
  updateConfig
);

// 删除配置
router.delete('/:key', 
  authenticateToken,
  requireAdmin,
  validateConfigKey,
  validateConfigEditable,
  logConfigOperation('删除配置'),
  deleteConfig
);

// 重置配置为默认值
router.post('/:key/reset', 
  authenticateToken,
  requireAdmin,
  validateConfigKey,
  validateConfigEditable,
  logConfigOperation('重置配置'),
  resetConfig
);

// 获取配置历史记录
router.get('/:key/history', 
  authenticateToken,
  requireAdmin,
  validateConfigKey,
  validateConfigExists,
  validatePaginationParams,
  setCacheHeaders(60),
  logConfigOperation('获取配置历史'),
  getConfigHistory
);

export default router;
