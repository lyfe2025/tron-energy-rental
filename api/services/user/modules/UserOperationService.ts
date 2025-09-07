/**
 * 用户操作服务类
 * 从 UserCRUDService.ts 中安全分离的操作方法
 * 负责用户的创建、更新、删除等操作
 */

import bcrypt from 'bcrypt';
import pool from '../../../config/database.js';
import type { User, UserCreateData, UserUpdateData } from '../UserService.js';
import { UserQueryService } from './UserQueryService.js';

export class UserOperationService {
  /**
   * 创建用户
   */
  static async createUser(data: UserCreateData): Promise<User> {
    const {
      username,
      email,
      phone,
      telegram_id,
      telegram_username,
      wallet_address,
      password,
      login_type,
      type = 'user',
      user_type = 'regular',
      agent_id,
      bot_id,
      status = 'active'
    } = data;

    // 检查用户名是否已存在
    if (username) {
      const existingUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      if (existingUsername.rows.length > 0) {
        throw new Error('用户名已存在');
      }
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existingEmail.rows.length > 0) {
        throw new Error('邮箱已存在');
      }
    }

    // 检查Telegram ID是否已存在
    if (telegram_id) {
      const existingTelegram = await pool.query(
        'SELECT id FROM users WHERE telegram_id = $1',
        [telegram_id]
      );
      if (existingTelegram.rows.length > 0) {
        throw new Error('Telegram账户已存在');
      }
    }

    // 验证代理商是否存在
    if (agent_id) {
      const agentExists = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND status = $2',
        [agent_id, 'active']
      );
      if (agentExists.rows.length === 0) {
        throw new Error('指定的代理商不存在或已禁用');
      }
    }

    // 处理密码加密
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const query = `
      INSERT INTO users (
        username, email, phone, telegram_id, password_hash, 
        login_type, user_type, agent_id, bot_id, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      username, email, phone, telegram_id, hashedPassword,
      login_type, user_type, agent_id, bot_id, status
    ]);

    return UserQueryService.getUserById(result.rows[0].id);
  }

  /**
   * 更新用户信息
   */
  static async updateUser(id: string, data: UserUpdateData): Promise<User | null> {
    const { 
      username, email, phone, first_name, last_name, 
      tron_address, status, user_type, agent_id, bot_id,
      balance, usdt_balance, trx_balance, referral_code, referred_by, 
      password 
    } = data;

    // 动态构建更新字段
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (username !== undefined) {
      // 检查用户名是否已被其他用户使用
      const existingUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, id]
      );
      if (existingUsername.rows.length > 0) {
        const error = new Error('用户名已存在');
        (error as any).statusCode = 400;
        throw error;
      }
      updateFields.push(`username = $${paramIndex}`);
      values.push(username);
      paramIndex++;
    }

    if (email !== undefined) {
      if (email !== null) {
        // 检查邮箱是否已被其他用户使用
        const existingEmail = await pool.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, id]
        );
        if (existingEmail.rows.length > 0) {
          const error = new Error('邮箱已存在');
          (error as any).statusCode = 400;
          throw error;
        }
      }
      updateFields.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }

    if (first_name !== undefined) {
      updateFields.push(`first_name = $${paramIndex}`);
      values.push(first_name);
      paramIndex++;
    }

    if (last_name !== undefined) {
      updateFields.push(`last_name = $${paramIndex}`);
      values.push(last_name);
      paramIndex++;
    }

    if (tron_address !== undefined) {
      updateFields.push(`tron_address = $${paramIndex}`);
      values.push(tron_address || null);
      paramIndex++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (user_type !== undefined) {
      updateFields.push(`user_type = $${paramIndex}`);
      values.push(user_type);
      paramIndex++;
    }

    if (agent_id !== undefined) {
      if (agent_id !== null && agent_id !== '') {
        // 验证代理商是否存在
        const agentExists = await pool.query(
          'SELECT id FROM agents WHERE id = $1 AND status = $2',
          [agent_id, 'active']
        );
        if (agentExists.rows.length === 0) {
          throw new Error('指定的代理商不存在或已禁用');
        }
      }
      updateFields.push(`agent_id = $${paramIndex}`);
      values.push(agent_id || null);
      paramIndex++;
    }

    if (bot_id !== undefined) {
      if (bot_id !== null && bot_id !== '') {
        // 验证机器人是否存在
        const botExists = await pool.query(
          'SELECT id FROM telegram_bots WHERE id = $1',
          [bot_id]
        );
        if (botExists.rows.length === 0) {
          const error = new Error('指定的机器人不存在');
          (error as any).statusCode = 400;
          throw error;
        }
      }
      updateFields.push(`bot_id = $${paramIndex}`);
      values.push(bot_id || null);
      paramIndex++;
    }

    if (balance !== undefined) {
      updateFields.push(`balance = $${paramIndex}`);
      values.push(balance);
      paramIndex++;
    }

    if (usdt_balance !== undefined) {
      updateFields.push(`usdt_balance = $${paramIndex}`);
      values.push(usdt_balance);
      paramIndex++;
    }

    if (trx_balance !== undefined) {
      updateFields.push(`trx_balance = $${paramIndex}`);
      values.push(trx_balance);
      paramIndex++;
    }

    if (referral_code !== undefined) {
      updateFields.push(`referral_code = $${paramIndex}`);
      values.push(referral_code || null);
      paramIndex++;
    }

    if (referred_by !== undefined) {
      updateFields.push(`referred_by = $${paramIndex}`);
      values.push(referred_by || null);
      paramIndex++;
    }

    if (password !== undefined) {
      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password_hash = $${paramIndex}`);
      values.push(hashedPassword);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      // 没有字段需要更新，直接返回当前数据
      return UserQueryService.getUserById(id);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    return UserQueryService.getUserById(id);
  }

  /**
   * 更新用户状态
   */
  static async updateUserStatus(id: string, status: string): Promise<User | null> {
    const query = `
      UPDATE users
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return UserQueryService.getUserById(id);
  }

  /**
   * 删除用户
   */
  static async deleteUser(id: string): Promise<boolean> {
    // 检查用户是否有未完成的订单
    const hasActiveOrders = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = $1 AND status IN ($2, $3)',
      [id, 'pending', 'processing']
    );
    
    if (parseInt(hasActiveOrders.rows[0].count) > 0) {
      throw new Error('用户有未完成的订单，无法删除');
    }

    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}
