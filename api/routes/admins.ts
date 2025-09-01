/**
 * 管理员管理API路由
 * 专门处理admins表的管理员管理
 */

import { Router, type Request, type Response } from 'express';
import { AdminService } from '../services/admin.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors, validatePagination } from '../middleware/validation.js';
import { requirePermission, logOperation } from '../middleware/rbac.js';
import { body, query, param } from 'express-validator';

const router = Router();

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
  body('role').isIn(['super_admin', 'admin', 'operator']).withMessage('角色无效'),
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
  body('role').optional().isIn(['super_admin', 'admin', 'operator']).withMessage('角色无效'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const admin = await AdminService.updateAdmin(id, updateData);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: '管理员不存在'
      });
    }

    res.json({
      success: true,
      data: admin,
      message: '管理员更新成功'
    });
  } catch (error) {
    console.error('更新管理员失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新管理员失败'
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