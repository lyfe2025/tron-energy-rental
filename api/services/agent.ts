/**
 * 代理商服务类主文件
 * 整合所有分离的代理商服务模块，保持原有API接口不变
 */

import { AgentService as BaseAgentService } from './agent/AgentService.js';
import { AgentStatsService } from './agent/AgentStatsService.js';

// 导出所有类型定义
export type {
    Agent, AgentCreateData, AgentSearchParams, AgentUpdateData
} from './agent/AgentService.js';

export type {
    AgentPerformanceStats, AgentStats
} from './agent/AgentStatsService.js';

/**
 * 代理商服务类 - 主入口
 * 保持与原文件完全一致的API接口
 */
export class AgentService {
  // ========== 基础CRUD操作 (来自BaseAgentService) ==========
  
  /**
   * 获取代理商列表
   */
  static async getAgents(params: any) {
    return BaseAgentService.getAgents(params);
  }

  /**
   * 根据ID获取代理商详情
   */
  static async getAgentById(id: string) {
    return BaseAgentService.getAgentById(id);
  }

  /**
   * 根据用户ID获取代理商信息
   */
  static async getAgentByUserId(userId: string) {
    return BaseAgentService.getAgentByUserId(userId);
  }

  /**
   * 创建代理商
   */
  static async createAgent(data: any) {
    return BaseAgentService.createAgent(data);
  }

  /**
   * 更新代理商信息
   */
  static async updateAgent(id: string, data: any) {
    return BaseAgentService.updateAgent(id, data);
  }

  /**
   * 更新代理商状态
   */
  static async updateAgentStatus(id: string, status: string) {
    return BaseAgentService.updateAgentStatus(id, status);
  }

  /**
   * 删除代理商
   */
  static async deleteAgent(id: string) {
    return BaseAgentService.deleteAgent(id);
  }

  /**
   * 检查代理商代码是否存在
   */
  static async checkAgentCodeExists(agentCode: string, excludeId?: string) {
    return BaseAgentService.checkAgentCodeExists(agentCode, excludeId);
  }

  /**
   * 生成唯一的代理商代码
   */
  static async generateAgentCode() {
    return BaseAgentService.generateAgentCode();
  }

  // ========== 统计分析功能 (来自AgentStatsService) ==========

  /**
   * 获取代理商统计数据
   */
  static async getAgentStats() {
    return AgentStatsService.getAgentStats();
  }

  /**
   * 获取代理商业绩排行榜
   */
  static async getAgentPerformance(agentId?: string) {
    return AgentStatsService.getAgentPerformanceStats(agentId);
  }

  /**
   * 获取单个代理商的详细统计
   */
  static async getAgentDetailStats(agentId: string) {
    return AgentStatsService.getAgentDetailedStats(agentId);
  }

  /**
   * 获取代理商佣金分布统计
   */
  static async getCommissionDistribution() {
    return AgentStatsService.getCommissionDistributionStats();
  }

  /**
   * 获取代理商增长趋势
   */
  static async getAgentGrowthTrend(days: number = 30) {
    return AgentStatsService.getAgentGrowthStats(days);
  }

  // ========== 批量操作功能 ==========

  /**
   * 批量操作代理商
   */
  static async bulkAction(action: string, agentIds: string[]): Promise<boolean> {
    try {
      const promises = agentIds.map(agentId => {
        switch (action) {
          case 'activate':
            return this.updateAgentStatus(agentId, 'active');
          case 'deactivate':
            return this.updateAgentStatus(agentId, 'inactive');
          case 'suspend':
            return this.updateAgentStatus(agentId, 'suspended');
          case 'delete':
            return this.deleteAgent(agentId);
          default:
            throw new Error(`不支持的批量操作: ${action}`);
        }
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('批量操作失败:', error);
      throw error;
    }
  }

  // ========== 业务逻辑扩展 ==========

  /**
   * 获取代理商的下级用户
   */
  static async getAgentUsers(agentId: string, params: any = {}) {
    const { page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        u.*,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.amount), 0) as total_amount
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
      WHERE u.agent_id = $1
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users 
      WHERE agent_id = $1
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, [agentId, limit, offset]),
      pool.query(countQuery, [agentId])
    ]);

    return {
      users: dataResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * 获取代理商的订单列表
   */
  static async getAgentOrders(agentId: string, params: any = {}) {
    const { page = 1, limit = 20, status } = params;
    const offset = (page - 1) * limit;

    const conditions = ['u.agent_id = $1'];
    const values = [agentId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`o.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT 
        o.*,
        u.username,
        u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
    `;

    values.push(limit.toString(), offset.toString());

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, values.slice(0, -2))
    ]);

    return {
      orders: dataResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }
}

// 导出分离的服务类供高级用法使用
export {
    AgentStatsService, BaseAgentService
};

// 添加数据库连接引用
    import pool from '../config/database.js';
