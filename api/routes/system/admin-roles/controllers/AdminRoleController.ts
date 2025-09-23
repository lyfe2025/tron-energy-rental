/**
 * 管理员角色控制器
 * 处理管理员角色相关的CRUD操作
 */
import { type Request, type Response } from 'express';
import { query } from '../../../../config/database.ts';

export class AdminRoleController {
  /**
   * 获取管理员角色列表
   * GET /api/system/admin-roles
   */
  static async list(req: Request, res: Response) {
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
        whereClause += ` AND p.department_id = $${paramIndex++}`;
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
          a.name,
          a.phone,
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
        LEFT JOIN positions p ON a.position_id = p.id
        LEFT JOIN departments d ON p.department_id = d.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      params.push(pageSizeNum, offset);

      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total
        FROM admins a
        LEFT JOIN positions p ON a.position_id = p.id
        LEFT JOIN departments d ON p.department_id = d.id
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
        
        // 为每个管理员分配角色信息
        const rolesByAdmin = rolesResult.rows.reduce((acc, role) => {
          if (!acc[role.admin_id]) {
            acc[role.admin_id] = [];
          }
          acc[role.admin_id].push({
            id: role.id,
            name: role.name,
            description: role.description,
            status: role.status,
            assigned_at: role.assigned_at
          });
          return acc;
        }, {});

        admins.forEach(admin => {
          admin.roles = rolesByAdmin[admin.admin_id] || [];
        });
      }

      res.json({
        success: true,
        data: {
          admins,
          pagination: {
            page: pageNum,
            page_size: pageSizeNum,
            total,
            total_pages: Math.ceil(total / pageSizeNum)
          }
        }
      });
    } catch (error) {
      console.error('获取管理员角色列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取管理员角色列表失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取单个管理员信息
   * GET /api/system/admin-roles/admin/:adminId
   */
  static async getAdmin(req: Request, res: Response) {
    try {
      const { adminId } = req.params;

      // 获取管理员基本信息
      const adminSql = `
        SELECT 
          a.id,
          a.username,
          a.email,
          a.name,
          a.phone,
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
        LEFT JOIN positions p ON a.position_id = p.id
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE a.id = $1
      `;

      const adminResult = await query(adminSql, [adminId]);

      if (adminResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '管理员不存在'
        });
      }

      const admin = adminResult.rows[0];

      // 获取管理员的角色信息
      const rolesSql = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.status,
          ar.created_at as assigned_at
        FROM admin_roles ar
        JOIN roles r ON ar.role_id = r.id
        WHERE ar.admin_id = $1
        ORDER BY r.sort_order ASC, r.id ASC
      `;

      const rolesResult = await query(rolesSql, [adminId]);
      admin.roles = rolesResult.rows;

      res.json({
        success: true,
        data: admin
      });
    } catch (error) {
      console.error('获取管理员信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取管理员信息失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取管理员的角色列表
   * GET /api/system/admin-roles/admin/:adminId/roles
   */
  static async getAdminRoles(req: Request, res: Response) {
    try {
      const { adminId } = req.params;

      // 检查管理员是否存在
      const adminCheck = await query('SELECT id FROM admins WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '管理员不存在'
        });
      }

      // 获取管理员的角色信息
      const rolesSql = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.status,
          r.sort_order,
          ar.created_at as assigned_at
        FROM admin_roles ar
        JOIN roles r ON ar.role_id = r.id
        WHERE ar.admin_id = $1
        ORDER BY r.sort_order ASC, r.id ASC
      `;

      const rolesResult = await query(rolesSql, [adminId]);

      res.json({
        success: true,
        data: rolesResult.rows
      });
    } catch (error) {
      console.error('获取管理员角色失败:', error);
      res.status(500).json({
        success: false,
        message: '获取管理员角色失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 分配角色给管理员
   * POST /api/system/admin-roles
   */
  static async assignRoles(req: Request, res: Response) {
    try {
      const { adminId, roleIds } = req.body;
      const operatorId = req.user?.id;

      // 检查管理员是否存在
      const adminCheck = await query('SELECT id, username FROM admins WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '管理员不存在'
        });
      }

      const admin = adminCheck.rows[0];

      // 检查角色是否都存在
      const roleCheck = await query('SELECT id FROM roles WHERE id = ANY($1)', [roleIds]);
      if (roleCheck.rows.length !== roleIds.length) {
        return res.status(400).json({
          success: false,
          message: '部分角色不存在'
        });
      }

      // 开始事务
      await query('BEGIN');

      try {
        // 删除现有角色分配
        await query('DELETE FROM admin_roles WHERE admin_id = $1', [adminId]);

        // 添加新的角色分配
        if (roleIds.length > 0) {
          const insertValues = roleIds.map((roleId: number, index: number) => {
            const baseIndex = index * 2;
            return `($${baseIndex + 1}, $${baseIndex + 2})`;
          }).join(', ');

          const insertParams = roleIds.flatMap((roleId: number) => [adminId, roleId]);

          await query(
            `INSERT INTO admin_roles (admin_id, role_id) VALUES ${insertValues}`,
            insertParams
          );
        }

        // 记录操作日志
        const logData = {
          adminId,
          adminUsername: admin.username,
          roleIds,
          operator: operatorId
        };

        await query(
          'INSERT INTO admin_operation_logs (admin_id, operation, details, created_at) VALUES ($1, $2, $3, NOW())',
          [operatorId, 'assign_roles', JSON.stringify(logData)]
        );

        await query('COMMIT');

        res.json({
          success: true,
          message: '角色分配成功'
        });
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('角色分配失败:', error);
      res.status(500).json({
        success: false,
        message: '角色分配失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 移除管理员角色
   * DELETE /api/system/admin-roles
   */
  static async removeRole(req: Request, res: Response) {
    try {
      const { adminId, roleId } = req.body;
      const operatorId = req.user?.id;

      // 检查分配关系是否存在
      const assignmentCheck = await query(
        'SELECT * FROM admin_roles WHERE admin_id = $1 AND role_id = $2',
        [adminId, roleId]
      );

      if (assignmentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '角色分配关系不存在'
        });
      }

      // 删除角色分配
      await query('DELETE FROM admin_roles WHERE admin_id = $1 AND role_id = $2', [adminId, roleId]);

      // 记录操作日志
      const logData = {
        adminId,
        roleId,
        operator: operatorId
      };

      await query(
        'INSERT INTO admin_operation_logs (admin_id, operation, details, created_at) VALUES ($1, $2, $3, NOW())',
        [operatorId, 'remove_role', JSON.stringify(logData)]
      );

      res.json({
        success: true,
        message: '角色移除成功'
      });
    } catch (error) {
      console.error('移除角色失败:', error);
      res.status(500).json({
        success: false,
        message: '移除角色失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
