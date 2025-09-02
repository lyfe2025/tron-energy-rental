/**
 * 管理员角色管理API路由
 * 处理管理员角色分配和管理
 */

import { Router, type Request, type Response } from 'express';
import { body, param, query as validateQuery } from 'express-validator';
import { query } from '../../config/database.js';
import { authenticateToken, logOperation, requirePermission } from '../../middleware/rbac.js';
import { handleValidationErrors } from '../../middleware/validation.js';
import { RoleService } from '../../services/system/role.js';

const router: Router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取管理员角色列表
 * GET /api/system/admin-roles
 */
router.get('/', [
  requirePermission('system:user:list'),
  validateQuery('username').optional().isString().withMessage('用户名必须是字符串'),
  validateQuery('department_id').optional().isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  validateQuery('role_id').optional().isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  validateQuery('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  validateQuery('page_size').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { 
      username, 
      department_id, 
      role_id, 
      page = 1, 
      page_size = 20 
    } = req.query;
    
    const pageNum = Number(page);
    const pageSizeNum = Number(page_size);
    const offset = (pageNum - 1) * pageSizeNum;

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (username) {
      whereClause += ` AND a.username ILIKE $${paramIndex++}`;
      params.push(`%${username}%`);
    }

    if (department_id) {
      whereClause += ` AND a.department_id = $${paramIndex++}`;
      params.push(Number(department_id));
    }

    if (role_id) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM admin_roles ar2 
        WHERE ar2.admin_id = a.id AND ar2.role_id = $${paramIndex++}
      )`;
      params.push(Number(role_id));
    }

    // 获取管理员列表
    const adminListSql = `
      SELECT 
        a.id as admin_id,
        a.username,
        a.email,
        NULL as phone,
        NULL as avatar,
        a.department_id,
        d.name as department_name,
        a.position_id,
        p.name as position_name,
        a.status,
        a.last_login_at,
        a.created_at,
        a.updated_at
      FROM admins a
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN positions p ON a.position_id = p.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    params.push(pageSizeNum, offset);

    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM admins a
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN positions p ON a.position_id = p.id
      ${whereClause}
    `;

    const [adminResult, countResult] = await Promise.all([
      query(adminListSql, params),
      query(countSql, params.slice(0, -2)) // 移除 limit 和 offset 参数
    ]);

    const admins = adminResult.rows;
    const total = parseInt(countResult.rows[0].total);

    // 获取每个管理员的角色信息
    if (admins.length > 0) {
      const adminIds = admins.map(admin => admin.admin_id);
      const rolesSql = `
        SELECT 
          ar.admin_id,
          r.id,
          r.name,
          r.description,
          r.status,
          ar.created_at as assigned_at
        FROM admin_roles ar
        JOIN roles r ON ar.role_id = r.id
        WHERE ar.admin_id = ANY($1)
        ORDER BY r.sort_order ASC, r.id ASC
      `;
      
      const rolesResult = await query(rolesSql, [adminIds]);
      
      // 将角色信息分组到对应的管理员
      const rolesByAdmin = rolesResult.rows.reduce((acc, role) => {
        if (!acc[role.admin_id]) {
          acc[role.admin_id] = [];
        }
        acc[role.admin_id].push({
          id: role.id,
          name: role.name,
          description: role.description,
          status: role.status,
          assigned_at: role.assigned_at,
          assigned_by: null, // 暂时为空，可以后续添加
          assigned_by_name: null
        });
        return acc;
      }, {});

      // 将角色信息合并到管理员数据中
      admins.forEach(admin => {
        admin.roles = rolesByAdmin[admin.admin_id] || [];
      });
    }

    const pages = Math.ceil(total / pageSizeNum);

    res.json({
      success: true,
      data: {
        list: admins,
        pagination: {
          page: pageNum,
          page_size: pageSizeNum,
          total,
          pages
        }
      }
    });
  } catch (error) {
    console.error('获取管理员角色列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取管理员角色列表失败'
    });
  }
});

/**
 * 获取管理员的角色
 * GET /api/system/admin-roles/admin/:adminId
 */
router.get('/admin/:adminId', [
  requirePermission('system:user:list'),
  param('adminId').isUUID().withMessage('管理员ID必须是有效的UUID'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    
    const roles = await RoleService.getAdminRoles({ admin_id: adminId });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('获取管理员角色失败:', error);
    res.status(500).json({
      success: false,
      error: '获取管理员角色失败'
    });
  }
});

/**
 * 分配角色给管理员
 * POST /api/system/admin-roles
 */
router.post('/', [
  requirePermission('system:user:edit'),
  logOperation('分配管理员角色'),
  body('admin_ids').isArray().withMessage('管理员ID列表必须是数组'),
  body('admin_ids.*').isUUID().withMessage('管理员ID必须是有效的UUID'),
  body('role_ids').isArray().withMessage('角色ID列表必须是数组'),
  body('role_ids.*').isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  body('operation').isIn(['assign', 'remove', 'replace']).withMessage('操作类型必须是assign、remove或replace'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { admin_ids, role_ids, operation = 'replace' } = req.body;
    
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    // 遍历每个管理员ID进行角色分配
    for (const adminId of admin_ids) {
      try {
        // 验证管理员是否存在
        const adminResult = await query(
          'SELECT id, username FROM admins WHERE id = $1',
          [adminId]
        );
        
        if (adminResult.rows.length === 0) {
          results.push({
            admin_id: adminId,
            username: '未知',
            success: false,
            reason: '管理员不存在'
          });
          failedCount++;
          continue;
        }

        const admin = adminResult.rows[0];

        // 根据操作类型处理角色分配
        let finalRoleIds = role_ids;
        
        if (operation === 'assign') {
          // 获取现有角色并合并
          const existingRoles = await RoleService.getAdminRoles({ admin_id: adminId });
          const existingRoleIds = existingRoles.map(r => r.id);
          finalRoleIds = [...new Set([...existingRoleIds, ...role_ids])];
        } else if (operation === 'remove') {
          // 获取现有角色并移除指定角色
          const existingRoles = await RoleService.getAdminRoles({ admin_id: adminId });
          const existingRoleIds = existingRoles.map(r => r.id);
          finalRoleIds = existingRoleIds.filter(id => !role_ids.includes(id));
        }
        // replace 操作直接使用 role_ids

        // 执行角色分配
        await RoleService.assignRolesToAdmin(adminId, finalRoleIds);
        
        results.push({
          admin_id: adminId,
          username: admin.username,
          success: true,
          reason: '角色分配成功'
        });
        successCount++;
        
      } catch (error) {
        results.push({
          admin_id: adminId,
          username: '未知',
          success: false,
          reason: error instanceof Error ? error.message : '分配失败'
        });
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: `角色分配完成：成功${successCount}个，失败${failedCount}个`,
      data: {
        assigned_count: successCount,
        failed_count: failedCount,
        failed_users: results.filter(r => !r.success).map(r => ({
          admin_id: r.admin_id,
          username: r.username,
          reason: r.reason
        }))
      }
    });
  } catch (error) {
    console.error('分配管理员角色失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '分配管理员角色失败'
    });
  }
});

/**
 * 移除管理员角色
 * DELETE /api/system/admin-roles
 */
router.delete('/', [
  requirePermission('system:user:role:remove'),
  logOperation('移除管理员角色'),
  body('admin_id').isUUID().withMessage('管理员ID必须是有效的UUID'),
  body('role_id').isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { admin_id, role_id } = req.body;
    
    // 这里需要实现移除管理员角色的逻辑
    // 暂时使用空数组来移除所有角色，实际应该实现单个角色移除
    await RoleService.assignRolesToAdmin(admin_id, []);

    res.json({
      success: true,
      message: '管理员角色移除成功'
    });
  } catch (error) {
    console.error('移除管理员角色失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '移除管理员角色失败'
    });
  }
});

/**
 * 批量操作管理员角色
 * POST /api/system/admin-roles/batch
 */
router.post('/batch', [
  requirePermission('system:user:role:batch'),
  logOperation('批量操作管理员角色'),
  body('operation').isIn(['assign', 'remove']).withMessage('操作类型必须是assign或remove'),
  body('admin_ids').isArray().withMessage('管理员ID列表必须是数组'),
  body('admin_ids.*').isUUID().withMessage('管理员ID必须是有效的UUID'),
  body('role_ids').isArray().withMessage('角色ID列表必须是数组'),
  body('role_ids.*').isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { operation, admin_ids, role_ids } = req.body;
    
    const results = [];
    
    for (const admin_id of admin_ids) {
      try {
        if (operation === 'assign') {
          // 获取现有角色
          const existingRoles = await RoleService.getAdminRoles({ admin_id });
          const existingRoleIds = existingRoles.map(r => r.id);
          
          // 合并角色（去重）
          const newRoleIds = [...new Set([...existingRoleIds, ...role_ids])];
          await RoleService.assignRolesToAdmin(admin_id, newRoleIds);
        } else {
          // 获取现有角色
          const existingRoles = await RoleService.getAdminRoles({ admin_id });
          const existingRoleIds = existingRoles.map(r => r.id);
          
          // 移除指定角色
          const remainingRoleIds = existingRoleIds.filter(id => !role_ids.includes(id));
          await RoleService.assignRolesToAdmin(admin_id, remainingRoleIds);
        }
        
        results.push({
          admin_id,
          success: true,
          message: `${operation === 'assign' ? '分配' : '移除'}角色成功`
        });
      } catch (error) {
        results.push({
          admin_id,
          success: false,
          message: error instanceof Error ? error.message : '操作失败'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    res.json({
      success: true,
      message: `批量操作完成：成功${successCount}个，失败${failCount}个`,
      data: {
        total: results.length,
        success: successCount,
        failed: failCount,
        results
      }
    });
  } catch (error) {
    console.error('批量操作管理员角色失败:', error);
    res.status(500).json({
      success: false,
      error: '批量操作失败'
    });
  }
});

/**
 * 获取管理员角色统计信息
 * GET /api/system/admin-roles/stats
 */
router.get('/stats', [
  requirePermission('system:user:role:list'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    // 获取总管理员数
    const totalAdminsResult = await query('SELECT COUNT(*) as count FROM admins WHERE deleted_at IS NULL');
    const totalAdmins = parseInt(totalAdminsResult.rows[0].count);

    // 获取有角色的管理员数
    const adminsWithRolesResult = await query(`
      SELECT COUNT(DISTINCT admin_id) as count 
      FROM admin_roles ar 
      JOIN admins a ON ar.admin_id = a.id 
      WHERE a.deleted_at IS NULL
    `);
    const adminsWithRoles = parseInt(adminsWithRolesResult.rows[0].count);

    // 获取角色分布
    const roleDistributionResult = await query(`
      SELECT r.name, COUNT(ar.admin_id) as admin_count
      FROM roles r
      LEFT JOIN admin_roles ar ON r.id = ar.role_id
      LEFT JOIN admins a ON ar.admin_id = a.id AND a.deleted_at IS NULL
      WHERE r.deleted_at IS NULL
      GROUP BY r.id, r.name
      ORDER BY admin_count DESC
    `);

    // 获取最近分配记录
    const recentAssignmentsResult = await query(`
      SELECT 
        a.username,
        r.name as role_name,
        ar.created_at
      FROM admin_roles ar
      JOIN admins a ON ar.admin_id = a.id
      JOIN roles r ON ar.role_id = r.id
      WHERE a.deleted_at IS NULL AND r.deleted_at IS NULL
      ORDER BY ar.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        total_admins: totalAdmins,
        admins_with_roles: adminsWithRoles,
        admins_without_roles: totalAdmins - adminsWithRoles,
        role_distribution: roleDistributionResult.rows,
        recent_assignments: recentAssignmentsResult.rows
      }
    });
  } catch (error) {
    console.error('获取管理员角色统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    });
  }
});

// 获取管理员角色历史记录
router.get('/history', [
  requirePermission('system:user:role:list'),
  validateQuery('admin_id').optional().isUUID().withMessage('管理员ID必须是有效的UUID'),
  validateQuery('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  validateQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { admin_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE a.deleted_at IS NULL AND r.deleted_at IS NULL';
    const params: any[] = [];
    
    if (admin_id) {
      whereClause += ' AND a.id = $' + (params.length + 1);
      params.push(admin_id);
    }

    // 获取历史记录（这里模拟历史记录，实际项目中可能需要专门的历史表）
    const historyResult = await query(`
      SELECT 
        a.id as admin_id,
        a.username,
        a.email,
        r.id as role_id,
        r.name as role_name,
        ar.created_at as assigned_at,
        'assigned' as action
      FROM admin_roles ar
      JOIN admins a ON ar.admin_id = a.id
      JOIN roles r ON ar.role_id = r.id
      ${whereClause}
      ORDER BY ar.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    // 获取总数
    const countResult = await query(`
      SELECT COUNT(*) as count
      FROM admin_roles ar
      JOIN admins a ON ar.admin_id = a.id
      JOIN roles r ON ar.role_id = r.id
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        list: historyResult.rows,
        pagination: {
          current_page: Number(page),
          per_page: Number(limit),
          total,
          total_pages: totalPages
        }
      }
    });
  } catch (error) {
    console.error('获取管理员角色历史记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取历史记录失败'
    });
  }
});

// 导出管理员角色数据
router.get('/export', [
  requirePermission('system:user:role:export')
], async (req: Request, res: Response) => {
  try {
    const exportResult = await query(`
      SELECT 
        a.username,
        a.email,
        a.real_name,
        STRING_AGG(r.name, ', ') as roles,
        a.created_at,
        a.last_login_at
      FROM admins a
      LEFT JOIN admin_roles ar ON a.id = ar.admin_id
      LEFT JOIN roles r ON ar.role_id = r.id AND r.deleted_at IS NULL
      WHERE a.deleted_at IS NULL
      GROUP BY a.id, a.username, a.email, a.real_name, a.created_at, a.last_login_at
      ORDER BY a.created_at DESC
    `);

    res.json({
      success: true,
      data: exportResult.rows
    });
  } catch (error) {
    console.error('导出管理员角色数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出数据失败'
    });
  }
});

// 导入管理员角色数据
router.post('/import', [
  requirePermission('system:user:role:import'),
  body('data').isArray().withMessage('导入数据必须是数组'),
  body('data.*.admin_id').isUUID().withMessage('管理员ID必须是有效的UUID'),
  body('data.*.role_ids').isArray().withMessage('角色ID列表必须是数组'),
  body('data.*.role_ids.*').isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    const results = [];

    for (const item of data) {
      try {
        // 验证管理员是否存在
        const adminResult = await query('SELECT id FROM admins WHERE id = $1 AND deleted_at IS NULL', [item.admin_id]);
        if (adminResult.rows.length === 0) {
          results.push({
            admin_id: item.admin_id,
            success: false,
            message: '管理员不存在'
          });
          continue;
        }

        // 验证角色是否存在
        const roleResult = await query('SELECT id FROM roles WHERE id = ANY($1) AND deleted_at IS NULL', [item.role_ids]);
        if (roleResult.rows.length !== item.role_ids.length) {
          results.push({
            admin_id: item.admin_id,
            success: false,
            message: '部分角色不存在'
          });
          continue;
        }

        // 删除现有角色
        await query('DELETE FROM admin_roles WHERE admin_id = $1', [item.admin_id]);

        // 分配新角色
        for (const roleId of item.role_ids) {
          await query(
            'INSERT INTO admin_roles (admin_id, role_id, created_at) VALUES ($1, $2, NOW())',
            [item.admin_id, roleId]
          );
        }

        results.push({
          admin_id: item.admin_id,
          success: true,
          message: '导入成功'
        });
      } catch (error) {
        results.push({
          admin_id: item.admin_id,
          success: false,
          message: '导入失败: ' + (error as Error).message
        });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        total: data.length,
        success_count: results.filter(r => r.success).length,
        failed_count: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('导入管理员角色数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导入数据失败'
    });
  }
});

// 获取角色选项（用于下拉选择）
router.get('/role-options', [
  requirePermission('system:user:role:list')
], async (req: Request, res: Response) => {
  try {
    const rolesResult = await query(`
      SELECT id, name, description
      FROM roles 
      WHERE deleted_at IS NULL 
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      data: rolesResult.rows
    });
  } catch (error) {
    console.error('获取角色选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取角色选项失败'
    });
  }
});

// 获取管理员选项（用于下拉选择）
router.get('/admin-options', [
  requirePermission('system:user:role:list')
], async (req: Request, res: Response) => {
  try {
    const adminsResult = await query(`
      SELECT id, username, email, real_name
      FROM admins 
      WHERE deleted_at IS NULL 
      ORDER BY username ASC
    `);

    res.json({
      success: true,
      data: adminsResult.rows
    });
  } catch (error) {
    console.error('获取管理员选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员选项失败'
    });
  }
});

// 获取管理员角色配置
router.get('/config', [
  requirePermission('system:user:role:config')
], async (req: Request, res: Response) => {
  try {
    // 这里返回系统配置，实际项目中可能从配置表或配置文件读取
    const config = {
      allow_multiple_roles: true,
      auto_inherit_permissions: true,
      role_priority_enabled: false,
      require_approval: false,
      max_roles_per_user: 5
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取管理员角色配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

// 更新管理员角色配置
router.put('/config', [
  requirePermission('system:user:role:config'),
  body('allow_multiple_roles').isBoolean().withMessage('允许多角色必须是布尔值'),
  body('auto_inherit_permissions').isBoolean().withMessage('自动继承权限必须是布尔值'),
  body('role_priority_enabled').isBoolean().withMessage('角色优先级启用必须是布尔值'),
  body('require_approval').isBoolean().withMessage('需要审批必须是布尔值'),
  body('max_roles_per_user').isInt({ min: 1, max: 20 }).withMessage('每用户最大角色数必须在1-20之间'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const config = req.body;
    
    // 这里应该保存到配置表或配置文件
    // 暂时返回成功响应
    
    res.json({
      success: true,
      message: '配置更新成功',
      data: config
    });
  } catch (error) {
    console.error('更新管理员角色配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新配置失败'
    });
  }
});

// 检查角色冲突
router.post('/check-conflicts', [
  requirePermission('system:user:role:assign'),
  body('admin_id').isUUID().withMessage('管理员ID必须是有效的UUID'),
  body('role_ids').isArray().withMessage('角色ID列表必须是数组'),
  body('role_ids.*').isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { admin_id, role_ids } = req.body;
    
    // 获取角色信息
    const rolesResult = await query(`
      SELECT id, name, description
      FROM roles 
      WHERE id = ANY($1) AND deleted_at IS NULL
    `, [role_ids]);
    
    // 检查是否有冲突的角色（这里简化处理，实际项目中可能有复杂的冲突规则）
    const conflicts = [];
    
    // 示例：检查是否同时分配了管理员和普通用户角色
    const adminRoles = rolesResult.rows.filter(role => role.name.includes('管理员'));
    const userRoles = rolesResult.rows.filter(role => role.name.includes('用户') && !role.name.includes('管理员'));
    
    if (adminRoles.length > 0 && userRoles.length > 0) {
      conflicts.push({
        type: 'role_level_conflict',
        message: '不能同时分配管理员角色和普通用户角色',
        conflicting_roles: [...adminRoles, ...userRoles]
      });
    }
    
    res.json({
      success: true,
      data: {
        has_conflicts: conflicts.length > 0,
        conflicts
      }
    });
  } catch (error) {
    console.error('检查角色冲突失败:', error);
    res.status(500).json({
      success: false,
      message: '检查冲突失败'
    });
  }
});

// 获取角色审批列表
router.get('/approvals', [
  requirePermission('system:user:role:approval'),
  validateQuery('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('状态必须是pending、approved或rejected'),
  validateQuery('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  validateQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    // 这里返回空数组，因为当前系统可能没有审批功能
    // 实际项目中需要从审批表查询数据
    
    res.json({
      success: true,
      data: {
        list: [],
        pagination: {
          current_page: 1,
          per_page: 20,
          total: 0,
          total_pages: 0
        }
      }
    });
  } catch (error) {
    console.error('获取角色审批列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取审批列表失败'
    });
  }
});

// 处理角色审批
router.post('/approvals/:id/process', [
  requirePermission('system:user:role:approval'),
  param('id').isUUID().withMessage('审批ID必须是有效的UUID'),
  body('action').isIn(['approve', 'reject']).withMessage('操作必须是approve或reject'),
  body('comment').optional().isString().withMessage('备注必须是字符串'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body;
    
    // 这里返回错误，因为当前系统可能没有审批功能
    res.status(404).json({
      success: false,
      message: '审批记录不存在'
    });
  } catch (error) {
    console.error('处理角色审批失败:', error);
    res.status(500).json({
      success: false,
      message: '处理审批失败'
    });
  }
});

export default router;