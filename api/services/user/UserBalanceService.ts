/**
 * 用户余额服务类
 * 从 UserService.ts 中安全分离的余额相关操作
 * 负责用户余额的更新、增减等操作
 */

import pool from '../../config/database.ts';
import type { User } from './UserService.ts';

export class UserBalanceService {
  /**
   * 更新用户余额
   */
  static async updateUserBalance(id: string, balance: number, frozenBalance: number = 0): Promise<User | null> {
    const query = `
      UPDATE users
      SET balance = $1, frozen_balance = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [balance, frozenBalance, id]);
    if (result.rows.length === 0) {
      return null;
    }

    // 需要获取完整的用户信息（包括关联数据）
    return this.getUserWithDetails(id);
  }

  /**
   * 增加用户余额
   */
  static async addUserBalance(id: string, amount: number): Promise<User | null> {
    const query = `
      UPDATE users
      SET balance = balance + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [amount, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.getUserWithDetails(id);
  }

  /**
   * 扣减用户余额
   */
  static async deductUserBalance(id: string, amount: number): Promise<User | null> {
    const query = `
      UPDATE users
      SET balance = balance - $1, updated_at = NOW()
      WHERE id = $2 AND balance >= $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [amount, id]);
    if (result.rows.length === 0) {
      return null; // 余额不足或用户不存在
    }

    return this.getUserWithDetails(id);
  }

  /**
   * 获取用户详情（私有方法，用于返回完整的用户信息）
   */
  private static async getUserWithDetails(id: string): Promise<User | null> {
    const query = `
      SELECT 
        u.*,
        a.agent_code,
        au.username as agent_username
      FROM users u
      LEFT JOIN agents a ON u.agent_id = a.id
      LEFT JOIN users au ON a.user_id = au.id
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      balance: parseFloat(row.balance || 0),
      frozen_balance: parseFloat(row.frozen_balance || 0),
      agent: row.agent_id ? {
        id: row.agent_id,
        agent_code: row.agent_code,
        username: row.agent_username
      } : null
    };
  }

  /**
   * 检查用户余额是否充足
   */
  static async checkSufficientBalance(id: string, requiredAmount: number): Promise<boolean> {
    const query = 'SELECT balance FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return false;
    }
    
    const currentBalance = parseFloat(result.rows[0].balance || 0);
    return currentBalance >= requiredAmount;
  }

  /**
   * 获取用户余额信息
   */
  static async getUserBalance(id: string): Promise<{ balance: number; frozen_balance: number } | null> {
    const query = 'SELECT balance, frozen_balance FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      balance: parseFloat(row.balance || 0),
      frozen_balance: parseFloat(row.frozen_balance || 0)
    };
  }

  /**
   * 冻结用户余额
   */
  static async freezeBalance(id: string, amount: number): Promise<User | null> {
    // 检查可用余额是否充足
    const balanceCheck = await pool.query(
      'SELECT balance, frozen_balance FROM users WHERE id = $1',
      [id]
    );
    
    if (balanceCheck.rows.length === 0) {
      return null;
    }
    
    const currentBalance = parseFloat(balanceCheck.rows[0].balance || 0);
    if (currentBalance < amount) {
      throw new Error('余额不足，无法冻结');
    }
    
    const query = `
      UPDATE users
      SET 
        balance = balance - $1, 
        frozen_balance = frozen_balance + $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [amount, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.getUserWithDetails(id);
  }

  /**
   * 解冻用户余额
   */
  static async unfreezeBalance(id: string, amount: number): Promise<User | null> {
    // 检查冻结余额是否充足
    const balanceCheck = await pool.query(
      'SELECT balance, frozen_balance FROM users WHERE id = $1',
      [id]
    );
    
    if (balanceCheck.rows.length === 0) {
      return null;
    }
    
    const currentFrozenBalance = parseFloat(balanceCheck.rows[0].frozen_balance || 0);
    if (currentFrozenBalance < amount) {
      throw new Error('冻结余额不足，无法解冻');
    }
    
    const query = `
      UPDATE users
      SET 
        balance = balance + $1, 
        frozen_balance = frozen_balance - $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [amount, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.getUserWithDetails(id);
  }
}
