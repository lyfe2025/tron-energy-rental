/**
 * 管理员服务类
 * 处理admins表的业务逻辑
 */

import pool from '../config/database.js';
import bcrypt from 'bcrypt';

// 管理员数据接口
export interface Admin {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

// 管理员搜索参数接口
export interface AdminSearchParams {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: string;
}

// 管理员创建数据接口
export interface AdminCreateData {
  username: string;
  email: string;
  password: string;
  role: string;
  status?: string;
}

// 管理员更新数据接口
export interface AdminUpdateData {
  username?: string;
  email?: string;
  role?: string;
  status?: string;
}

// 管理员统计数据接口
export interface AdminStats {
  total: number;
  active: number;
  inactive: number;
  by_role: {
    super_admin: number;
    admin: number;
    operator: number;
  };
  recent_logins: number; // 最近7天登录的管理员数量
}

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

export class AdminService {
  /**
   * 获取管理员列表
   */
  static async getAdmins(params: AdminSearchParams) {
    const { page, limit, search, role, status } = params;
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      conditions.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM admins
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // 获取数据
    const dataQuery = `
      SELECT 
        id,
        username,
        email,
        role,
        status,
        created_at,
        updated_at,
        last_login
      FROM admins
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    
    const dataResult = await pool.query(dataQuery, values);

    return {
      admins: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 根据ID获取管理员详情
   */
  static async getAdminById(id: string): Promise<Admin | null> {
    const query = `
      SELECT 
        id,
        username,
        email,
        role,
        status,
        created_at,
        updated_at,
        last_login
      FROM admins
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * 创建管理员
   */
  static async createAdmin(data: AdminCreateData): Promise<Admin> {
    const { username, email, password, role, status = 'active' } = data;

    // 检查用户名是否已存在
    const existingUsername = await pool.query(
      'SELECT id FROM admins WHERE username = $1',
      [username]
    );
    if (existingUsername.rows.length > 0) {
      throw new Error('用户名已存在');
    }

    // 检查邮箱是否已存在
    const existingEmail = await pool.query(
      'SELECT id FROM admins WHERE email = $1',
      [email]
    );
    if (existingEmail.rows.length > 0) {
      throw new Error('邮箱已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO admins (username, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        username,
        email,
        role,
        status,
        created_at,
        updated_at
    `;
    
    const result = await pool.query(query, [username, email, hashedPassword, role, status]);
    return result.rows[0];
  }

  /**
   * 更新管理员信息
   */
  static async updateAdmin(id: string, data: AdminUpdateData): Promise<Admin | null> {
    const { username, email, role, status } = data;

    // 动态构建更新字段
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (username !== undefined) {
      // 检查用户名是否已被其他管理员使用
      const existingUsername = await pool.query(
        'SELECT id FROM admins WHERE username = $1 AND id != $2',
        [username, id]
      );
      if (existingUsername.rows.length > 0) {
        throw new Error('用户名已存在');
      }
      updateFields.push(`username = $${paramIndex}`);
      values.push(username);
      paramIndex++;
    }

    if (email !== undefined) {
      // 检查邮箱是否已被其他管理员使用
      const existingEmail = await pool.query(
        'SELECT id FROM admins WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (existingEmail.rows.length > 0) {
        throw new Error('邮箱已存在');
      }
      updateFields.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      // 没有字段需要更新，直接返回当前数据
      return this.getAdminById(id);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE admins
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        username,
        email,
        role,
        status,
        created_at,
        updated_at,
        last_login
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * 更新管理员状态
   */
  static async updateAdminStatus(id: string, status: string): Promise<Admin | null> {
    const query = `
      UPDATE admins
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id,
        username,
        email,
        role,
        status,
        created_at,
        updated_at,
        last_login
    `;
    
    const result = await pool.query(query, [status, id]);
    return result.rows[0] || null;
  }

  /**
   * 重置管理员密码
   */
  static async resetAdminPassword(id: string, password: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      UPDATE admins
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    const result = await pool.query(query, [hashedPassword, id]);
    return result.rowCount > 0;
  }

  /**
   * 删除管理员
   */
  static async deleteAdmin(id: string): Promise<boolean> {
    // 检查是否为超级管理员（可能需要特殊保护）
    const admin = await this.getAdminById(id);
    if (!admin) {
      return false;
    }

    // 可以添加额外的业务逻辑，比如不允许删除最后一个超级管理员
    if (admin.role === 'super_admin') {
      const superAdminCount = await pool.query(
        'SELECT COUNT(*) as count FROM admins WHERE role = $1 AND status = $2',
        ['super_admin', 'active']
      );
      if (parseInt(superAdminCount.rows[0].count) <= 1) {
        throw new Error('不能删除最后一个超级管理员');
      }
    }

    const query = 'DELETE FROM admins WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * 获取管理员统计数据
   */
  static async getAdminStats(): Promise<AdminStats> {
    // 获取总数和状态统计
    const statusQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive
      FROM admins
    `;
    const statusResult = await pool.query(statusQuery);
    const statusStats = statusResult.rows[0];

    // 获取角色统计
    const roleQuery = `
      SELECT 
        role,
        COUNT(*) as count
      FROM admins
      GROUP BY role
    `;
    const roleResult = await pool.query(roleQuery);
    const roleStats = roleResult.rows.reduce((acc: any, row: any) => {
      acc[row.role] = parseInt(row.count);
      return acc;
    }, {});

    // 获取最近7天登录的管理员数量
    const recentLoginsQuery = `
      SELECT COUNT(DISTINCT id) as count
      FROM admins
      WHERE last_login >= NOW() - INTERVAL '7 days'
    `;
    const recentLoginsResult = await pool.query(recentLoginsQuery);
    const recentLogins = parseInt(recentLoginsResult.rows[0].count || 0);

    return {
      total: parseInt(statusStats.total),
      active: parseInt(statusStats.active),
      inactive: parseInt(statusStats.inactive),
      by_role: {
        super_admin: roleStats.super_admin || 0,
        admin: roleStats.admin || 0,
        operator: roleStats.operator || 0
      },
      recent_logins: recentLogins
    };
  }

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
   * 更新管理员最后登录时间
   */
  static async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE admins
      SET last_login = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [id]);
  }
}