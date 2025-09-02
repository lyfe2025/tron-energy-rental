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
   * 获取权限列表（从数据库动态获取）
   */
  static async getPermissions(): Promise<Permission[]> {
    try {
      const query = `
        SELECT 
          permission as id,
          name,
          CASE 
            WHEN permission LIKE 'user:%' THEN 'user'
            WHEN permission LIKE 'agent:%' THEN 'agent'
            WHEN permission LIKE 'order:%' THEN 'order'
            WHEN permission LIKE 'energy:%' THEN 'energy'
            WHEN permission LIKE 'system:%' THEN 'system'
            WHEN permission LIKE 'statistics:%' THEN 'statistics'
            WHEN permission LIKE 'monitoring:%' THEN 'monitoring'
            WHEN permission LIKE 'bot:%' THEN 'bot'
            WHEN permission LIKE 'price:%' THEN 'pricing'
            WHEN permission LIKE 'dashboard:%' THEN 'dashboard'
            ELSE 'other'
          END as category
        FROM menus 
        WHERE permission IS NOT NULL 
        AND status = 1
        ORDER BY permission
      `;
      
      const result = await pool.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name || this.getPermissionDisplayName(row.id),
        description: this.getPermissionDescription(row.id),
        category: row.category
      }));
    } catch (error) {
      console.error('获取权限列表失败:', error);
      // 如果数据库查询失败，返回空数组
      return [];
    }
  }

  /**
   * 根据权限ID获取显示名称
   */
  private static getPermissionDisplayName(permissionId: string): string {
    const displayNames: Record<string, string> = {
      'dashboard:view': '仪表板',
      'user:list': '用户管理',
      'agent:list': '代理商管理',
      'order:list': '订单管理',
      'energy:pool': '能量池管理',
      'bot:list': '机器人管理',
      'price:config': '价格配置',
      'statistics:view': '统计分析',
      'monitoring:view': '监控中心',
      'monitoring:overview': '监控概览',
      'monitoring:database': '数据库监控',
      'monitoring:cache': '缓存监控',
      'monitoring:service': '服务监控',
      'monitoring:tasks': '任务监控',
      'monitoring:users': '用户监控',
      'system:view': '系统管理',
      'system:user:list': '管理员管理',
      'system:role:list': '角色管理',
      'system:dept:list': '部门管理',
      'system:position:list': '职位管理',
      'system:menu:list': '菜单管理',
      'system:settings:list': '系统设置',
      'system:log:view': '日志管理',
      'system:log:login:list': '登录日志',
      'system:log:operation:list': '操作日志'
    };
    
    return displayNames[permissionId] || permissionId;
  }

  /**
   * 根据权限ID获取描述
   */
  private static getPermissionDescription(permissionId: string): string {
    const descriptions: Record<string, string> = {
      'dashboard:view': '查看系统仪表板',
      'user:list': '管理系统用户',
      'agent:list': '管理代理商信息',
      'order:list': '管理订单信息',
      'energy:pool': '管理能量池',
      'bot:list': '管理机器人',
      'price:config': '配置价格参数',
      'statistics:view': '查看统计数据',
      'monitoring:view': '查看监控信息',
      'monitoring:overview': '查看监控概览',
      'monitoring:database': '监控数据库状态',
      'monitoring:cache': '监控缓存状态',
      'monitoring:service': '监控服务状态',
      'monitoring:tasks': '监控任务状态',
      'monitoring:users': '监控用户状态',
      'system:view': '查看系统管理',
      'system:user:list': '管理管理员账户',
      'system:role:list': '管理角色权限',
      'system:dept:list': '管理部门信息',
      'system:position:list': '管理职位信息',
      'system:menu:list': '管理菜单结构',
      'system:settings:list': '管理系统设置',
      'system:log:view': '查看系统日志',
      'system:log:login:list': '查看登录日志',
      'system:log:operation:list': '查看操作日志'
    };
    
    return descriptions[permissionId] || `权限：${permissionId}`;
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
   * 为管理员分配角色（确保每个管理员只能有一个角色）
   */
  static async assignRole(adminId: string, roleId: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 检查管理员是否存在
      const adminExists = await client.query(
        'SELECT id FROM admins WHERE id = $1',
        [adminId]
      );
      
      if (adminExists.rows.length === 0) {
        throw new Error('管理员不存在');
      }

      // 检查角色是否存在
      const roleExists = await client.query(
        'SELECT id FROM roles WHERE id = $1 AND status = 1',
        [roleId]
      );
      
      if (roleExists.rows.length === 0) {
        throw new Error('角色不存在或已禁用');
      }

      // 先删除该管理员的所有现有角色（确保每个管理员只能有一个角色）
      await client.query(
        'DELETE FROM admin_roles WHERE admin_id = $1',
        [adminId]
      );

      // 分配新角色
      await client.query(
        'INSERT INTO admin_roles (admin_id, role_id) VALUES ($1, $2)',
        [adminId, roleId]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('分配角色失败:', error);
      throw error;
    } finally {
      client.release();
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
