/**
 * 代理商服务类
 * 专门处理agents表的业务逻辑
 */

import pool from '../config/database.js';
import type { PoolClient } from 'pg';

export interface Agent {
  id: string;
  user_id: string;
  agent_code: string;
  commission_rate: number;
  status: 'active' | 'inactive' | 'suspended';
  created_at: Date;
  updated_at: Date;
  // 关联的用户信息
  user?: {
    id: string;
    username?: string;
    email?: string;
    phone?: string;
    telegram_id?: number;
  };
  // 统计信息
  stats?: {
    total_users: number;
    active_users: number;
    total_commission: number;
  };
}

export interface AgentSearchParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export interface AgentCreateData {
  user_id: string;
  agent_code: string;
  commission_rate: number;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface AgentUpdateData {
  agent_code?: string;
  commission_rate?: number;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface AgentStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  totalCommission: number;
  totalUsers: number;
}

export interface AgentUserParams {
  page: number;
  limit: number;
}

export class AgentService {
  /**
   * 获取代理商列表
   */
  static async getAgents(params: AgentSearchParams) {
    const client: PoolClient = await pool.connect();
    
    try {
      const { page, limit, search, status } = params;
      const offset = (page - 1) * limit;
      
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;
      
      // 搜索条件
      if (search) {
        whereConditions.push(`(
          a.agent_code ILIKE $${paramIndex} OR 
          tu.username ILIKE $${paramIndex} OR 
          tu.email ILIKE $${paramIndex} OR 
          tu.phone ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      // 状态筛选
      if (status) {
        whereConditions.push(`a.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
      
      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM agents a
        LEFT JOIN users tu ON a.user_id = tu.id
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // 查询数据
      const dataQuery = `
        SELECT 
          a.*,
          tu.username,
          tu.email,
          tu.phone,
          tu.telegram_id,
          (
            SELECT COUNT(*) 
            FROM users 
            WHERE agent_id = a.id
          ) as total_users,
          (
            SELECT COUNT(*) 
            FROM users 
            WHERE agent_id = a.id AND status = 'active'
          ) as active_users
        FROM agents a
        LEFT JOIN users tu ON a.user_id = tu.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const dataResult = await client.query(dataQuery, queryParams);
      
      // 格式化数据
      const agents = dataResult.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        agent_code: row.agent_code,
        commission_rate: parseFloat(row.commission_rate),
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
          total_commission: 0 // 这里可以后续添加佣金统计
        }
      }));
      
      return {
        agents,
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
   * 根据ID获取代理商详情
   */
  static async getAgentById(id: string): Promise<Agent | null> {
    const client: PoolClient = await pool.connect();
    
    try {
      const query = `
        SELECT 
          a.*,
          tu.username,
          tu.email,
          tu.phone,
          tu.telegram_id,
          (
            SELECT COUNT(*) 
            FROM users 
            WHERE agent_id = a.id
          ) as total_users,
          (
            SELECT COUNT(*) 
            FROM users 
            WHERE agent_id = a.id AND status = 'active'
          ) as active_users
        FROM agents a
        LEFT JOIN users tu ON a.user_id = tu.id
        WHERE a.id = $1
      `;
      
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      return {
        id: row.id,
        user_id: row.user_id,
        agent_code: row.agent_code,
        commission_rate: parseFloat(row.commission_rate),
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
          total_commission: 0
        }
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * 创建代理商
   */
  static async createAgent(agentData: AgentCreateData): Promise<Agent> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 检查用户是否存在
      const userExists = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [agentData.user_id]
      );
      
      if (userExists.rows.length === 0) {
        throw new Error('用户不存在');
      }
      
      // 检查用户是否已经是代理商
      const existingAgent = await client.query(
        'SELECT id FROM agents WHERE user_id = $1',
        [agentData.user_id]
      );
      
      if (existingAgent.rows.length > 0) {
        throw new Error('该用户已经是代理商');
      }
      
      // 检查代理商编码是否已存在
      const existingCode = await client.query(
        'SELECT id FROM agents WHERE agent_code = $1',
        [agentData.agent_code]
      );
      
      if (existingCode.rows.length > 0) {
        throw new Error('代理商编码已存在');
      }
      
      const query = `
        INSERT INTO agents (
          user_id, agent_code, commission_rate, status
        ) VALUES (
          $1, $2, $3, $4
        )
        RETURNING *
      `;
      
      const values = [
        agentData.user_id,
        agentData.agent_code,
        agentData.commission_rate,
        agentData.status || 'active'
      ];
      
      const result = await client.query(query, values);
      
      // 更新用户类型为agent
      await client.query(
        'UPDATE users SET user_type = $1 WHERE id = $2',
        ['agent', agentData.user_id]
      );
      
      await client.query('COMMIT');
      
      // 获取完整的代理商信息
      const agent = await this.getAgentById(result.rows[0].id);
      return agent!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * 更新代理商
   */
  static async updateAgent(id: string, updateData: AgentUpdateData): Promise<Agent | null> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 如果更新代理商编码，检查是否已存在
      if (updateData.agent_code) {
        const existingCode = await client.query(
          'SELECT id FROM agents WHERE agent_code = $1 AND id != $2',
          [updateData.agent_code, id]
        );
        
        if (existingCode.rows.length > 0) {
          throw new Error('代理商编码已存在');
        }
      }
      
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      // 动态构建更新字段
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('没有提供更新数据');
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(id);
      
      const query = `
        UPDATE agents 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      await client.query('COMMIT');
      
      // 获取完整的代理商信息
      const agent = await this.getAgentById(id);
      return agent;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * 更新代理商状态
   */
  static async updateAgentStatus(id: string, status: string): Promise<Agent | null> {
    const client: PoolClient = await pool.connect();
    
    try {
      const query = `
        UPDATE agents 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await client.query(query, [status, id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // 获取完整的代理商信息
      const agent = await this.getAgentById(id);
      return agent;
    } finally {
      client.release();
    }
  }
  
  /**
   * 删除代理商
   */
  static async deleteAgent(id: string): Promise<boolean> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 检查代理商是否存在
      const agentExists = await client.query(
        'SELECT user_id FROM agents WHERE id = $1',
        [id]
      );
      
      if (agentExists.rows.length === 0) {
        return false;
      }
      
      const userId = agentExists.rows[0].user_id;
      
      // 检查是否有下级用户
      const hasUsers = await client.query(
        'SELECT COUNT(*) as count FROM users WHERE agent_id = $1',
        [id]
      );
      
      if (parseInt(hasUsers.rows[0].count) > 0) {
        throw new Error('该代理商下还有用户，无法删除');
      }
      
      // 删除代理商
      await client.query('DELETE FROM agents WHERE id = $1', [id]);
      
      // 将用户类型改回普通用户
      await client.query(
        'UPDATE users SET user_type = $1 WHERE id = $2',
        ['normal', userId]
      );
      
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
   * 获取代理商统计数据
   */
  static async getAgentStats(): Promise<AgentStats> {
    const client: PoolClient = await pool.connect();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended,
          (
            SELECT COUNT(*) 
            FROM users 
            WHERE agent_id IS NOT NULL
          ) as total_users
        FROM agents
      `;
      
      const result = await client.query(query);
      const row = result.rows[0];
      
      return {
        total: parseInt(row.total),
        active: parseInt(row.active),
        inactive: parseInt(row.inactive),
        suspended: parseInt(row.suspended),
        totalCommission: 0, // 这里可以后续添加佣金统计
        totalUsers: parseInt(row.total_users)
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * 获取代理商的下级用户
   */
  static async getAgentUsers(agentId: string, params: AgentUserParams) {
    const client: PoolClient = await pool.connect();
    
    try {
      const { page, limit } = params;
      const offset = (page - 1) * limit;
      
      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users
        WHERE agent_id = $1
      `;
      
      const countResult = await client.query(countQuery, [agentId]);
      const total = parseInt(countResult.rows[0].total);
      
      // 查询数据
      const dataQuery = `
        SELECT *
        FROM users
        WHERE agent_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const dataResult = await client.query(dataQuery, [agentId, limit, offset]);
      
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
}