/**
 * 能量包模块主路由
 * 
 * 整合所有能量包相关的路由和中间件
 * 提供完整的能量包管理API接口
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
    batchUpdatePrices,
    createPackage,
    deletePackage,
    duplicatePackage,
    getPackageById,
    getPackages,
    getPackageStats,
    updatePackage,
    updatePackageStatus
} from './controllers/energyPackagesController.js';
import {
    logPackageOperation,
    rateLimit,
    requireAdmin,
    setCacheHeaders,
    validateBatchPriceRequest,
    validateCreateRequest,
    validatePackageId,
    validatePaginationParams,
    validateSearchParams,
    validateStatusRequest,
    validateUpdateRequest
} from './middleware/energyPackagesMiddleware.js';

const router: Router = Router();

/**
 * 能量包路由定义
 * 公开路由允许所有用户访问，管理操作需要管理员权限
 */

// 获取能量包列表（公开接口）
router.get('/', 
  validatePaginationParams,
  validateSearchParams,
  setCacheHeaders(300),
  logPackageOperation('获取能量包列表'),
  rateLimit(100, 60000),
  getPackages
);

// 获取能量包统计信息
router.get('/stats/overview', 
  authenticateToken,
  requireAdmin,
  setCacheHeaders(300),
  logPackageOperation('获取能量包统计'),
  getPackageStats
);

// 批量更新能量包价格
router.patch('/batch/price', 
  authenticateToken,
  requireAdmin,
  validateBatchPriceRequest,
  logPackageOperation('批量更新价格'),
  batchUpdatePrices
);

// 获取单个能量包详情（公开接口）
router.get('/:id', 
  validatePackageId,
  setCacheHeaders(300),
  logPackageOperation('获取能量包详情'),
  rateLimit(200, 60000),
  getPackageById
);

// 创建新能量包
router.post('/', 
  authenticateToken,
  requireAdmin,
  validateCreateRequest,
  logPackageOperation('创建能量包'),
  createPackage
);

// 更新能量包信息
router.put('/:id', 
  authenticateToken,
  requireAdmin,
  validatePackageId,
  validateUpdateRequest,
  logPackageOperation('更新能量包'),
  updatePackage
);

// 更新能量包状态（启用/禁用）
router.patch('/:id/status', 
  authenticateToken,
  requireAdmin,
  validatePackageId,
  validateStatusRequest,
  logPackageOperation('更新能量包状态'),
  updatePackageStatus
);

// 删除能量包
router.delete('/:id', 
  authenticateToken,
  requireAdmin,
  validatePackageId,
  logPackageOperation('删除能量包'),
  deletePackage
);

// 复制能量包
router.post('/:id/duplicate', 
  authenticateToken,
  requireAdmin,
  validatePackageId,
  logPackageOperation('复制能量包'),
  duplicatePackage
);

export default router;
