/**
 * 权限管理API路由
 * 处理权限的查询和树形结构管理
 */

import { Router, type Request, type Response } from 'express';
import { MenuService } from '../../services/system/menu.ts';
import { authenticateToken } from '../../middleware/auth.ts';
import { handleValidationErrors } from '../../middleware/validation.ts';
import { query } from 'express-validator';
import { requirePermission } from '../../middleware/rbac.ts';

const router: Router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取权限树形结构
 * GET /api/system/permissions/tree
 */
router.get('/tree', [
  requirePermission('system:role:view'),
  query('status').optional().isIn(['0', '1']).withMessage('状态必须是0或1'),
  query('type').optional().isIn(['1', '2', '3']).withMessage('菜单类型必须是1、2或3'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;
    const permissions = await MenuService.getMenuTree({
      status: status ? Number(status) : undefined,
      type: type ? Number(type) : undefined
    });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('获取权限树失败:', error);
    res.status(500).json({
      success: false,
      error: '获取权限树失败'
    });
  }
});

/**
 * 获取权限选项
 * GET /api/system/permissions/options
 */
router.get('/options', [
  requirePermission('system:role:view'),
  query('status').optional().isIn(['0', '1']).withMessage('状态必须是0或1'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const permissions = await MenuService.getMenuTree({
      status: status ? Number(status) : undefined
    });
    // 转换为选项格式
    const options = permissions.map((permission: any) => ({
      id: permission.id,
      name: permission.name,
      code: permission.code
    }));
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('获取权限选项失败:', error);
    res.status(500).json({
      success: false,
      error: '获取权限选项失败'
    });
  }
});

/**
 * 获取所有权限列表
 * GET /api/system/permissions
 */
router.get('/', [
  requirePermission('system:role:view'),
  query('status').optional().isIn(['0', '1']).withMessage('状态必须是0或1'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const permissions = await MenuService.getMenuTree({
      status: status ? Number(status) : undefined
    });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('获取权限列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取权限列表失败'
    });
  }
});

export default router;