/**
 * 权限管理控制器
 * 处理权限相关的操作和配置
 */
import { type Request, type Response } from 'express';
import { query } from '../../../../config/database.ts';

export class PermissionController {
  /**
   * 获取统计信息
   * GET /api/system/admin-roles/stats
   */
  static async getStats(req: Request, res: Response) {
    try {
      // 获取活跃管理员数量
      const activeAdminsQuery = 'SELECT COUNT(*) as count FROM admins WHERE status = $1';
      const activeAdminsResult = await query(activeAdminsQuery, ['active']);
      const activeAdmins = parseInt(activeAdminsResult.rows[0].count);

      // 获取总角色数量
      const totalRolesQuery = 'SELECT COUNT(*) as count FROM roles WHERE status = $1';
      const totalRolesResult = await query(totalRolesQuery, [1]);
      const totalRoles = parseInt(totalRolesResult.rows[0].count);

      // 获取总权限数量
      const totalPermissionsQuery = 'SELECT COUNT(*) as count FROM menus WHERE permission IS NOT NULL AND status = $1';
      const totalPermissionsResult = await query(totalPermissionsQuery, [1]);
      const totalPermissions = parseInt(totalPermissionsResult.rows[0].count);

      // 获取角色分配数量
      const roleAssignmentsQuery = 'SELECT COUNT(*) as count FROM admin_roles';
      const roleAssignmentsResult = await query(roleAssignmentsQuery);
      const roleAssignments = parseInt(roleAssignmentsResult.rows[0].count);

      const stats = {
        activeAdmins,
        totalRoles,
        totalPermissions,
        roleAssignments
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      res.status(500).json({
        success: false,
        error: '获取统计数据失败'
      });
    }
  }

  /**
   * 获取操作历史记录
   * GET /api/system/admin-roles/history
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const {
        adminId,
        roleId,
        operation,
        start_date,
        end_date,
        page = 1,
        limit = 20
      } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      // 构建查询条件
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (adminId) {
        whereClause += ` AND (aol.admin_id = $${paramIndex++} OR aol.details::text LIKE $${paramIndex++})`;
        params.push(adminId, `%"adminId":"${adminId}"%`);
      }

      if (roleId) {
        whereClause += ` AND aol.details::text LIKE $${paramIndex++}`;
        params.push(`%"roleId":${roleId}%`);
      }

      if (operation) {
        whereClause += ` AND aol.operation = $${paramIndex++}`;
        params.push(operation);
      }

      if (start_date) {
        whereClause += ` AND aol.created_at >= $${paramIndex++}`;
        params.push(start_date);
      }

      if (end_date) {
        whereClause += ` AND aol.created_at <= $${paramIndex++}`;
        params.push(end_date);
      }

      // 获取历史记录
      const historySql = `
        SELECT 
          aol.id,
          aol.admin_id as operator_id,
          a.username as operator_username,
          aol.operation,
          aol.details,
          aol.created_at
        FROM admin_operation_logs aol
        LEFT JOIN admins a ON aol.admin_id = a.id
        ${whereClause}
        ORDER BY aol.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      params.push(limitNum, offset);

      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total
        FROM admin_operation_logs aol
        ${whereClause}
      `;

      const [historyResult, countResult] = await Promise.all([
        query(historySql, params),
        query(countSql, params.slice(0, -2)) // 移除 limit 和 offset 参数
      ]);

      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        data: {
          history: historyResult.rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('获取历史记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取历史记录失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取角色选项列表
   * GET /api/system/admin-roles/role-options
   */
  static async getRoleOptions(req: Request, res: Response) {
    try {
      const rolesSql = `
        SELECT 
          id,
          name,
          description,
          status,
          sort_order
        FROM roles
        WHERE status = 1
        ORDER BY sort_order ASC, id ASC
      `;

      const rolesResult = await query(rolesSql);

      res.json({
        success: true,
        data: rolesResult.rows
      });
    } catch (error) {
      console.error('获取角色选项失败:', error);
      res.status(500).json({
        success: false,
        message: '获取角色选项失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取管理员选项列表
   * GET /api/system/admin-roles/admin-options
   */
  static async getAdminOptions(req: Request, res: Response) {
    try {
      const adminsSql = `
        SELECT 
          a.id,
          a.username,
          a.email,
          a.name,
          d.name as department_name,
          p.name as position_name
        FROM admins a
        LEFT JOIN positions p ON a.position_id = p.id
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE a.status = 'active'
        ORDER BY a.username ASC
      `;

      const adminsResult = await query(adminsSql);

      res.json({
        success: true,
        data: adminsResult.rows
      });
    } catch (error) {
      console.error('获取管理员选项失败:', error);
      res.status(500).json({
        success: false,
        message: '获取管理员选项失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取配置信息
   * GET /api/system/admin-roles/config
   */
  static async getConfig(req: Request, res: Response) {
    try {
      // 这里可以从系统配置表获取相关配置
      // 暂时返回默认配置
      const config = {
        allowMultipleRoles: true,
        requireApproval: false,
        defaultRole: null,
        maxRolesPerAdmin: 5
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('获取配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取配置失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 更新配置信息
   * PUT /api/system/admin-roles/config
   */
  static async updateConfig(req: Request, res: Response) {
    try {
      const {
        allowMultipleRoles,
        requireApproval,
        defaultRole,
        maxRolesPerAdmin
      } = req.body;

      const operatorId = req.user?.id;

      // 这里应该将配置保存到系统配置表
      // 暂时只记录操作日志
      const logData = {
        allowMultipleRoles,
        requireApproval,
        defaultRole,
        maxRolesPerAdmin,
        operator: operatorId
      };

      await query(
        'INSERT INTO admin_operation_logs (admin_id, operation, details, created_at) VALUES ($1, $2, $3, NOW())',
        [operatorId, 'update_config', JSON.stringify(logData)]
      );

      res.json({
        success: true,
        message: '配置更新成功'
      });
    } catch (error) {
      console.error('更新配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新配置失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 检查角色分配冲突
   * POST /api/system/admin-roles/check-conflicts
   */
  static async checkConflicts(req: Request, res: Response) {
    try {
      const { adminId, roleIds } = req.body;

      // 检查管理员是否存在
      const adminCheck = await query('SELECT id, username FROM admins WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '管理员不存在'
        });
      }

      // 检查角色是否都存在
      const roleCheck = await query('SELECT id, name FROM roles WHERE id = ANY($1)', [roleIds]);
      if (roleCheck.rows.length !== roleIds.length) {
        return res.status(400).json({
          success: false,
          message: '部分角色不存在'
        });
      }

      const roles = roleCheck.rows;

      // 这里可以添加更复杂的冲突检查逻辑
      // 比如检查角色之间的互斥关系等
      const conflicts: any[] = [];

      // 示例：检查是否有重复的角色
      const existingRoles = await query(
        'SELECT role_id FROM admin_roles WHERE admin_id = $1 AND role_id = ANY($2)',
        [adminId, roleIds]
      );

      if (existingRoles.rows.length > 0) {
        const existingRoleIds = existingRoles.rows.map(row => row.role_id);
        const duplicateRoles = roles.filter(role => existingRoleIds.includes(role.id));
        
        if (duplicateRoles.length > 0) {
          conflicts.push({
            type: 'duplicate_roles',
            message: '以下角色已经分配给该管理员',
            roles: duplicateRoles
          });
        }
      }

      res.json({
        success: true,
        data: {
          hasConflicts: conflicts.length > 0,
          conflicts
        }
      });
    } catch (error) {
      console.error('检查角色冲突失败:', error);
      res.status(500).json({
        success: false,
        message: '检查角色冲突失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
