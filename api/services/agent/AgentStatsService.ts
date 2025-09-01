/**
 * 代理商统计服务类
 * 从 AgentService.ts 中安全分离的统计相关操作
 * 负责代理商数据统计、分析和报表功能
 */

import pool from '../../config/database.js';

export interface AgentStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  totalUsers: number;
  totalCommission: number;
  averageCommissionRate: number;
  topAgents: {
    id: string;
    agent_code: string;
    username: string;
    total_users: number;
    total_commission: number;
  }[];
}

export interface AgentPerformanceStats {
  agentId: string;
  agentCode: string;
  username: string;
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalCommission: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface AgentGrowthStats {
  date: string;
  newAgents: number;
  totalAgents: number;
  newUsers: number;
  totalUsers: number;
}

export class AgentStatsService {
  /**
   * 获取代理商统计概览
   */
  static async getAgentStats(): Promise<AgentStats> {
    // 基础统计
    const basicStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended,
        AVG(commission_rate) as average_commission_rate
      FROM agents
    `;
    
    const basicResult = await pool.query(basicStatsQuery);
    const basicStats = basicResult.rows[0];

    // 用户和佣金统计
    const userCommissionQuery = `
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COALESCE(SUM(ae.commission_amount), 0) as total_commission
      FROM agents a
      LEFT JOIN users u ON a.id = u.agent_id
      LEFT JOIN agent_earnings ae ON a.id = ae.agent_id AND ae.status = 'paid'
      WHERE a.status = 'active'
    `;
    
    const userCommissionResult = await pool.query(userCommissionQuery);
    const userCommissionStats = userCommissionResult.rows[0];

    // 前5名代理商
    const topAgentsQuery = `
      SELECT 
        a.id,
        a.agent_code,
        u.username,
        COUNT(DISTINCT cu.id) as total_users,
        COALESCE(SUM(ae.commission_amount), 0) as total_commission
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN users cu ON a.id = cu.agent_id
      LEFT JOIN agent_earnings ae ON a.id = ae.agent_id AND ae.status = 'paid'
      WHERE a.status = 'active'
      GROUP BY a.id, a.agent_code, u.username
      ORDER BY total_commission DESC
      LIMIT 5
    `;
    
    const topAgentsResult = await pool.query(topAgentsQuery);
    const topAgents = topAgentsResult.rows.map(row => ({
      id: row.id,
      agent_code: row.agent_code,
      username: row.username,
      total_users: parseInt(row.total_users),
      total_commission: parseFloat(row.total_commission)
    }));

    return {
      total: parseInt(basicStats.total),
      active: parseInt(basicStats.active),
      inactive: parseInt(basicStats.inactive),
      suspended: parseInt(basicStats.suspended),
      totalUsers: parseInt(userCommissionStats.total_users),
      totalCommission: parseFloat(userCommissionStats.total_commission),
      averageCommissionRate: parseFloat(basicStats.average_commission_rate || 0),
      topAgents
    };
  }

  /**
   * 获取代理商绩效统计
   */
  static async getAgentPerformanceStats(agentId?: string): Promise<AgentPerformanceStats[]> {
    const whereClause = agentId ? 'WHERE a.id = $1' : '';
    const values = agentId ? [agentId] : [];

    const query = `
      SELECT 
        a.id as agent_id,
        a.agent_code,
        u.username,
        COUNT(DISTINCT cu.id) as total_users,
        COUNT(CASE WHEN cu.status = 'active' THEN cu.id END) as active_users,
        COUNT(o.id) as total_orders,
        COUNT(CASE WHEN o.status = 'completed' THEN o.id END) as completed_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price END), 0) as total_revenue,
        COALESCE(SUM(ae.commission_amount), 0) as total_commission,
        COALESCE(AVG(CASE WHEN o.status = 'completed' THEN o.price END), 0) as average_order_value
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN users cu ON a.id = cu.agent_id
      LEFT JOIN orders o ON cu.id = o.user_id
      LEFT JOIN agent_earnings ae ON a.id = ae.agent_id AND ae.order_id = o.id AND ae.status = 'paid'
      ${whereClause}
      GROUP BY a.id, a.agent_code, u.username
      ORDER BY total_commission DESC
    `;

    const result = await pool.query(query, values);
    
    return result.rows.map(row => {
      const totalOrders = parseInt(row.total_orders);
      const completedOrders = parseInt(row.completed_orders);
      const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      return {
        agentId: row.agent_id,
        agentCode: row.agent_code,
        username: row.username,
        totalUsers: parseInt(row.total_users),
        activeUsers: parseInt(row.active_users),
        totalOrders,
        completedOrders,
        totalRevenue: parseFloat(row.total_revenue),
        totalCommission: parseFloat(row.total_commission),
        averageOrderValue: parseFloat(row.average_order_value),
        conversionRate: Math.round(conversionRate * 100) / 100
      };
    });
  }

  /**
   * 获取代理商增长趋势
   */
  static async getAgentGrowthStats(days: number = 30): Promise<AgentGrowthStats[]> {
    const query = `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      )
      SELECT 
        ds.date::text,
        COALESCE(daily_agents.new_agents, 0) as new_agents,
        COALESCE(total_agents.total_agents, 0) as total_agents,
        COALESCE(daily_users.new_users, 0) as new_users,
        COALESCE(total_users.total_users, 0) as total_users
      FROM date_series ds
      LEFT JOIN (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_agents
        FROM agents
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
      ) daily_agents ON ds.date = daily_agents.date
      LEFT JOIN (
        SELECT 
          ds2.date,
          COUNT(a.id) as total_agents
        FROM date_series ds2
        LEFT JOIN agents a ON DATE(a.created_at) <= ds2.date
        GROUP BY ds2.date
      ) total_agents ON ds.date = total_agents.date
      LEFT JOIN (
        SELECT 
          DATE(u.created_at) as date,
          COUNT(*) as new_users
        FROM users u
        WHERE u.agent_id IS NOT NULL AND u.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(u.created_at)
      ) daily_users ON ds.date = daily_users.date
      LEFT JOIN (
        SELECT 
          ds3.date,
          COUNT(u.id) as total_users
        FROM date_series ds3
        LEFT JOIN users u ON DATE(u.created_at) <= ds3.date AND u.agent_id IS NOT NULL
        GROUP BY ds3.date
      ) total_users ON ds.date = total_users.date
      ORDER BY ds.date
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      date: row.date,
      newAgents: parseInt(row.new_agents),
      totalAgents: parseInt(row.total_agents),
      newUsers: parseInt(row.new_users),
      totalUsers: parseInt(row.total_users)
    }));
  }

  /**
   * 获取代理商佣金分布统计
   */
  static async getCommissionDistributionStats(): Promise<{
    ranges: { range: string; count: number; total_commission: number }[];
    topCommissionAgents: { agent_code: string; username: string; commission: number }[];
  }> {
    // 佣金区间分布
    const rangesQuery = `
      WITH commission_stats AS (
        SELECT 
          a.id,
          a.agent_code,
          COALESCE(SUM(ae.commission_amount), 0) as total_commission
        FROM agents a
        LEFT JOIN agent_earnings ae ON a.id = ae.agent_id AND ae.status = 'paid'
        GROUP BY a.id, a.agent_code
      )
      SELECT 
        CASE 
          WHEN total_commission = 0 THEN '0'
          WHEN total_commission <= 100 THEN '1-100'
          WHEN total_commission <= 500 THEN '101-500'
          WHEN total_commission <= 1000 THEN '501-1000'
          WHEN total_commission <= 5000 THEN '1001-5000'
          ELSE '5000+'
        END as range,
        COUNT(*) as count,
        SUM(total_commission) as total_commission
      FROM commission_stats
      GROUP BY 
        CASE 
          WHEN total_commission = 0 THEN '0'
          WHEN total_commission <= 100 THEN '1-100'
          WHEN total_commission <= 500 THEN '101-500'
          WHEN total_commission <= 1000 THEN '501-1000'
          WHEN total_commission <= 5000 THEN '1001-5000'
          ELSE '5000+'
        END
      ORDER BY 
        CASE 
          WHEN range = '0' THEN 1
          WHEN range = '1-100' THEN 2
          WHEN range = '101-500' THEN 3
          WHEN range = '501-1000' THEN 4
          WHEN range = '1001-5000' THEN 5
          ELSE 6
        END
    `;

    const rangesResult = await pool.query(rangesQuery);
    const ranges = rangesResult.rows.map(row => ({
      range: row.range,
      count: parseInt(row.count),
      total_commission: parseFloat(row.total_commission)
    }));

    // 前10名佣金获得者
    const topCommissionQuery = `
      SELECT 
        a.agent_code,
        u.username,
        COALESCE(SUM(ae.commission_amount), 0) as commission
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN agent_earnings ae ON a.id = ae.agent_id AND ae.status = 'paid'
      WHERE a.status = 'active'
      GROUP BY a.id, a.agent_code, u.username
      HAVING SUM(ae.commission_amount) > 0
      ORDER BY commission DESC
      LIMIT 10
    `;

    const topCommissionResult = await pool.query(topCommissionQuery);
    const topCommissionAgents = topCommissionResult.rows.map(row => ({
      agent_code: row.agent_code,
      username: row.username,
      commission: parseFloat(row.commission)
    }));

    return { ranges, topCommissionAgents };
  }

  /**
   * 获取特定代理商的详细统计
   */
  static async getAgentDetailedStats(agentId: string): Promise<{
    basic: AgentPerformanceStats;
    monthlyStats: { month: string; users: number; orders: number; revenue: number; commission: number }[];
    userGrowth: { date: string; new_users: number; total_users: number }[];
  } | null> {
    // 基础统计
    const basicStats = await this.getAgentPerformanceStats(agentId);
    if (basicStats.length === 0) {
      return null;
    }

    // 月度统计（最近12个月）
    const monthlyStatsQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') as month,
        COUNT(DISTINCT u.id) as users,
        COUNT(o.id) as orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price END), 0) as revenue,
        COALESCE(SUM(ae.commission_amount), 0) as commission
      FROM agents a
      LEFT JOIN users u ON a.id = u.agent_id
      LEFT JOIN orders o ON u.id = o.user_id
      LEFT JOIN agent_earnings ae ON a.id = ae.agent_id AND ae.order_id = o.id AND ae.status = 'paid'
      WHERE a.id = $1 AND o.created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM')
      ORDER BY month DESC
    `;

    const monthlyResult = await pool.query(monthlyStatsQuery, [agentId]);
    const monthlyStats = monthlyResult.rows.map(row => ({
      month: row.month,
      users: parseInt(row.users),
      orders: parseInt(row.orders),
      revenue: parseFloat(row.revenue),
      commission: parseFloat(row.commission)
    }));

    // 用户增长趋势（最近30天）
    const userGrowthQuery = `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '30 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      )
      SELECT 
        ds.date::text,
        COALESCE(daily.new_users, 0) as new_users,
        COALESCE(total.total_users, 0) as total_users
      FROM date_series ds
      LEFT JOIN (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE agent_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
      ) daily ON ds.date = daily.date
      LEFT JOIN (
        SELECT 
          ds2.date,
          COUNT(u.id) as total_users
        FROM date_series ds2
        LEFT JOIN users u ON DATE(u.created_at) <= ds2.date AND u.agent_id = $1
        GROUP BY ds2.date
      ) total ON ds.date = total.date
      ORDER BY ds.date
    `;

    const userGrowthResult = await pool.query(userGrowthQuery, [agentId]);
    const userGrowth = userGrowthResult.rows.map(row => ({
      date: row.date,
      new_users: parseInt(row.new_users),
      total_users: parseInt(row.total_users)
    }));

    return {
      basic: basicStats[0],
      monthlyStats,
      userGrowth
    };
  }
}