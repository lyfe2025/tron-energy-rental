/**
 * 用户认证服务类
 * 从 UserService.ts 中安全分离的认证相关操作
 * 负责用户密码验证、重置和登录时间更新等认证相关功能
 */

import bcrypt from 'bcrypt';
import pool from '../../config/database.ts';

export class UserAuthService {
  /**
   * 验证用户密码
   */
  static async verifyPassword(id: string, password: string): Promise<boolean> {
    const query = 'SELECT password_hash FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0 || !result.rows[0].password_hash) {
      return false;
    }

    return await bcrypt.compare(password, result.rows[0].password_hash);
  }

  /**
   * 重置用户密码
   */
  static async resetUserPassword(id: string, password: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    const result = await pool.query(query, [hashedPassword, id]);
    return result.rowCount > 0;
  }

  /**
   * 更新用户最后登录时间
   */
  static async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_login = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [id]);
  }

  /**
   * 验证用户邮箱和密码（用于登录）
   */
  static async validateEmailLogin(email: string, password: string): Promise<{ valid: boolean; userId?: string }> {
    const query = 'SELECT id, password_hash FROM users WHERE email = $1 AND status = $2';
    const result = await pool.query(query, [email, 'active']);
    
    if (result.rows.length === 0) {
      return { valid: false };
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      return { valid: false };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return { valid: false };
    }

    return { valid: true, userId: user.id };
  }

  /**
   * 检查用户是否存在密码（是否设置了密码）
   */
  static async hasPassword(id: string): Promise<boolean> {
    const query = 'SELECT password_hash FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return false;
    }

    return !!result.rows[0].password_hash;
  }

  /**
   * 设置用户密码（首次设置）
   */
  static async setPassword(id: string, password: string): Promise<boolean> {
    // 检查用户是否已设置密码
    const hasPasswordCheck = await this.hasPassword(id);
    if (hasPasswordCheck) {
      throw new Error('用户已设置密码，请使用重置密码功能');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    const result = await pool.query(query, [hashedPassword, id]);
    return result.rowCount > 0;
  }

  /**
   * 修改用户密码（需要验证旧密码）
   */
  static async changePassword(id: string, oldPassword: string, newPassword: string): Promise<boolean> {
    // 验证旧密码
    const isOldPasswordValid = await this.verifyPassword(id, oldPassword);
    if (!isOldPasswordValid) {
      throw new Error('原密码不正确');
    }

    // 设置新密码
    return await this.resetUserPassword(id, newPassword);
  }

  /**
   * 获取用户登录历史统计
   */
  static async getLoginStats(id: string): Promise<{ last_login: Date | null; login_count?: number }> {
    const query = 'SELECT last_login FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return { last_login: null };
    }

    return {
      last_login: result.rows[0].last_login,
      // 可以扩展添加登录次数统计
    };
  }

  /**
   * 检查用户状态是否允许登录
   */
  static async canLogin(id: string): Promise<boolean> {
    const query = 'SELECT status FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return false;
    }

    const status = result.rows[0].status;
    return status === 'active';
  }
}
