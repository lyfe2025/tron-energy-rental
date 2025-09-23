/**
 * 管理员角色管理API路由 - 主入口
 * 整合拆分后的控制器模块
 */
import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../../middleware/rbac.ts';
import { handleValidationErrors } from '../../../middleware/validation.ts';

import { AdminRoleController } from './controllers/AdminRoleController.ts';
import { BatchOperationController } from './controllers/BatchOperationController.ts';
import { PermissionController } from './controllers/PermissionController.ts';
import { adminRoleValidators } from './validators/adminRoleValidators.ts';

const router: Router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// ==================== 管理员角色CRUD路由 ====================

/**
 * 获取管理员角色列表
 * GET /api/system/admin-roles
 */
router.get('/', [
  requirePermission('system:user:list'),
  ...adminRoleValidators.list,
  handleValidationErrors
], AdminRoleController.list);

/**
 * 获取单个管理员信息
 * GET /api/system/admin-roles/admin/:adminId
 */
router.get('/admin/:adminId', [
  requirePermission('system:user:view'),
  ...adminRoleValidators.getAdmin,
  handleValidationErrors
], AdminRoleController.getAdmin);

/**
 * 获取管理员的角色列表
 * GET /api/system/admin-roles/admin/:adminId/roles
 */
router.get('/admin/:adminId/roles', [
  requirePermission('system:user:role:list'),
  ...adminRoleValidators.getAdmin,
  handleValidationErrors
], AdminRoleController.getAdminRoles);

/**
 * 分配角色给管理员
 * POST /api/system/admin-roles
 */
router.post('/', [
  requirePermission('system:user:role:assign'),
  ...adminRoleValidators.assign,
  handleValidationErrors
], AdminRoleController.assignRoles);

/**
 * 移除管理员角色
 * DELETE /api/system/admin-roles
 */
router.delete('/', [
  requirePermission('system:user:role:remove'),
  ...adminRoleValidators.removeRole,
  handleValidationErrors
], AdminRoleController.removeRole);

// ==================== 批量操作路由 ====================

/**
 * 批量分配角色
 * POST /api/system/admin-roles/batch
 */
router.post('/batch', [
  requirePermission('system:user:role:batch'),
  ...adminRoleValidators.batchAssign,
  handleValidationErrors
], BatchOperationController.batchAssign);

/**
 * 导出角色分配数据
 * GET /api/system/admin-roles/export
 */
router.get('/export', [
  requirePermission('system:user:role:export')
], BatchOperationController.exportData);

/**
 * 导入角色分配数据
 * POST /api/system/admin-roles/import
 */
router.post('/import', [
  requirePermission('system:user:role:import')
  // 这里需要添加文件上传中间件
], BatchOperationController.importData);

// ==================== 权限和配置路由 ====================

/**
 * 获取统计信息
 * GET /api/system/admin-roles/stats
 */
router.get('/stats', [
  requirePermission('system:user:role:stats')
], PermissionController.getStats);

/**
 * 获取操作历史记录
 * GET /api/system/admin-roles/history
 */
router.get('/history', [
  requirePermission('system:user:role:history'),
  ...adminRoleValidators.history,
  handleValidationErrors
], PermissionController.getHistory);

/**
 * 获取角色选项列表
 * GET /api/system/admin-roles/role-options
 */
router.get('/role-options', [
  requirePermission('system:role:list')
], PermissionController.getRoleOptions);

/**
 * 获取管理员选项列表
 * GET /api/system/admin-roles/admin-options
 */
router.get('/admin-options', [
  requirePermission('system:user:list')
], PermissionController.getAdminOptions);

/**
 * 获取配置信息
 * GET /api/system/admin-roles/config
 */
router.get('/config', [
  requirePermission('system:user:role:config')
], PermissionController.getConfig);

/**
 * 更新配置信息
 * PUT /api/system/admin-roles/config
 */
router.put('/config', [
  requirePermission('system:user:role:config:update'),
  ...adminRoleValidators.updateConfig,
  handleValidationErrors
], PermissionController.updateConfig);

/**
 * 检查角色分配冲突
 * POST /api/system/admin-roles/check-conflicts
 */
router.post('/check-conflicts', [
  requirePermission('system:user:role:assign'),
  ...adminRoleValidators.checkConflicts,
  handleValidationErrors
], PermissionController.checkConflicts);

// ==================== 审批相关路由 ====================

/**
 * 获取审批列表
 * GET /api/system/admin-roles/approvals
 */
router.get('/approvals', [
  requirePermission('system:user:role:approval:list')
], BatchOperationController.getApprovals);

/**
 * 处理审批
 * POST /api/system/admin-roles/approvals/:id/process
 */
router.post('/approvals/:id/process', [
  requirePermission('system:user:role:approval:process'),
  ...adminRoleValidators.processApproval,
  handleValidationErrors
], BatchOperationController.processApproval);

export default router;
