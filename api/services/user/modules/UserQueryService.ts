/**
 * 用户查询服务类
 * 从 UserCRUDService.ts 中安全分离的查询操作
 * 负责用户的各种查询操作
 */

import pool from '../../../config/database.ts';
import type { User, UserSearchParams } from '../UserService.ts';

export class UserQueryService {
  /**
   * 获取用户列表
   */
  static async getUsers(params: UserSearchParams) {
    const { page, limit, search, status, login_type, type, user_type, agent_id, bot_filter, date_range } = params;
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

    if (bot_filter) {
      conditions.push(`u.bot_id = $${paramIndex}`);
      values.push(bot_filter);
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
        au.username as agent_username,
        tb.bot_name,
        tb.bot_username
      FROM users u
      LEFT JOIN agents a ON u.agent_id = a.id
      LEFT JOIN users au ON a.user_id = au.id
      LEFT JOIN telegram_bots tb ON u.bot_id = tb.id
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
        au.username as agent_username,
        tb.bot_name,
        tb.bot_username
      FROM users u
      LEFT JOIN agents a ON u.agent_id = a.id
      LEFT JOIN users au ON a.user_id = au.id
      LEFT JOIN telegram_bots tb ON u.bot_id = tb.id
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
}
