/**
 * 管理员CRUD服务类
 * 从 AdminService.ts 中安全分离的基础CRUD操作
 * 负责管理员的创建、读取、更新、删除等基础操作
 */

import bcrypt from 'bcrypt';
import pool from '../../config/database.ts';
import type { Admin, AdminCreateData, AdminSearchParams, AdminUpdateData } from './AdminService.ts';

export class AdminCRUDService {
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
      conditions.push(`(a.username ILIKE $${paramIndex} OR a.email ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      conditions.push(`a.role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    if (status) {
      conditions.push(`a.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM admins a
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // 获取数据
    const dataQuery = `
      SELECT 
        a.id,
        a.username,
        a.email,
        a.role,
        a.status,
        a.department_id,
        a.position_id,
        a.name,
        a.phone,
        a.created_at,
        a.updated_at,
        a.last_login,
        a.last_login_at,
        p.name as position_name,
        d.name as department_name
      FROM admins a
      LEFT JOIN positions p ON a.position_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      ${whereClause}
      ORDER BY a.created_at DESC
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
        a.id,
        a.username,
        a.email,
        a.status,
        a.role,
        a.department_id,
        a.position_id,
        a.name,
        a.phone,
        a.created_at,
        a.updated_at,
        a.last_login,
        a.last_login_at,
        p.name as position_name,
        d.name as department_name
      FROM admins a
      LEFT JOIN positions p ON a.position_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE a.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * 创建管理员
   */
  static async createAdmin(data: AdminCreateData): Promise<Admin> {
    const { username, email, password, status = 'active', department_id, position_id, name, phone, role_id } = data;

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

    // 验证部门是否存在
    if (department_id) {
      const departmentExists = await pool.query(
        'SELECT id FROM departments WHERE id = $1 AND status = $2',
        [department_id, 1]
      );
      if (departmentExists.rows.length === 0) {
        throw new Error('指定的部门不存在或已禁用');
      }
    }

    // 验证岗位是否存在
    if (position_id) {
      const positionExists = await pool.query(
        'SELECT id FROM positions WHERE id = $1 AND status = $2',
        [position_id, 1]
      );
      if (positionExists.rows.length === 0) {
        throw new Error('指定的岗位不存在或已禁用');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO admins (username, email, password_hash, status, department_id, position_id, name, phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        username,
        email,
        status,
        role,
        department_id,
        position_id,
        name,
        phone,
        created_at,
        updated_at
    `;
    
    const result = await pool.query(query, [username, email, hashedPassword, status, department_id, position_id, name, phone]);
    const newAdmin = result.rows[0];
    
    // 处理角色分配
    if (role_id) {
      const { AdminRoleService } = await import('./AdminRoleService.ts');
      // 为新创建的管理员分配角色
      await AdminRoleService.assignRole(newAdmin.id, role_id.toString());
    }
    
    return newAdmin;
  }

  /**
   * 更新管理员信息
   */
  static async updateAdmin(id: string, data: AdminUpdateData): Promise<Admin | null> {
    console.log('🔍 [AdminCRUDService] 更新管理员请求:')
    console.log('  管理员ID:', id)
    console.log('  更新数据:', data)
    console.log('  数据类型检查:')
    Object.entries(data).forEach(([key, value]) => {
      console.log(`    ${key}: ${typeof value} = ${JSON.stringify(value)}`)
    })
    
    const { username, email, status, department_id, position_id, role_id } = data;

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



    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (department_id !== undefined) {
      if (department_id !== null) {
        // 验证部门是否存在
        const departmentExists = await pool.query(
          'SELECT id FROM departments WHERE id = $1 AND status = $2',
          [department_id, 1]
        );
        if (departmentExists.rows.length === 0) {
          throw new Error('指定的部门不存在或已禁用');
        }
      }
      updateFields.push(`department_id = $${paramIndex}`);
      values.push(department_id);
      paramIndex++;
    }

    if (position_id !== undefined) {
      if (position_id !== null) {
        // 验证岗位是否存在
        const positionExists = await pool.query(
          'SELECT id FROM positions WHERE id = $1 AND status = $2',
          [position_id, 1]
        );
        if (positionExists.rows.length === 0) {
          throw new Error('指定的岗位不存在或已禁用');
        }
      }
      updateFields.push(`position_id = $${paramIndex}`);
      values.push(position_id);
      paramIndex++;
    }

    // 处理角色分配
    if (role_id !== undefined) {
      console.log('🔍 [AdminCRUDService] 开始处理角色分配:')
      console.log('  管理员ID:', id)
      console.log('  角色ID:', role_id)
      console.log('  角色ID类型:', typeof role_id)
      
      try {
        // 导入AdminRoleService
        const { AdminRoleService } = await import('./AdminRoleService.ts');
        await AdminRoleService.assignRole(id, role_id);
        console.log('✅ [AdminCRUDService] 角色分配成功')
      } catch (roleError) {
        console.error('❌ [AdminCRUDService] 角色分配失败:', roleError)
        throw roleError;
      }
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
        status,
        role,
        department_id,
        position_id,
        created_at,
        updated_at,
        last_login,
        last_login_at
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
        status,
        role,
        department_id,
        position_id,
        created_at,
        updated_at,
        last_login,
        last_login_at
    `;
    
    const result = await pool.query(query, [status, id]);
    return result.rows[0] || null;
  }

  /**
   * 删除管理员
   */
  static async deleteAdmin(id: string): Promise<boolean> {
    // 检查管理员是否存在
    const admin = await this.getAdminById(id);
    if (!admin) {
      return false;
    }

    // 删除管理员（角色关系通过admin_roles表管理）
    const query = 'DELETE FROM admins WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}
