/**
 * 角色管理服务
 * 处理角色相关的业务逻辑
 */

import { query } from '../../config/database.js';

export interface Role {
  id: number;
  name: string;
  code: string;
  type: number;
  sort_order: number;
  status: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  code: string;
  type: number;
  parent_id?: number;
  path?: string;
  component?: string;
  icon?: string;
  sort_order: number;
  status: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
  children?: Permission[];
}

export interface CreateRoleData {
  name: string;
  code: string;
  type?: number;
  sort_order?: number;
  status?: number;
  description?: string;
}

export interface UpdateRoleData {
  name?: string;
  code?: string;
  type?: number;
  sort_order?: number;
  status?: number;
  description?: string;
}

export interface RoleQuery {
  type?: number;
  status?: number;
  page?: number;
  limit?: number;
}

export class RoleService {
  /**
   * 获取角色列表
   */
  static async getRoles(params: RoleQuery = {}): Promise<{
    roles: Role[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT id, name, code, type, sort_order, status, description, created_at, updated_at
      FROM roles
      WHERE 1=1
    `;
    
    let countSql = `
      SELECT COUNT(*) as total
      FROM roles
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramIndex = 1;

    if (params.type !== undefined) {
      const condition = ` AND type = $${paramIndex++}`;
      sql += condition;
      countSql += condition;
      values.push(params.type);
    }

    if (params.status !== undefined) {
      const condition = ` AND status = $${paramIndex++}`;
      sql += condition;
      countSql += condition;
      values.push(params.status);
    }

    sql += ` ORDER BY sort_order ASC, id ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const [rolesResult, countResult] = await Promise.all([
      query(sql, values),
      query(countSql, values.slice(0, -2)) // 移除 limit 和 offset 参数
    ]);

    return {
      roles: rolesResult.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  }

  /**
   * 根据ID获取角色详情
   */
  static async getRoleById(id: number): Promise<Role | null> {
    const sql = `
      SELECT id, name, code, type, sort_order, status, description, created_at, updated_at
      FROM roles
      WHERE id = $1
    `;
    
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * 获取角色权限
   */
  static async getRolePermissions(roleId: number): Promise<Permission[]> {
    const sql = `
      SELECT m.id, m.name, m.permission, m.type, m.parent_id, m.path, m.component, 
             m.icon, m.sort_order, m.status, m.visible, m.created_at, m.updated_at
      FROM menus m
      INNER JOIN role_permissions rp ON m.id = rp.menu_id
      WHERE rp.role_id = $1 AND m.status = 1
      ORDER BY m.sort_order ASC, m.id ASC
    `;
    
    const result = await query(sql, [roleId]);
    return result.rows;
  }

  /**
   * 创建角色
   */
  static async createRole(data: CreateRoleData): Promise<Role> {
    // 检查角色编码是否已存在
    const existingCode = await query(
      'SELECT id FROM roles WHERE code = $1',
      [data.code]
    );
    
    if (existingCode.rows.length > 0) {
      throw new Error('角色编码已存在');
    }

    const sql = `
      INSERT INTO roles (name, code, type, sort_order, status, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, code, type, sort_order, status, description, created_at, updated_at
    `;
    
    const values = [
      data.name,
      data.code,
      data.type || 1,
      data.sort_order || 0,
      data.status ?? 1,
      data.description || null
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * 更新角色
   */
  static async updateRole(id: number, data: UpdateRoleData): Promise<Role | null> {
    // 检查角色是否存在
    const existing = await this.getRoleById(id);
    if (!existing) {
      return null;
    }

    // 检查角色编码是否已被其他角色使用
    if (data.code) {
      const existingCode = await query(
        'SELECT id FROM roles WHERE code = $1 AND id != $2',
        [data.code, id]
      );
      
      if (existingCode.rows.length > 0) {
        throw new Error('角色编码已存在');
      }
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.code !== undefined) {
      updateFields.push(`code = $${paramIndex++}`);
      values.push(data.code);
    }
    if (data.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      values.push(data.type);
    }
    if (data.sort_order !== undefined) {
      updateFields.push(`sort_order = $${paramIndex++}`);
      values.push(data.sort_order);
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const sql = `
      UPDATE roles
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, code, type, sort_order, status, description, created_at, updated_at
    `;
    
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  /**
   * 删除角色
   */
  static async deleteRole(id: number): Promise<boolean> {
    // 检查是否有关联的用户
    const users = await query(
      'SELECT id FROM admin_roles WHERE role_id = $1',
      [id]
    );
    
    if (users.rows.length > 0) {
      throw new Error('角色下存在用户，无法删除');
    }

    // 删除角色权限关联
    await query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    
    // 删除角色
    const result = await query('DELETE FROM roles WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * 分配权限给角色
   */
  static async assignPermissions(roleId: number, menuIds: number[]): Promise<boolean> {
    // 检查角色是否存在
    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error('角色不存在');
    }

    // 开始事务
    const client = await query('BEGIN');
    
    try {
      // 删除现有权限
      await query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      
      // 添加新权限
      if (menuIds.length > 0) {
        const values: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;
        
        for (const menuId of menuIds) {
          values.push(`($${paramIndex++}, $${paramIndex++})`);
          params.push(roleId, menuId);
        }
        
        const sql = `INSERT INTO role_permissions (role_id, menu_id) VALUES ${values.join(', ')}`;
        await query(sql, params);
      }
      
      await query('COMMIT');
      return true;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 获取管理员角色
   */
  static async getAdminRoles(filters?: { admin_id?: string; role_id?: number }): Promise<Role[]> {
    if (filters?.admin_id) {
      const sql = `
        SELECT r.id, r.name, r.code, r.type, r.sort_order, r.status, 
               r.description, r.created_at, r.updated_at
        FROM roles r
        INNER JOIN admin_roles ar ON r.id = ar.role_id
        WHERE ar.admin_id = $1 AND r.status = 1
        ORDER BY r.sort_order ASC, r.id ASC
      `;
      
      const result = await query(sql, [filters.admin_id]);
      return result.rows;
    }
    
    // 如果没有指定admin_id，返回所有管理员角色关系
    let sql = `
      SELECT r.id, r.name, r.code, r.type, r.sort_order, r.status, 
             r.description, r.created_at, r.updated_at,
             ar.admin_id
      FROM roles r
      INNER JOIN admin_roles ar ON r.id = ar.role_id
      WHERE r.status = 1
    `;
    
    const params: any[] = [];
    if (filters?.role_id) {
      sql += ` AND r.id = $1`;
      params.push(filters.role_id);
    }
    
    sql += ` ORDER BY r.sort_order ASC, r.id ASC`;
    
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * 获取用户角色 (保留兼容性)
   */
  static async getUserRoles(userId: number): Promise<Role[]> {
    const sql = `
      SELECT r.id, r.name, r.code, r.type, r.sort_order, r.status, 
             r.description, r.created_at, r.updated_at
      FROM roles r
      INNER JOIN admin_roles ar ON r.id = ar.role_id
       WHERE ar.admin_id = $1 AND r.status = 1
      ORDER BY r.sort_order ASC, r.id ASC
    `;
    
    const result = await query(sql, [userId]);
    return result.rows;
  }

  /**
   * 分配角色给管理员
   */
  static async assignRolesToAdmin(adminId: string, roleIds: number[]): Promise<boolean> {
    // 开始事务
    const client = await query('BEGIN');
    
    try {
      // 删除现有角色
      await query('DELETE FROM admin_roles WHERE admin_id = $1', [adminId]);
      
      // 添加新角色
      if (roleIds.length > 0) {
        const values: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;
        
        for (const roleId of roleIds) {
          values.push(`($${paramIndex++}, $${paramIndex++})`);
          params.push(adminId, roleId);
        }
        
        const sql = `INSERT INTO admin_roles (admin_id, role_id) VALUES ${values.join(', ')}`;
        await query(sql, params);
      }
      
      await query('COMMIT');
      return true;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 分配角色给用户 (保留兼容性)
   */
  static async assignRolesToUser(userId: number, roleIds: number[]): Promise<boolean> {
    // 开始事务
    const client = await query('BEGIN');
    
    try {
      // 删除现有角色
      await query('DELETE FROM admin_roles WHERE admin_id = $1', [userId]);
      
      // 添加新角色
      if (roleIds.length > 0) {
        const values: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;
        
        for (const roleId of roleIds) {
          values.push(`($${paramIndex++}, $${paramIndex++})`);
          params.push(userId, roleId);
        }
        
        const sql = `INSERT INTO admin_roles (admin_id, role_id) VALUES ${values.join(', ')}`;
        await query(sql, params);
      }
      
      await query('COMMIT');
      return true;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 获取角色选项（用于下拉选择）
   */
  static async getRoleOptions(): Promise<{ id: number; name: string; code: string }[]> {
    const sql = `
      SELECT id, name, code
      FROM roles
      WHERE status = 1
      ORDER BY sort_order ASC, id ASC
    `;
    
    const result = await query(sql);
    return result.rows;
  }
}