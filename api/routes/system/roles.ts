/**
 * 角色管理API路由
 * 处理角色的CRUD操作和权限分配
 */

import { Router, type Request, type Response } from 'express';
import { RoleService } from '../../services/system/role.ts';
import { authenticateToken } from '../../middleware/auth.ts';
import { handleValidationErrors } from '../../middleware/validation.ts';
import { body, query, param } from 'express-validator';
import { requirePermission, logOperation } from '../../middleware/rbac.ts';

const router: Router = Router();

// 应用认证中间件
router.use(authenticateToken);

/**
 * 获取角色选项（用于下拉选择）
 * GET /api/system/roles/options
 */
router.get('/options', [
  requirePermission('system:role:list'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const options = await RoleService.getRoleOptions();
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('获取角色选项失败:', error);
    res.status(500).json({
      success: false,
      error: '获取角色选项失败'
    });
  }
});

/**
 * 获取角色列表
 * GET /api/system/roles
 */
router.get('/', [
  requirePermission('system:role:list'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('type').optional().isIn(['system', 'custom']).withMessage('角色类型必须是system或custom'),
  query('status').optional().isIn(['0', '1']).withMessage('状态必须是0或1'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status
    } = req.query;

    const result = await RoleService.getRoles({
      page: Number(page),
      limit: Number(limit),
      type: type ? Number(type) : undefined,
      status: status ? Number(status) : undefined
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取角色列表失败'
    });
  }
});

/**
 * 获取角色详情
 * GET /api/system/roles/:id
 */
router.get('/:id', [
  requirePermission('system:role:view'),
  param('id').isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = await RoleService.getRoleById(Number(id));
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: '角色不存在'
      });
    }

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('获取角色详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取角色详情失败'
    });
  }
});

/**
 * 获取角色权限
 * GET /api/system/roles/:id/permissions
 */
router.get('/:id/permissions', [
  requirePermission('system:role:permission'),
  param('id').isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const permissions = await RoleService.getRolePermissions(Number(id));

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('获取角色权限失败:', error);
    res.status(500).json({
      success: false,
      error: '获取角色权限失败'
    });
  }
});

/**
 * 创建角色
 * POST /api/system/roles
 */
router.post('/', [
  requirePermission('system:role:create'),
  logOperation('创建角色'),
  body('name').isString().isLength({ min: 1, max: 50 }).withMessage('角色名称长度必须在1-50之间'),
  body('code').isString().isLength({ min: 1, max: 50 }).withMessage('角色编码长度必须在1-50之间'),
  body('type').isIn(['system', 'custom']).withMessage('角色类型必须是system或custom'),
  body('data_scope').isIn([1, 2, 3, 4]).withMessage('数据范围必须是1-4之间的整数'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('status').optional().isIn([0, 1]).withMessage('状态必须是0或1'),
  body('description').optional().isString().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const roleData = req.body;
    const role = await RoleService.createRole(roleData);

    res.status(201).json({
      success: true,
      data: role,
      message: '角色创建成功'
    });
  } catch (error) {
    console.error('创建角色失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建角色失败'
    });
  }
});

/**
 * 更新角色
 * PUT /api/system/roles/:id
 */
router.put('/:id', [
  requirePermission('system:role:update'),
  logOperation('更新角色'),
  param('id').isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  body('name').optional().isString().isLength({ min: 1, max: 50 }).withMessage('角色名称长度必须在1-50之间'),
  body('code').optional().isString().isLength({ min: 1, max: 50 }).withMessage('角色编码长度必须在1-50之间'),
  body('type').optional().isIn(['system', 'custom']).withMessage('角色类型必须是system或custom'),
  body('data_scope').optional().isIn([1, 2, 3, 4]).withMessage('数据范围必须是1-4之间的整数'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('status').optional().isIn([0, 1]).withMessage('状态必须是0或1'),
  body('description').optional().isString().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const role = await RoleService.updateRole(Number(id), updateData);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: '角色不存在'
      });
    }

    res.json({
      success: true,
      data: role,
      message: '角色更新成功'
    });
  } catch (error) {
    console.error('更新角色失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新角色失败'
    });
  }
});

/**
 * 分配角色权限
 * PUT /api/system/roles/:id/permissions
 */
router.put('/:id/permissions', [
  requirePermission('system:role:assign'),
  logOperation('分配角色权限'),
  param('id').isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  body('menu_ids').isArray().withMessage('菜单ID列表必须是数组'),
  body('menu_ids.*').isInt({ min: 1 }).withMessage('菜单ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { menu_ids } = req.body;
    
    await RoleService.assignPermissions(Number(id), menu_ids);

    res.json({
      success: true,
      message: '权限分配成功'
    });
  } catch (error) {
    console.error('分配角色权限失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '分配角色权限失败'
    });
  }
});

/**
 * 删除角色
 * DELETE /api/system/roles/:id
 */
router.delete('/:id', [
  requirePermission('system:role:delete'),
  logOperation('删除角色'),
  param('id').isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await RoleService.deleteRole(Number(id));
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '角色不存在或删除失败'
      });
    }

    res.json({
      success: true,
      message: '角色删除成功'
    });
  } catch (error) {
    console.error('删除角色失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除角色失败'
    });
  }
});

export default router;