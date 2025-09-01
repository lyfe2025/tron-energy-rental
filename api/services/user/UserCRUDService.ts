/**
 * 用户CRUD服务类
 * 从 UserService.ts 中安全分离的基础CRUD操作
 * 负责用户的创建、读取、更新、删除等基础操作
 */

import bcrypt from 'bcrypt';
import pool from '../../config/database.js';
import type { User, UserCreateData, UserSearchParams, UserUpdateData } from './UserService.js';

export class UserCRUDService {
  /**
   * 获取用户列表
   */
  static async getUsers(params: UserSearchParams) {
    const { page, limit, search, status, login_type, type, user_type, agent_id, date_range } = params;
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex} OR u.telegram_username ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`u.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (login_type) {
      conditions.push(`u.login_type = $${paramIndex}`);
      values.push(login_type);
      paramIndex++;
    }

    if (type) {
      conditions.push(`u.type = $${paramIndex}`);
      values.push(type);
      paramIndex++;
    }

    if (user_type) {
      conditions.push(`u.user_type = $${paramIndex}`);
      values.push(user_type);
      paramIndex++;
    }

    if (agent_id) {
      conditions.push(`u.agent_id = $${paramIndex}`);
      values.push(agent_id);
      paramIndex++;
    }

    if (date_range?.start) {
      conditions.push(`u.created_at >= $${paramIndex}`);
      values.push(date_range.start);
      paramIndex++;
    }

    if (date_range?.end) {
      conditions.push(`u.created_at <= $${paramIndex}`);
      values.push(date_range.end);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // 获取数据
    const dataQuery = `
      SELECT 
        u.*,
        a.agent_code,
        au.username as agent_username
      FROM users u
      LEFT JOIN agents a ON u.agent_id = a.id
      LEFT JOIN users au ON a.user_id = au.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    
    const dataResult = await pool.query(dataQuery, values);

    // 格式化数据
    const users = dataResult.rows.map(row => ({
      ...row,
      balance: parseFloat(row.balance || 0),
      frozen_balance: parseFloat(row.frozen_balance || 0),
      agent: row.agent_id ? {
        id: row.agent_id,
        agent_code: row.agent_code,
        username: row.agent_username
      } : null
    }));

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 根据ID获取用户详情
   */
  static async getUserById(id: string): Promise<User | null> {
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
   * 根据Telegram ID获取用户
   */
  static async getUserByTelegramId(telegramId: number): Promise<User | null> {
    const query = `
      SELECT 
        u.*,
        a.agent_code,
        au.username as agent_username
      FROM users u
      LEFT JOIN agents a ON u.agent_id = a.id
      LEFT JOIN users au ON a.user_id = au.id
      WHERE u.telegram_id = $1
    `;
    
    const result = await pool.query(query, [telegramId]);
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
   * 根据邮箱获取用户
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT 
        u.*,
        a.agent_code,
        au.username as agent_username
      FROM users u
      LEFT JOIN agents a ON u.agent_id = a.id
      LEFT JOIN users au ON a.user_id = au.id
      WHERE u.email = $1
    `;
    
    const result = await pool.query(query, [email]);
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
        username, email, phone, telegram_id, telegram_username, 
        wallet_address, password_hash, login_type, type, user_type, 
        agent_id, status, balance, frozen_balance
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, 0)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      username, email, phone, telegram_id, telegram_username,
      wallet_address, hashedPassword, login_type, type, user_type,
      agent_id, status
    ]);

    return this.getUserById(result.rows[0].id);
  }

  /**
   * 更新用户信息
   */
  static async updateUser(id: string, data: UserUpdateData): Promise<User | null> {
    const { username, email, phone, telegram_username, wallet_address, status, type, user_type, agent_id } = data;

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
        throw new Error('用户名已存在');
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
          throw new Error('邮箱已存在');
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

    if (telegram_username !== undefined) {
      updateFields.push(`telegram_username = $${paramIndex}`);
      values.push(telegram_username);
      paramIndex++;
    }

    if (wallet_address !== undefined) {
      updateFields.push(`wallet_address = $${paramIndex}`);
      values.push(wallet_address);
      paramIndex++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (type !== undefined) {
      updateFields.push(`type = $${paramIndex}`);
      values.push(type);
      paramIndex++;
    }

    if (user_type !== undefined) {
      updateFields.push(`user_type = $${paramIndex}`);
      values.push(user_type);
      paramIndex++;
    }

    if (agent_id !== undefined) {
      if (agent_id !== null) {
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
      values.push(agent_id);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      // 没有字段需要更新，直接返回当前数据
      return this.getUserById(id);
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

    return this.getUserById(id);
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

    return this.getUserById(id);
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

  /**
   * 注册 Telegram 用户
   */
  static async registerTelegramUser(telegramData: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  }): Promise<User> {
    const { telegram_id, username, first_name, last_name } = telegramData;

    // 检查用户是否已存在
    const existingUser = await this.getUserByTelegramId(telegram_id);
    if (existingUser) {
      return existingUser;
    }

    // 生成用户名
    let displayName = username || first_name || 'User';
    if (first_name && last_name) {
      displayName = `${first_name} ${last_name}`;
    } else if (first_name) {
      displayName = first_name;
    }

    // 确保用户名唯一
    let finalUsername = displayName;
    let counter = 1;
    while (true) {
      const existingUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [finalUsername]
      );
      if (existingUsername.rows.length === 0) {
        break;
      }
      finalUsername = `${displayName}_${counter}`;
      counter++;
    }

    const query = `
      INSERT INTO users (
        username, telegram_id, telegram_username, login_type, 
        type, user_type, status, balance, frozen_balance
      )
      VALUES ($1, $2, $3, 'telegram', 'user', 'regular', 'active', 0, 0)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      finalUsername, telegram_id, username
    ]);

    return this.getUserById(result.rows[0].id);
  }
}
