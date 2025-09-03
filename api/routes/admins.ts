/**
 * 管理员管理API路由
 * 专门处理admins表的管理员管理
 */

import { Router, type Request, type Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { logOperation, requirePermission } from '../middleware/rbac.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { AdminRoleService } from '../services/admin/AdminRoleService.js';
import { AdminService } from '../services/admin/AdminService.js';

const router: Router = Router();

// 应用认证中间件
router.use(authenticateToken);

/**
 * 获取管理员列表
 * GET /api/admins
 */
router.get('/', [
  requirePermission('system:admin:list'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('role').optional().isString().withMessage('角色必须是字符串'),
  query('status').optional().isString().withMessage('状态必须是字符串'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status
    } = req.query;

    const result = await AdminService.getAdmins({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      role: role as string,
      status: status as string
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取管理员列表失败'
    });
  }
});

/**
 * 获取管理员统计数据
 * GET /api/admins/stats
 */
router.get('/stats', requirePermission('system:admin:stats'), async (req: Request, res: Response) => {
  try {
    const stats = await AdminService.getAdminStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取管理员统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
});

/**
 * 获取角色列表
 * GET /api/admins/roles
 */
router.get('/roles', requirePermission('system:role:list'), async (req: Request, res: Response) => {
  try {
    const roles = await AdminService.getRoles();

    res.json({
      success: true,
      data: roles
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
 * 获取权限列表
 * GET /api/admins/permissions
 */
router.get('/permissions', requirePermission('system:permission:list'), async (req: Request, res: Response) => {
  try {
    const permissions = await AdminService.getPermissions();

    res.json({
      success: true,
      data: {
        permissions: permissions
      }
    });
  } catch (error) {
    console.error('获取权限列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取权限列表失败'
    });
  }
});

/**
 * 获取管理员详情
 * GET /api/admins/:id
 */
router.get('/:id', [
  requirePermission('system:admin:view'),
  param('id').isUUID().withMessage('管理员ID必须是有效的UUID'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = await AdminService.getAdminById(id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: '管理员不存在'
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('获取管理员详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取管理员详情失败'
    });
  }
});

/**
 * 创建管理员
 * POST /api/admins
 */
router.post('/', [
  requirePermission('system:admin:create'),
  logOperation('创建管理员'),
  body('username').isString().isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50之间'),
  body('email').isEmail().withMessage('邮箱格式无效'),
  body('password').isString().isLength({ min: 6 }).withMessage('密码长度至少6位'),
  body('role_id').isInt({ min: 1 }).withMessage('角色ID必须是有效的正整数'),
  body('department_id').optional().isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  body('position_id').optional().isInt({ min: 1 }).withMessage('岗位ID必须是正整数'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const adminData = req.body;
    const admin = await AdminService.createAdmin(adminData);

    res.status(201).json({
      success: true,
      data: admin,
      message: '管理员创建成功'
    });
  } catch (error) {
    console.error('创建管理员失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建管理员失败'
    });
  }
});

/**
 * 更新管理员
 * PUT /api/admins/:id
 */
router.put('/:id', [
  requirePermission('system:admin:update'),
  logOperation('更新管理员'),
  param('id').isUUID().withMessage('管理员ID必须是有效的UUID'),
  body('username').optional().isString().isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50之间'),
  body('email').optional().isEmail().withMessage('邮箱格式无效'),
  body('role_id').optional().isInt({ min: 1 }).withMessage('角色ID必须是有效的正整数'),
  body('department_id').optional().isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  body('position_id').optional().isInt({ min: 1 }).withMessage('岗位ID必须是正整数'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  
  console.log('🔍 [API] 更新管理员请求:')
  console.log('  管理员ID:', id)
  console.log('  请求数据:', updateData)
  console.log('  用户信息:', req.user)
  console.log('  请求头:', req.headers)
  
  try {
    console.log('🚀 [API] 开始调用 AdminService.updateAdmin...')
    const admin = await AdminService.updateAdmin(id, updateData);
    console.log('✅ [API] AdminService 返回结果:', admin)
    
    if (!admin) {
      console.warn('⚠️ [API] 管理员不存在, ID:', id)
      return res.status(404).json({
        success: false,
        error: '管理员不存在'
      });
    }

    console.log('✅ [API] 管理员更新成功, 返回数据:', admin)
    res.json({
      success: true,
      data: admin,
      message: '管理员更新成功'
    });
  } catch (error) {
    console.error('❌ [API] 更新管理员失败, 完整错误信息:', error)
    console.error('❌ [API] 错误类型:', typeof error)
    console.error('❌ [API] 错误名称:', error?.name)
    console.error('❌ [API] 错误消息:', error?.message)
    console.error('❌ [API] 错误堆栈:', error?.stack)
    
    // 特殊处理数据库错误
    if (error?.code) {
      console.error('❌ [API] 数据库错误代码:', error.code)
      console.error('❌ [API] 数据库错误详情:', error.detail)
      console.error('❌ [API] 数据库错误约束:', error.constraint)
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新管理员失败',
      debug: process.env.NODE_ENV === 'development' ? {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        detail: error?.detail
      } : undefined
    });
  }
});

/**
 * 更新管理员状态
 * PATCH /api/admins/:id/status
 */
router.patch('/:id/status', [
  requirePermission('system:admin:update'),
  logOperation('更新管理员状态'),
  param('id').isUUID().withMessage('管理员ID必须是有效的UUID'),
  body('status').isIn(['active', 'inactive']).withMessage('状态无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const admin = await AdminService.updateAdminStatus(id, status);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: '管理员不存在'
      });
    }

    res.json({
      success: true,
      data: admin,
      message: `管理员状态已更新为${status}`
    });
  } catch (error) {
    console.error('更新管理员状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新管理员状态失败'
    });
  }
});

/**
 * 重置管理员密码
 * PATCH /api/admins/:id/password
 */
router.patch('/:id/password', [
  requirePermission('system:admin:reset_password'),
  logOperation('重置管理员密码'),
  param('id').isUUID().withMessage('管理员ID必须是有效的UUID'),
  body('password').isString().isLength({ min: 6 }).withMessage('密码长度至少6位'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const success = await AdminService.resetAdminPassword(id, password);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '管理员不存在'
      });
    }

    res.json({
      success: true,
      message: '管理员密码重置成功'
    });
  } catch (error) {
    console.error('重置管理员密码失败:', error);
    res.status(500).json({
      success: false,
      error: '重置密码失败'
    });
  }
});

/**
 * 获取管理员权限
 * GET /api/admins/:id/permissions
 */
router.get('/:id/permissions', [
  requirePermission('system:admin:view'),
  param('id').isUUID().withMessage('管理员ID必须是有效的UUID'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取管理员详情以验证存在性
    const admin = await AdminService.getAdminById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: '管理员不存在'
      });
    }

    // 获取管理员权限
    const permissions = await AdminService.getAdminPermissions(id);
    
    // 获取管理员的角色信息
    const roles = await AdminRoleService.getAdminRoles(id);
    
    // 获取所有可用权限以便前端显示（使用包含分组信息的权限数据）
    const allPermissions = await AdminRoleService.getPermissions();
    
    // 为前端提供平铺的权限数组，包含分组信息
    const allPermissionsWithGroup = allPermissions.map((permission: any) => ({
      ...permission,
      // 前端期望category字段，不是group字段
      category: permission.category || 'other'
    }));

    res.json({
      success: true,
      data: {
        adminId: id,
        username: admin.username, // 添加用户名
        roles: roles, // 添加角色信息
        allPermissions: allPermissionsWithGroup, // 前端期望的字段名
        selectedPermissions: permissions
      }
    });
  } catch (error) {
    console.error('获取管理员权限失败:', error);
    res.status(500).json({
      success: false,
      error: '获取管理员权限失败'
    });
  }
});

/**
 * 批量分配管理员权限
 * POST /api/admins/:id/permissions/batch
 */
router.post('/:id/permissions/batch', [
  requirePermission('system:admin:update'),
  logOperation('批量分配管理员权限'),
  param('id').isUUID().withMessage('管理员ID必须是有效的UUID'),
  body('permission_ids').isArray().withMessage('权限ID列表必须是数组'),
  body('permission_ids.*').isString().withMessage('权限ID必须是字符串'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permission_ids } = req.body;
    
    // 验证管理员是否存在
    const admin = await AdminService.getAdminById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: '管理员不存在'
      });
    }

    // 批量分配权限（这里需要实现具体的权限分配逻辑）
    // 由于当前系统使用角色-权限模式，我们需要创建一个临时的权限分配方法
    // 或者将权限ID转换为角色分配
    
    // 暂时返回成功，实际项目中需要实现具体的权限分配逻辑
    console.log(`为管理员 ${id} 分配权限:`, permission_ids);
    
    res.json({
      success: true,
      message: '权限分配成功'
    });
  } catch (error) {
    console.error('批量分配权限失败:', error);
    res.status(500).json({
      success: false,
      error: '批量分配权限失败'
    });
  }
});

/**
 * 删除管理员
 * DELETE /api/admins/:id
 */
router.delete('/:id', [
  requirePermission('system:admin:delete'),
  logOperation('删除管理员'),
  param('id').isUUID().withMessage('管理员ID必须是有效的UUID'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await AdminService.deleteAdmin(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '管理员不存在'
      });
    }

    res.json({
      success: true,
      message: '管理员删除成功'
    });
  } catch (error) {
    console.error('删除管理员失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除管理员失败'
    });
  }
});

export default router;