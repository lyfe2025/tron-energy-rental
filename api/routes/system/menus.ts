/**
 * 菜单管理API路由
 * 处理菜单的CRUD操作和树形结构管理
 */

import { Router, type Request, type Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken, logOperation, requirePermission } from '../../middleware/rbac.ts';
import { handleValidationErrors } from '../../middleware/validation.ts';
import { MenuService } from '../../services/system/menu.ts';

const router: Router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取菜单树形列表
 * GET /api/system/menus
 */
router.get('/', [
  requirePermission('system:menu:list'),
  query('status').optional().isIn(['0', '1']).withMessage('状态必须是0或1'),
  query('type').optional().isIn(['1', '2', '3']).withMessage('菜单类型必须是1、2或3'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;
    const menus = await MenuService.getMenuTree({
      status: status ? Number(status) : undefined,
      type: type ? Number(type) : undefined
    });

    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('获取菜单列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取菜单列表失败'
    });
  }
});

/**
 * 获取用户菜单权限
 * GET /api/system/menus/user-menus
 */
router.get('/user-menus', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [Menu API] 收到菜单请求:', {
      adminId: req.user?.id,
      user: req.user,
      headers: req.headers
    });

    const adminId = req.user?.id;
    if (!adminId) {
      console.error('❌ [Menu API] 用户未登录');
      return res.status(401).json({
        success: false,
        error: '用户未登录'
      });
    }

    console.log('🔍 [Menu API] 开始获取用户菜单，adminId:', adminId);
    const menus = await MenuService.getUserMenus(adminId);
    console.log('✅ [Menu API] 菜单获取成功，数量:', menus.length);

    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('❌ [Menu API] 获取用户菜单失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户菜单失败'
    });
  }
});

/**
 * 获取菜单树形结构
 * GET /api/system/menus/tree
 */
router.get('/tree', [
  requirePermission('system:menu:list'),
  query('status').optional().isIn(['0', '1']).withMessage('状态必须是0或1'),
  query('type').optional().isIn(['1', '2', '3']).withMessage('菜单类型必须是1、2或3'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;
    const menus = await MenuService.getMenuTree({
      status: status ? Number(status) : undefined,
      type: type ? Number(type) : undefined
    });

    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('获取菜单树失败:', error);
    res.status(500).json({
      success: false,
      error: '获取菜单树失败'
    });
  }
});

/**
 * 获取菜单选项
 * GET /api/system/menus/options
 */
router.get('/options', [
  requirePermission('system:menu:view'),
  query('exclude').optional().isInt({ min: 1 }).withMessage('排除的菜单ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { exclude } = req.query;
    const options = await MenuService.getMenuOptions(exclude ? Number(exclude) : undefined);

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('获取菜单选项失败:', error);
    res.status(500).json({
      success: false,
      error: '获取菜单选项失败'
    });
  }
});

/**
 * 获取菜单详情
 * GET /api/system/menus/:id
 */
router.get('/:id', [
  requirePermission('system:menu:view'),
  param('id').isInt({ min: 1 }).withMessage('菜单ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const menu = await MenuService.getMenuById(Number(id));
    
    if (!menu) {
      return res.status(404).json({
        success: false,
        error: '菜单不存在'
      });
    }

    res.json({
      success: true,
      data: menu
    });
  } catch (error) {
    console.error('获取菜单详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取菜单详情失败'
    });
  }
});

/**
 * 创建菜单
 * POST /api/system/menus
 */
router.post('/', [
  requirePermission('system:menu:create'),
  logOperation('创建菜单'),
  body('name').isString().isLength({ min: 1, max: 50 }).withMessage('菜单名称长度必须在1-50之间'),
  body('parent_id').optional().isInt({ min: 1 }).withMessage('父菜单ID必须是正整数'),
  body('type').isIn([1, 2, 3]).withMessage('菜单类型必须是1、2或3'),
  body('path').optional().isString().isLength({ max: 200 }).withMessage('路由地址长度不能超过200字符'),
  body('component').optional().isString().isLength({ max: 200 }).withMessage('组件路径长度不能超过200字符'),
  body('permission').optional().isString().isLength({ max: 100 }).withMessage('权限标识长度不能超过100字符'),
  body('icon').optional().isString().isLength({ max: 50 }).withMessage('图标长度不能超过50字符'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('visible').optional().isIn([0, 1]).withMessage('显示状态必须是0或1'),
  body('status').optional().isIn([0, 1]).withMessage('状态必须是0或1'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const menuData = req.body;
    const menu = await MenuService.createMenu(menuData);

    res.status(201).json({
      success: true,
      data: menu,
      message: '菜单创建成功'
    });
  } catch (error) {
    console.error('创建菜单失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建菜单失败'
    });
  }
});

/**
 * 更新菜单
 * PUT /api/system/menus/:id
 */
router.put('/:id', [
  requirePermission('system:menu:update'),
  logOperation('更新菜单'),
  param('id').isInt({ min: 1 }).withMessage('菜单ID必须是正整数'),
  body('name').optional().isString().isLength({ min: 1, max: 50 }).withMessage('菜单名称长度必须在1-50之间'),
  body('parent_id').optional().isInt({ min: 1 }).withMessage('父菜单ID必须是正整数'),
  body('type').optional().isIn([1, 2, 3]).withMessage('菜单类型必须是1、2或3'),
  body('path').optional().isString().isLength({ max: 200 }).withMessage('路由地址长度不能超过200字符'),
  body('component').optional().isString().isLength({ max: 200 }).withMessage('组件路径长度不能超过200字符'),
  body('permission').optional().isString().isLength({ max: 100 }).withMessage('权限标识长度不能超过100字符'),
  body('icon').optional().isString().isLength({ max: 50 }).withMessage('图标长度不能超过50字符'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('visible').optional().isIn([0, 1]).withMessage('显示状态必须是0或1'),
  body('status').optional().isIn([0, 1]).withMessage('状态必须是0或1'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const menu = await MenuService.updateMenu(Number(id), updateData);
    
    if (!menu) {
      return res.status(404).json({
        success: false,
        error: '菜单不存在'
      });
    }

    res.json({
      success: true,
      data: menu,
      message: '菜单更新成功'
    });
  } catch (error) {
    console.error('更新菜单失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新菜单失败'
    });
  }
});

/**
 * 删除菜单
 * DELETE /api/system/menus/:id
 */
router.delete('/:id', [
  requirePermission('system:menu:delete'),
  logOperation('删除菜单'),
  param('id').isInt({ min: 1 }).withMessage('菜单ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await MenuService.deleteMenu(Number(id));
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '菜单不存在或删除失败'
      });
    }

    res.json({
      success: true,
      message: '菜单删除成功'
    });
  } catch (error) {
    console.error('删除菜单失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除菜单失败'
    });
  }
});

export default router;