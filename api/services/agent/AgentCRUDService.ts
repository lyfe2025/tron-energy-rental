/**
 * 代理商CRUD服务类
 * 从 AgentService.ts 中安全分离的基础CRUD操作
 * 负责代理商的创建、读取、更新、删除等基础操作
 */

import pool from '../../config/database.ts';
import type { Agent, AgentCreateData, AgentSearchParams, AgentUpdateData } from './AgentService.ts';

export class AgentCRUDService {
  /**
   * 获取代理商列表
   */
  static async getAgents(params: AgentSearchParams) {
    const { page, limit, search, status } = params;
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(a.agent_code ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
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
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // 获取数据
    const dataQuery = `
      SELECT 
        a.*,
        u.username,
        u.email,
        u.phone,
        u.telegram_id,
        COUNT(cu.id) as total_users,
        COUNT(CASE WHEN cu.status = 'active' THEN 1 END) as active_users,
        COALESCE(SUM(ae.commission_amount), 0) as total_commission
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN users cu ON a.id = cu.agent_id
      LEFT JOIN agent_earnings ae ON a.id = ae.agent_id AND ae.status = 'paid'
      ${whereClause}
      GROUP BY a.id, u.id, u.username, u.email, u.phone, u.telegram_id
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    
    const dataResult = await pool.query(dataQuery, values);

    // 格式化数据
    const agents = dataResult.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      agent_code: row.agent_code,
      commission_rate: parseFloat(row.commission_rate || 0),
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        email: row.email,
        phone: row.phone,
        telegram_id: row.telegram_id
      },
      stats: {
        total_users: parseInt(row.total_users || 0),
        active_users: parseInt(row.active_users || 0),
        total_commission: parseFloat(row.total_commission || 0)
      }
    }));

    return {
      agents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 根据ID获取代理商详情
   */
  static async getAgentById(id: string): Promise<Agent | null> {
    const query = `
      SELECT 
        a.*,
        u.username,
        u.email,
        u.phone,
        u.telegram_id,
        COUNT(cu.id) as total_users,
        COUNT(CASE WHEN cu.status = 'active' THEN 1 END) as active_users,
        COALESCE(SUM(ae.commission_amount), 0) as total_commission
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN users cu ON a.id = cu.agent_id
      LEFT JOIN agent_earnings ae ON a.id = ae.agent_id AND ae.status = 'paid'
      WHERE a.id = $1
      GROUP BY a.id, u.id, u.username, u.email, u.phone, u.telegram_id
    `;
    
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      agent_code: row.agent_code,
      commission_rate: parseFloat(row.commission_rate || 0),
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        email: row.email,
        phone: row.phone,
        telegram_id: row.telegram_id
      },
      stats: {
        total_users: parseInt(row.total_users || 0),
        active_users: parseInt(row.active_users || 0),
        total_commission: parseFloat(row.total_commission || 0)
      }
    };
  }

  /**
   * 根据用户ID获取代理商
   */
  static async getAgentByUserId(userId: string): Promise<Agent | null> {
    const query = `
      SELECT 
        a.*,
        u.username,
        u.email,
        u.phone,
        u.telegram_id,
        COUNT(cu.id) as total_users,
        COUNT(CASE WHEN cu.status = 'active' THEN 1 END) as active_users,
        COALESCE(SUM(ae.commission_amount), 0) as total_commission
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN users cu ON a.id = cu.agent_id
      LEFT JOIN agent_earnings ae ON a.id = ae.agent_id AND ae.status = 'paid'
      WHERE a.user_id = $1
      GROUP BY a.id, u.id, u.username, u.email, u.phone, u.telegram_id
    `;
    
    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      agent_code: row.agent_code,
      commission_rate: parseFloat(row.commission_rate || 0),
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        email: row.email,
        phone: row.phone,
        telegram_id: row.telegram_id
      },
      stats: {
        total_users: parseInt(row.total_users || 0),
        active_users: parseInt(row.active_users || 0),
        total_commission: parseFloat(row.total_commission || 0)
      }
    };
  }

  /**
   * 创建代理商
   */
  static async createAgent(data: AgentCreateData): Promise<Agent> {
    const { user_id, agent_code, commission_rate, status = 'active' } = data;

    // 验证用户是否存在
    const userExists = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [user_id]
    );
    if (userExists.rows.length === 0) {
      throw new Error('指定的用户不存在');
    }

    // 检查用户是否已经是代理商
    const existingAgent = await pool.query(
      'SELECT id FROM agents WHERE user_id = $1',
      [user_id]
    );
    if (existingAgent.rows.length > 0) {
      throw new Error('该用户已经是代理商');
    }

    // 检查代理商代码是否已存在
    const existingCode = await pool.query(
      'SELECT id FROM agents WHERE agent_code = $1',
      [agent_code]
    );
    if (existingCode.rows.length > 0) {
      throw new Error('代理商代码已存在');
    }

    // 验证佣金率范围
    if (commission_rate < 0 || commission_rate > 100) {
      throw new Error('佣金率必须在0-100之间');
    }

    const query = `
      INSERT INTO agents (user_id, agent_code, commission_rate, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [user_id, agent_code, commission_rate, status]);
    return this.getAgentById(result.rows[0].id);
  }

  /**
   * 更新代理商信息
   */
  static async updateAgent(id: string, data: AgentUpdateData): Promise<Agent | null> {
    const { agent_code, commission_rate, status } = data;

    // 动态构建更新字段
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (agent_code !== undefined) {
      // 检查代理商代码是否已被其他代理商使用
      const existingCode = await pool.query(
        'SELECT id FROM agents WHERE agent_code = $1 AND id != $2',
        [agent_code, id]
      );
      if (existingCode.rows.length > 0) {
        throw new Error('代理商代码已存在');
      }
      updateFields.push(`agent_code = $${paramIndex}`);
      values.push(agent_code);
      paramIndex++;
    }

    if (commission_rate !== undefined) {
      // 验证佣金率范围
      if (commission_rate < 0 || commission_rate > 100) {
        throw new Error('佣金率必须在0-100之间');
      }
      updateFields.push(`commission_rate = $${paramIndex}`);
      values.push(commission_rate);
      paramIndex++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      // 没有字段需要更新，直接返回当前数据
      return this.getAgentById(id);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE agents
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    return this.getAgentById(id);
  }

  /**
   * 更新代理商状态
   */
  static async updateAgentStatus(id: string, status: string): Promise<Agent | null> {
    const query = `
      UPDATE agents
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.getAgentById(id);
  }

  /**
   * 删除代理商
   */
  static async deleteAgent(id: string): Promise<boolean> {
    // 检查是否有关联的用户
    const hasUsers = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE agent_id = $1',
      [id]
    );
    
    if (parseInt(hasUsers.rows[0].count) > 0) {
      throw new Error('该代理商下有用户，无法删除');
    }

    // 检查是否有未完成的订单
    const hasActiveOrders = await pool.query(
      'SELECT COUNT(*) as count FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE u.agent_id = $1 AND o.status IN ($2, $3)',
      [id, 'pending', 'processing']
    );
    
    if (parseInt(hasActiveOrders.rows[0].count) > 0) {
      throw new Error('该代理商有未完成的订单，无法删除');
    }

    const query = 'DELETE FROM agents WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}
