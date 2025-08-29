/**
 * 用户服务类 - 支持Telegram端和H5网页端用户
 * 处理users表的业务逻辑，支持普通用户、VIP用户、套餐用户三种角色
 */

import pool from '../config/database.js';
import type { PoolClient } from 'pg';

export interface User {
  id: string;
  telegram_id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  email?: string;
  phone?: string;
  password_hash?: string;
  status: 'active' | 'inactive' | 'banned';
  tron_address?: string;
  balance: number;
  total_orders: number;
  total_spent: number;
  total_energy_used: number;
  referral_code?: string;
  referred_by?: string;
  login_type: 'telegram' | 'admin' | 'both';
  user_type: 'normal' | 'vip' | 'premium';
  agent_id?: string;
  agent_code?: string;
  commission_rate?: number;
  usdt_balance?: number;
  trx_balance?: number;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserSearchParams {
  page: number;
  limit: number;
  search?: string;
  user_type?: string;
  status?: string;
  agent_id?: string;
}

export interface UserCreateData {
  telegram_id?: number;
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  login_type: 'telegram' | 'admin' | 'both';
  user_type: 'normal' | 'vip' | 'premium';
  usdt_balance?: number;
  trx_balance?: number;
  agent_id?: string;
  commission_rate?: number;
  status?: 'active' | 'inactive' | 'banned';
}

export interface UserUpdateData {
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  login_type?: 'telegram' | 'admin' | 'both';
  user_type?: 'normal' | 'vip' | 'premium';
  usdt_balance?: number;
  trx_balance?: number;
  agent_id?: string;
  commission_rate?: number;
  status?: 'active' | 'inactive' | 'banned';
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  banned: number;
  normal: number;
  vip: number;
  premium: number;
  totalBalance: number;
  totalUsdtBalance: number;
  totalTrxBalance: number;
}

export class UserService {
  /**
   * 获取用户列表
   */
  static async getUsers(params: UserSearchParams) {
    const client: PoolClient = await pool.connect();
    
    try {
      const { page, limit, search, user_type, status, agent_id } = params;
      const offset = (page - 1) * limit;
      
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;
      
      // 搜索条件
      if (search) {
        whereConditions.push(`(
          username ILIKE $${paramIndex} OR 
          email ILIKE $${paramIndex} OR 
          phone ILIKE $${paramIndex} OR 
          telegram_id::text ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      // 用户类型筛选
      if (user_type && user_type !== 'all') {
        whereConditions.push(`user_type = $${paramIndex}`);
        queryParams.push(user_type);
        paramIndex++;
      }
      
      // 状态筛选
      if (status) {
        whereConditions.push(`status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }
      
      // 代理商筛选
      if (agent_id) {
        whereConditions.push(`agent_id = $${paramIndex}`);
        queryParams.push(agent_id);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
      
      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // 查询数据
      const dataQuery = `
        SELECT 
          tu.*,
          a.agent_code,
          a.commission_rate
        FROM users tu
        LEFT JOIN agents a ON tu.agent_id = a.id
        ${whereClause}
        ORDER BY tu.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const dataResult = await client.query(dataQuery, queryParams);
      
      return {
        users: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * 根据ID获取用户详情
   */
  static async getUserById(id: string): Promise<User | null> {
    const client: PoolClient = await pool.connect();
    
    try {
      const query = `
        SELECT 
          tu.*,
          a.agent_code,
          a.commission_rate
        FROM users tu
        LEFT JOIN agents a ON tu.agent_id = a.id
        WHERE tu.id = $1
      `;
      
      const result = await client.query(query, [id]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * 根据Telegram ID获取用户详情
   */
  static async getUserByTelegramId(telegramId: number): Promise<User | null> {
    const client: PoolClient = await pool.connect();
    
    try {
      const query = `
        SELECT 
          tu.*,
          a.agent_code,
          a.commission_rate
        FROM users tu
        LEFT JOIN agents a ON tu.agent_id = a.id
        WHERE tu.telegram_id = $1
      `;
      
      const result = await client.query(query, [telegramId]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
  
  /**
   * 注册或获取Telegram用户
   */
  static async registerTelegramUser(userData: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  }): Promise<User> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 首先检查用户是否已存在
      const existingUser = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [userData.telegram_id]
      );
      
      if (existingUser.rows.length > 0) {
        // 用户已存在，更新基本信息并返回
        const updateQuery = `
          UPDATE users 
          SET username = $1, first_name = $2, last_name = $3, language_code = $4, updated_at = NOW()
          WHERE telegram_id = $5
          RETURNING *
        `;
        
        const updateResult = await client.query(updateQuery, [
          userData.username || null,
          userData.first_name || null,
          userData.last_name || null,
          userData.language_code || null,
          userData.telegram_id
        ]);
        
        await client.query('COMMIT');
        return updateResult.rows[0];
      }
      
      // 用户不存在，创建新用户
      const insertQuery = `
        INSERT INTO users (
          telegram_id, username, first_name, last_name, language_code,
          user_type, usdt_balance, trx_balance, status, login_type
        ) VALUES (
          $1, $2, $3, $4, $5, 'normal', 0, 0, 'active', 'telegram'
        )
        RETURNING *
      `;
      
      const insertResult = await client.query(insertQuery, [
        userData.telegram_id,
        userData.username || null,
        userData.first_name || null,
        userData.last_name || null,
        userData.language_code || null
      ]);
      
      await client.query('COMMIT');
      return insertResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 创建用户
   */
  static async createUser(userData: UserCreateData): Promise<User> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 检查telegram_id是否已存在（仅当提供了telegram_id时）
      if (userData.telegram_id) {
        const existingUser = await client.query(
          'SELECT id FROM users WHERE telegram_id = $1',
          [userData.telegram_id]
        );
        
        if (existingUser.rows.length > 0) {
          throw new Error('该Telegram ID已存在');
        }
      }
      
      // 检查email是否已存在（仅当提供了email时）
      if (userData.email) {
        const existingEmail = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [userData.email]
        );
        
        if (existingEmail.rows.length > 0) {
          throw new Error('该邮箱已存在');
        }
      }
      
      // 处理密码哈希
      let passwordHash = null;
      if (userData.password) {
        const bcrypt = require('bcrypt');
        passwordHash = await bcrypt.hash(userData.password, 10);
      }
      
      const query = `
        INSERT INTO users (
          telegram_id, username, email, phone, password_hash, login_type, user_type,
          usdt_balance, trx_balance, agent_id, commission_rate, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        RETURNING *
      `;
      
      const values = [
        userData.telegram_id || null,
        userData.username || null,
        userData.email || null,
        userData.phone || null,
        passwordHash,
        userData.login_type,
        userData.user_type,
        userData.usdt_balance || 0,
        userData.trx_balance || 0,
        userData.agent_id || null,
        userData.commission_rate || null,
        userData.status || 'active'
      ];
      
      const result = await client.query(query, values);
      
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * 更新用户
   */
  static async updateUser(id: string, updateData: UserUpdateData): Promise<User | null> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      // 动态构建更新字段
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          if (key === 'password') {
            // 处理密码哈希
            const bcrypt = require('bcrypt');
            const passwordHash = await bcrypt.hash(value as string, 10);
            updateFields.push(`password_hash = $${paramIndex}`);
            values.push(passwordHash);
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('没有提供更新数据');
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(id);
      
      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      await client.query('COMMIT');
      
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * 更新用户状态
   */
  static async updateUserStatus(id: string, status: string): Promise<User | null> {
    const client: PoolClient = await pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await client.query(query, [status, id]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
  
  /**
   * 删除用户
   */
  static async deleteUser(id: string): Promise<boolean> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 检查用户是否存在
      const userExists = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [id]
      );
      
      if (userExists.rows.length === 0) {
        return false;
      }
      
      // 删除用户（注意：这里可能需要处理关联数据）
      await client.query('DELETE FROM users WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * 获取用户统计数据
   */
  static async getUserStats(): Promise<UserStats> {
    const client: PoolClient = await pool.connect();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
          COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned,
          COUNT(CASE WHEN user_type = 'normal' THEN 1 END) as normal,
          COUNT(CASE WHEN user_type = 'vip' THEN 1 END) as vip,
          COUNT(CASE WHEN user_type = 'premium' THEN 1 END) as premium,
          COALESCE(SUM(balance), 0) as total_balance,
          COALESCE(SUM(usdt_balance), 0) as total_usdt_balance,
          COALESCE(SUM(trx_balance), 0) as total_trx_balance
        FROM users
      `;
      
      const result = await client.query(query);
      const row = result.rows[0];
      
      return {
        total: parseInt(row.total),
        active: parseInt(row.active),
        inactive: parseInt(row.inactive),
        banned: parseInt(row.banned),
        normal: parseInt(row.normal),
        vip: parseInt(row.vip),
        premium: parseInt(row.premium),
        totalBalance: parseFloat(row.total_balance),
        totalUsdtBalance: parseFloat(row.total_usdt_balance),
        totalTrxBalance: parseFloat(row.total_trx_balance)
      };
    } finally {
      client.release();
    }
  }
}