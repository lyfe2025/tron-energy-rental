/**
 * 管理员认证服务类
 * 从 AdminService.ts 中安全分离的认证相关操作
 * 负责管理员密码重置和登录时间更新等认证相关功能
 */

import bcrypt from 'bcrypt';
import pool from '../../config/database.ts';

export class AdminAuthService {
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
   * 更新管理员最后登录时间
   */
  static async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE admins
      SET last_login = NOW(), last_login_at = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [id]);
  }

  /**
   * 验证管理员密码
   */
  static async verifyPassword(id: string, password: string): Promise<boolean> {
    const query = 'SELECT password_hash FROM admins WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0 || !result.rows[0].password_hash) {
      return false;
    }

    return await bcrypt.compare(password, result.rows[0].password_hash);
  }

  /**
   * 验证管理员邮箱和密码（用于登录）
   */
  static async validateEmailLogin(email: string, password: string): Promise<{ valid: boolean; adminId?: string; admin?: any }> {
    const query = `
      SELECT id, password_hash, username, email, role, status, department_id, position_id
      FROM admins 
      WHERE email = $1 AND status = $2
    `;
    const result = await pool.query(query, [email, 'active']);
    
    if (result.rows.length === 0) {
      return { valid: false };
    }

    const admin = result.rows[0];
    if (!admin.password_hash) {
      return { valid: false };
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      return { valid: false };
    }

    // 移除密码哈希，不返回给调用方
    const { password_hash, ...adminData } = admin;

    return { valid: true, adminId: admin.id, admin: adminData };
  }

  /**
   * 检查管理员是否存在密码（是否设置了密码）
   */
  static async hasPassword(id: string): Promise<boolean> {
    const query = 'SELECT password_hash FROM admins WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return false;
    }

    return !!result.rows[0].password_hash;
  }

  /**
   * 设置管理员密码（首次设置）
   */
  static async setPassword(id: string, password: string): Promise<boolean> {
    // 检查管理员是否已设置密码
    const hasPasswordCheck = await this.hasPassword(id);
    if (hasPasswordCheck) {
      throw new Error('管理员已设置密码，请使用重置密码功能');
    }

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
   * 修改管理员密码（需要验证旧密码）
   */
  static async changePassword(id: string, oldPassword: string, newPassword: string): Promise<boolean> {
    // 验证旧密码
    const isOldPasswordValid = await this.verifyPassword(id, oldPassword);
    if (!isOldPasswordValid) {
      throw new Error('原密码不正确');
    }

    // 设置新密码
    return await this.resetAdminPassword(id, newPassword);
  }

  /**
   * 获取管理员登录历史统计
   */
  static async getLoginStats(id: string): Promise<{ last_login: Date | null; last_login_at: Date | null }> {
    const query = 'SELECT last_login, last_login_at FROM admins WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return { last_login: null, last_login_at: null };
    }

    return {
      last_login: result.rows[0].last_login,
      last_login_at: result.rows[0].last_login_at
    };
  }

  /**
   * 检查管理员状态是否允许登录
   */
  static async canLogin(id: string): Promise<boolean> {
    const query = 'SELECT status FROM admins WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return false;
    }

    const status = result.rows[0].status;
    return status === 'active';
  }

  /**
   * 获取管理员权限信息（用于JWT token生成）
   */
  static async getAdminPermissions(id: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT m.permission
      FROM admins a
      LEFT JOIN admin_roles ar ON a.id = ar.admin_id
      LEFT JOIN role_permissions rp ON ar.role_id = rp.role_id
      LEFT JOIN menus m ON rp.menu_id = m.id
      WHERE a.id = $1 AND a.status = 'active' AND m.permission IS NOT NULL
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows.map(row => row.permission);
  }
}
