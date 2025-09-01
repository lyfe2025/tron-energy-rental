/**
 * 管理员角色权限服务
 * 从 admin.ts 中安全分离的角色权限管理功能
 */

import pool from '../../config/database.js';

// 角色信息接口
export interface Role {
  value: string;
  label: string;
  description: string;
}

// 权限信息接口
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export class AdminRoleService {
  /**
   * 获取角色列表
   */
  static async getRoles(): Promise<Role[]> {
    return [
      {
        value: 'super_admin',
        label: '超级管理员',
        description: '拥有系统所有权限'
      },
      {
        value: 'admin',
        label: '管理员',
        description: '拥有大部分管理权限'
      },
      {
        value: 'operator',
        label: '操作员',
        description: '拥有基本操作权限'
      }
    ];
  }

  /**
   * 获取权限列表
   */
  static async getPermissions(): Promise<Permission[]> {
    return [
      {
        id: 'user_management',
        name: '用户管理',
        description: '管理系统用户',
        category: 'user'
      },
      {
        id: 'agent_management',
        name: '代理商管理',
        description: '管理代理商信息',
        category: 'agent'
      },
      {
        id: 'order_management',
        name: '订单管理',
        description: '管理订单信息',
        category: 'order'
      },
      {
        id: 'energy_package_management',
        name: '能量包管理',
        description: '管理能量包配置',
        category: 'energy'
      },
      {
        id: 'system_config',
        name: '系统配置',
        description: '管理系统配置',
        category: 'system'
      },
      {
        id: 'statistics_view',
        name: '统计查看',
        description: '查看统计数据',
        category: 'statistics'
      },
      {
        id: 'admin_management',
        name: '管理员管理',
        description: '管理管理员账户',
        category: 'admin'
      }
    ];
  }

  /**
   * 获取用户的角色和权限信息
   */
  static async getUserRolesAndPermissions(userId: string) {
    const query = `
      SELECT 
        a.id,
        a.username,
        a.email,
        a.role as default_role,
        a.department_id,
        a.position_id,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', r.id,
              'name', r.name,
              'code', r.code,
              'description', r.description
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) as roles,
        COALESCE(
          json_agg(
            DISTINCT m.permission
          ) FILTER (WHERE m.permission IS NOT NULL),
          '[]'::json
        ) as permissions
      FROM admins a
      LEFT JOIN admin_roles ar ON a.id = ar.admin_id
       LEFT JOIN roles r ON ar.role_id = r.id AND r.status = 1
       LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN menus m ON rp.menu_id = m.id AND m.status = 1
      WHERE a.id = $1 AND a.status = 'active'
      GROUP BY a.id, a.username, a.email, a.role, a.department_id, a.position_id
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    return {
      ...user,
      roles: Array.isArray(user.roles) ? user.roles : [],
      permissions: Array.isArray(user.permissions) ? user.permissions : []
    };
  }

  /**
   * 检查用户是否具有指定权限
   */
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM admins a
      LEFT JOIN admin_roles ar ON a.id = ar.admin_id
       LEFT JOIN role_permissions rp ON ar.role_id = rp.role_id
      LEFT JOIN menus m ON rp.menu_id = m.id
      WHERE a.id = $1 
        AND a.status = 'active'
        AND m.permission = $2
        AND m.status = 1
    `;
    
    const result = await pool.query(query, [userId, permission]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * 为管理员分配角色
   */
  static async assignRole(adminId: string, roleId: string): Promise<boolean> {
    try {
      // 检查管理员是否存在
      const adminExists = await pool.query(
        'SELECT id FROM admins WHERE id = $1',
        [adminId]
      );
      
      if (adminExists.rows.length === 0) {
        throw new Error('管理员不存在');
      }

      // 检查角色是否存在
      const roleExists = await pool.query(
        'SELECT id FROM roles WHERE id = $1 AND status = 1',
        [roleId]
      );
      
      if (roleExists.rows.length === 0) {
        throw new Error('角色不存在或已禁用');
      }

      // 检查是否已分配该角色
      const existingAssignment = await pool.query(
        'SELECT id FROM admin_roles WHERE admin_id = $1 AND role_id = $2',
        [adminId, roleId]
      );
      
      if (existingAssignment.rows.length > 0) {
        return true; // 已经分配，直接返回成功
      }

      // 分配角色
      await pool.query(
        'INSERT INTO admin_roles (admin_id, role_id) VALUES ($1, $2)',
        [adminId, roleId]
      );

      return true;
    } catch (error) {
      console.error('分配角色失败:', error);
      throw error;
    }
  }

  /**
   * 移除管理员角色
   */
  static async removeRole(adminId: string, roleId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM admin_roles WHERE admin_id = $1 AND role_id = $2',
        [adminId, roleId]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('移除角色失败:', error);
      throw error;
    }
  }

  /**
   * 获取管理员的所有角色
   */
  static async getAdminRoles(adminId: string): Promise<any[]> {
    const query = `
      SELECT 
        r.id,
        r.name,
        r.code,
        r.description,
        ar.created_at as assigned_at
      FROM admin_roles ar
      JOIN roles r ON ar.role_id = r.id
      WHERE ar.admin_id = $1 AND r.status = 1
      ORDER BY ar.created_at ASC
    `;
    
    const result = await pool.query(query, [adminId]);
    return result.rows;
  }

  /**
   * 批量更新管理员角色
   */
  static async updateAdminRoles(adminId: string, roleIds: string[]): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 先删除现有角色分配
      await client.query(
        'DELETE FROM admin_roles WHERE admin_id = $1',
        [adminId]
      );

      // 分配新角色
      if (roleIds.length > 0) {
        const values = roleIds.map((roleId, index) => 
          `($1, $${index + 2})`
        ).join(', ');
        
        const query = `
          INSERT INTO admin_roles (admin_id, role_id) 
          VALUES ${values}
        `;
        
        await client.query(query, [adminId, ...roleIds]);
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('批量更新管理员角色失败:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取角色的权限列表
   */
  static async getRolePermissions(roleId: string): Promise<any[]> {
    const query = `
      SELECT 
        m.id,
        m.title,
        m.permission,
        m.path,
        m.component,
        rp.created_at as granted_at
      FROM role_permissions rp
      JOIN menus m ON rp.menu_id = m.id
      WHERE rp.role_id = $1 AND m.status = 1
      ORDER BY m.sort ASC
    `;
    
    const result = await pool.query(query, [roleId]);
    return result.rows;
  }
}
