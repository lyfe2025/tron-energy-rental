/**
 * 系统配置模块主路由
 * 
 * 整合所有系统配置相关的路由和中间件
 * 提供完整的系统配置管理API接口
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { query } from '../../database/index.js';
import { authenticateToken } from '../../middleware/auth.js';
import { auditConfigChanges, checkConfigPermission, validateConfig } from '../../middleware/configManagement.js';
import {
  batchUpdateConfigs,
  createConfig,
  deleteConfig,
  getAllSettingsConfigs,
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
  validateConfigKeyQuery,
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


// 简化的资源消耗配置路由
import simpleResourceConsumptionRoutes from './simpleResourceConsumption.js';
router.use('/configs', simpleResourceConsumptionRoutes);

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

// 获取特定键的配置值（用于前端API调用）
router.get('/values', 
  authenticateToken,
  setCacheHeaders(300),
  logConfigOperation('获取特定配置'),
  rateLimit(100, 60000),
  async (req: Request, res: Response) => {
    try {
      const keys = req.query.keys as string;
      if (!keys) {
        res.status(400).json({
          success: false,
          message: '缺少keys参数'
        });
        return;
      }

      const keyArray = keys.split(',').map(k => k.trim());
      const result = await query(
        `SELECT config_key, config_value FROM system_configs 
         WHERE config_key = ANY($1)`,
        [keyArray]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('获取配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取配置失败'
      });
    }
  }
);

// 获取所有设置相关的配置（用于设置页面）
router.get('/all-settings', 
  authenticateToken,
  setCacheHeaders(300),
  logConfigOperation('获取所有设置配置'),
  rateLimit(20, 60000),
  getAllSettingsConfigs
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
  checkConfigPermission('system_configs'),
  validateBatchUpdateRequest,
  auditConfigChanges('system_config'),
  logConfigOperation('批量更新配置'),
  batchUpdateConfigs
);

// 获取单个配置
router.get('/get', 
  authenticateToken,
  validateConfigKeyQuery,
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
  checkConfigPermission('system_configs'),
  validateCreateRequest,
  validateConfig('system_config'),
  auditConfigChanges('system_config'),
  logConfigOperation('创建配置'),
  createConfig
);

// 更新配置
router.put('/update', 
  authenticateToken,
  requireAdmin,
  checkConfigPermission('system_configs'),
  validateConfigKeyQuery,
  validateConfigEditable,
  validateUpdateRequest,
  validateConfig('system_config'),
  auditConfigChanges('system_config'),
  logConfigOperation('更新配置'),
  updateConfig
);

// 删除配置
router.delete('/delete', 
  authenticateToken,
  requireAdmin,
  checkConfigPermission('system_configs'),
  validateConfigKeyQuery,
  validateConfigEditable,
  auditConfigChanges('system_configs'),
  logConfigOperation('删除配置'),
  deleteConfig
);

// 重置配置为默认值
router.post('/reset', 
  authenticateToken,
  requireAdmin,
  validateConfigKeyQuery,
  validateConfigEditable,
  logConfigOperation('重置配置'),
  resetConfig
);

// 获取配置历史记录
router.get('/history', 
  authenticateToken,
  requireAdmin,
  validateConfigKeyQuery,
  validateConfigExists,
  validatePaginationParams,
  setCacheHeaders(60),
  logConfigOperation('获取配置历史'),
  getConfigHistory
);

export default router;
