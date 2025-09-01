/**
 * 岗位管理API路由
 * 处理岗位的CRUD操作
 */

import { Router, type Request, type Response } from 'express';
import { PositionService } from '../../services/system/position.js';
import { authenticateToken } from '../../middleware/auth.js';
import { handleValidationErrors } from '../../middleware/validation.js';
import { body, query, param } from 'express-validator';
import { requirePermission, logOperation } from '../../middleware/rbac.js';

const router: Router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取岗位选项（用于下拉选择）
 * GET /api/system/positions/options
 */
router.get('/options', [
  requirePermission('system:position:list'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const options = await PositionService.getPositionOptions();
    
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('获取岗位选项失败:', error);
    res.status(500).json({
      success: false,
      error: '获取岗位选项失败'
    });
  }
});

/**
 * 获取岗位列表
 * GET /api/system/positions
 */
router.get('/', [
  requirePermission('system:position:list'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('department_id').optional().isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  query('status').optional().isIn(['0', '1']).withMessage('状态必须是0或1'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      department_id,
      status
    } = req.query;

    const result = await PositionService.getPositions({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      department_id: department_id ? Number(department_id) : undefined,
      status: status ? Number(status) : undefined
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取岗位列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取岗位列表失败'
    });
  }
});

/**
 * 获取岗位详情
 * GET /api/system/positions/:id
 */
router.get('/:id', [
  requirePermission('system:position:view'),
  param('id').isInt({ min: 1 }).withMessage('岗位ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const position = await PositionService.getPositionById(Number(id));
    
    if (!position) {
      return res.status(404).json({
        success: false,
        error: '岗位不存在'
      });
    }

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error('获取岗位详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取岗位详情失败'
    });
  }
});

/**
 * 创建岗位
 * POST /api/system/positions
 */
router.post('/', [
  requirePermission('system:position:create'),
  logOperation('创建岗位'),
  body('name').isString().isLength({ min: 1, max: 50 }).withMessage('岗位名称长度必须在1-50之间'),
  body('code').isString().isLength({ min: 1, max: 50 }).withMessage('岗位编码长度必须在1-50之间'),
  body('department_id').isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  body('level').optional().isInt({ min: 1 }).withMessage('岗位级别必须是正整数'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('status').optional().isIn([0, 1]).withMessage('状态必须是0或1'),
  body('description').optional().isString().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const positionData = req.body;
    const position = await PositionService.createPosition(positionData);

    res.status(201).json({
      success: true,
      data: position,
      message: '岗位创建成功'
    });
  } catch (error) {
    console.error('创建岗位失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建岗位失败'
    });
  }
});

/**
 * 更新岗位
 * PUT /api/system/positions/:id
 */
router.put('/:id', [
  requirePermission('system:position:update'),
  logOperation('更新岗位'),
  param('id').isInt({ min: 1 }).withMessage('岗位ID必须是正整数'),
  body('name').optional().isString().isLength({ min: 1, max: 50 }).withMessage('岗位名称长度必须在1-50之间'),
  body('code').optional().isString().isLength({ min: 1, max: 50 }).withMessage('岗位编码长度必须在1-50之间'),
  body('department_id').optional().isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  body('level').optional().isInt({ min: 1 }).withMessage('岗位级别必须是正整数'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('status').optional().isIn([0, 1]).withMessage('状态必须是0或1'),
  body('description').optional().isString().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const position = await PositionService.updatePosition(Number(id), updateData);
    
    if (!position) {
      return res.status(404).json({
        success: false,
        error: '岗位不存在'
      });
    }

    res.json({
      success: true,
      data: position,
      message: '岗位更新成功'
    });
  } catch (error) {
    console.error('更新岗位失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新岗位失败'
    });
  }
});

/**
 * 删除岗位
 * DELETE /api/system/positions/:id
 */
router.delete('/:id', [
  requirePermission('system:position:delete'),
  logOperation('删除岗位'),
  param('id').isInt({ min: 1 }).withMessage('岗位ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await PositionService.deletePosition(Number(id));
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '岗位不存在或删除失败'
      });
    }

    res.json({
      success: true,
      message: '岗位删除成功'
    });
  } catch (error) {
    console.error('删除岗位失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除岗位失败'
    });
  }
});

export default router;