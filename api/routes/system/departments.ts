/**
 * 部门管理API路由
 * 处理部门的CRUD操作和树形结构管理
 */

import { Router, type Request, type Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../../middleware/auth.ts';
import { logOperation, requirePermission } from '../../middleware/rbac.ts';
import { handleValidationErrors } from '../../middleware/validation.ts';
import { DepartmentService } from '../../services/system/department.ts';

const router: Router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取部门树形列表
 * GET /api/system/departments
 */
router.get('/', [
  requirePermission('system:department:list'),
  query('status').optional().isIn(['0', '1']).withMessage('状态必须是0或1'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const departments = await DepartmentService.getDepartmentTree({
      status: status ? Number(status) : undefined
    });

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('获取部门列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取部门列表失败'
    });
  }
});



/**
 * 获取部门选项（用于下拉选择）
 * GET /api/system/departments/options
 */
router.get('/options', [
  requirePermission('system:dept:list'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    // 获取所有部门（包括启用和禁用的）
    const departments = await DepartmentService.getDepartmentTree();
    
    // 构建部门选项
    const buildOptions = (depts: any[], level = 0): any[] => {
      const options: any[] = [];
      
      depts.forEach(dept => {
        options.push({
          id: dept.id,
          name: '　'.repeat(level) + dept.name,
          parent_id: dept.parent_id,
          level,
          disabled: dept.status === 0  // 状态为0时禁用
        });
        
        if (dept.children && dept.children.length > 0) {
          options.push(...buildOptions(dept.children, level + 1));
        }
      });
      
      return options;
    };
    
    // 先构建树形结构
    const departmentMap = new Map();
    const rootDepartments: any[] = [];
    
    departments.forEach(dept => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });
    
    departments.forEach(dept => {
      const node = departmentMap.get(dept.id);
      if (dept.parent_id && departmentMap.has(dept.parent_id)) {
        const parent = departmentMap.get(dept.parent_id);
        parent.children.push(node);
      } else {
        rootDepartments.push(node);
      }
    });
    
    // 排序
    const sortNodes = (nodes: any[]) => {
      nodes.sort((a, b) => a.sort_order - b.sort_order);
      nodes.forEach(node => {
        if (node.children?.length) {
          sortNodes(node.children);
        }
      });
    };
    
    sortNodes(rootDepartments);
    
    const options = buildOptions(rootDepartments);
    
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('获取部门选项失败:', error);
    res.status(500).json({
      success: false,
      error: '获取部门选项失败'
    });
  }
});

/**
 * 获取部门详情
 * GET /api/system/departments/:id
 */
router.get('/:id', [
  requirePermission('system:dept:list'),
  param('id').isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const department = await DepartmentService.getDepartmentById(Number(id));
    
    if (!department) {
      return res.status(404).json({
        success: false,
        error: '部门不存在'
      });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('获取部门详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取部门详情失败'
    });
  }
});

/**
 * 创建部门
 * POST /api/system/departments
 */
router.post('/', [
  requirePermission('system:dept:add'),
  logOperation('创建部门'),
  body('name').isString().isLength({ min: 1, max: 50 }).withMessage('部门名称长度必须在1-50之间'),
  body('code').isString().isLength({ min: 1, max: 50 }).withMessage('部门编码长度必须在1-50之间'),
  body('parent_id').optional().isInt({ min: 1 }).withMessage('上级部门ID必须是正整数'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('status').optional().isIn([0, 1]).withMessage('状态必须是0或1'),
  body('description').optional().isString().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const departmentData = req.body;
    const department = await DepartmentService.createDepartment(departmentData);

    res.status(201).json({
      success: true,
      data: department,
      message: '部门创建成功'
    });
  } catch (error) {
    console.error('创建部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建部门失败'
    });
  }
});

/**
 * 更新部门
 * PUT /api/system/departments/:id
 */
router.put('/:id', [
  requirePermission('system:dept:edit'),
  logOperation('更新部门'),
  param('id').isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  body('name').optional().isString().isLength({ min: 1, max: 50 }).withMessage('部门名称长度必须在1-50之间'),
  body('code').optional().isString().isLength({ min: 1, max: 50 }).withMessage('部门编码长度必须在1-50之间'),
  body('parent_id').optional().isInt({ min: 1 }).withMessage('上级部门ID必须是正整数'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数'),
  body('status').optional().isIn([0, 1]).withMessage('状态必须是0或1'),
  body('description').optional().isString().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const department = await DepartmentService.updateDepartment(Number(id), updateData);
    
    if (!department) {
      return res.status(404).json({
        success: false,
        error: '部门不存在'
      });
    }

    res.json({
      success: true,
      data: department,
      message: '部门更新成功'
    });
  } catch (error) {
    console.error('更新部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新部门失败'
    });
  }
});

/**
 * 删除部门
 * DELETE /api/system/departments/:id
 */
router.delete('/:id', [
  requirePermission('system:dept:remove'),
  logOperation('删除部门'),
  param('id').isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await DepartmentService.deleteDepartment(Number(id));
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '部门不存在或删除失败'
      });
    }

    res.json({
      success: true,
      message: '部门删除成功'
    });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除部门失败'
    });
  }
});

export default router;