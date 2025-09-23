/**
 * 用户统计服务类
 * 从 UserService.ts 中安全分离的统计相关操作
 * 负责用户数据统计、分析和报表功能
 */

import pool from '../../config/database.ts';

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  bannedUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByType: {
    regular: number;
    vip: number;
    premium: number;
  };
  usersByLoginType: {
    telegram: number;
    email: number;
  };
  totalBalance: number;
  averageBalance: number;
}

export interface UserGrowthStats {
  date: string;
  newUsers: number;
  totalUsers: number;
}

export class UserStatsService {
  /**
   * 获取用户统计概览
   */
  static async getUserStats(): Promise<UserStats> {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 基础统计查询
    const basicStatsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
        COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned_users,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as new_users_today,
        COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_users_this_week,
        COUNT(CASE WHEN created_at >= $2 THEN 1 END) as new_users_this_month,
        SUM(balance) as total_balance,
        AVG(balance) as average_balance
      FROM users
    `;
    
    const basicStatsResult = await pool.query(basicStatsQuery, [weekAgo, monthAgo]);
    const basicStats = basicStatsResult.rows[0];

    // 用户类型统计
    const userTypeStatsQuery = `
      SELECT 
        user_type,
        COUNT(*) as count
      FROM users
      WHERE status = 'active'
      GROUP BY user_type
    `;
    const userTypeStatsResult = await pool.query(userTypeStatsQuery);
    
    const usersByType = {
      regular: 0,
      vip: 0,
      premium: 0
    };
    
    userTypeStatsResult.rows.forEach(row => {
      usersByType[row.user_type as keyof typeof usersByType] = parseInt(row.count);
    });

    // 登录类型统计
    const loginTypeStatsQuery = `
      SELECT 
        login_type,
        COUNT(*) as count
      FROM users
      WHERE status = 'active'
      GROUP BY login_type
    `;
    const loginTypeStatsResult = await pool.query(loginTypeStatsQuery);
    
    const usersByLoginType = {
      telegram: 0,
      email: 0
    };
    
    loginTypeStatsResult.rows.forEach(row => {
      usersByLoginType[row.login_type as keyof typeof usersByLoginType] = parseInt(row.count);
    });

    return {
      totalUsers: parseInt(basicStats.total_users),
      activeUsers: parseInt(basicStats.active_users),
      inactiveUsers: parseInt(basicStats.inactive_users),
      bannedUsers: parseInt(basicStats.banned_users),
      newUsersToday: parseInt(basicStats.new_users_today),
      newUsersThisWeek: parseInt(basicStats.new_users_this_week),
      newUsersThisMonth: parseInt(basicStats.new_users_this_month),
      usersByType,
      usersByLoginType,
      totalBalance: parseFloat(basicStats.total_balance || 0),
      averageBalance: parseFloat(basicStats.average_balance || 0)
    };
  }

  /**
   * 获取用户增长趋势数据
   */
  static async getUserGrowthStats(days: number = 30): Promise<UserGrowthStats[]> {
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
        COALESCE(daily.new_users, 0) as new_users,
        COALESCE(total.total_users, 0) as total_users
      FROM date_series ds
      LEFT JOIN (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
      ) daily ON ds.date = daily.date
      LEFT JOIN (
        SELECT 
          ds2.date,
          COUNT(u.id) as total_users
        FROM date_series ds2
        LEFT JOIN users u ON DATE(u.created_at) <= ds2.date
        GROUP BY ds2.date
      ) total ON ds.date = total.date
      ORDER BY ds.date
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      date: row.date,
      newUsers: parseInt(row.new_users),
      totalUsers: parseInt(row.total_users)
    }));
  }

  /**
   * 获取代理商用户分布统计
   */
  static async getAgentUserStats(): Promise<{ agentId: string; agentCode: string; userCount: number }[]> {
    const query = `
      SELECT 
        a.id as agent_id,
        a.agent_code,
        COUNT(u.id) as user_count
      FROM agents a
      LEFT JOIN users u ON a.id = u.agent_id AND u.status = 'active'
      WHERE a.status = 'active'
      GROUP BY a.id, a.agent_code
      ORDER BY user_count DESC
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      agentId: row.agent_id,
      agentCode: row.agent_code,
      userCount: parseInt(row.user_count)
    }));
  }

  /**
   * 获取用户余额分布统计
   */
  static async getBalanceDistributionStats(): Promise<{
    zeroBalance: number;
    lowBalance: number;
    mediumBalance: number;
    highBalance: number;
  }> {
    const query = `
      SELECT 
        COUNT(CASE WHEN balance = 0 THEN 1 END) as zero_balance,
        COUNT(CASE WHEN balance > 0 AND balance <= 100 THEN 1 END) as low_balance,
        COUNT(CASE WHEN balance > 100 AND balance <= 1000 THEN 1 END) as medium_balance,
        COUNT(CASE WHEN balance > 1000 THEN 1 END) as high_balance
      FROM users
      WHERE status = 'active'
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    return {
      zeroBalance: parseInt(stats.zero_balance),
      lowBalance: parseInt(stats.low_balance),
      mediumBalance: parseInt(stats.medium_balance),
      highBalance: parseInt(stats.high_balance)
    };
  }

  /**
   * 获取用户活跃度统计
   */
  static async getActivityStats(): Promise<{
    todayActive: number;
    weekActive: number;
    monthActive: number;
    neverLoggedIn: number;
  }> {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const query = `
      SELECT 
        COUNT(CASE WHEN DATE(last_login) = CURRENT_DATE THEN 1 END) as today_active,
        COUNT(CASE WHEN last_login >= $1 THEN 1 END) as week_active,
        COUNT(CASE WHEN last_login >= $2 THEN 1 END) as month_active,
        COUNT(CASE WHEN last_login IS NULL THEN 1 END) as never_logged_in
      FROM users
      WHERE status = 'active'
    `;

    const result = await pool.query(query, [weekAgo, monthAgo]);
    const stats = result.rows[0];

    return {
      todayActive: parseInt(stats.today_active),
      weekActive: parseInt(stats.week_active),
      monthActive: parseInt(stats.month_active),
      neverLoggedIn: parseInt(stats.never_logged_in)
    };
  }

  /**
   * 获取特定用户的统计信息
   */
  static async getUserPersonalStats(userId: string): Promise<{
    totalOrders: number;
    completedOrders: number;
    totalSpent: number;
    registrationDays: number;
    lastLoginDays: number | null;
  } | null> {
    const query = `
      SELECT 
        u.created_at,
        u.last_login,
        COUNT(o.id) as total_orders,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
        COALESCE(SUM(o.amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.created_at, u.last_login
    `;

    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];
    const now = new Date();
    const registrationDate = new Date(data.created_at);
    const registrationDays = Math.floor((now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let lastLoginDays = null;
    if (data.last_login) {
      const lastLoginDate = new Date(data.last_login);
      lastLoginDays = Math.floor((now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      totalOrders: parseInt(data.total_orders),
      completedOrders: parseInt(data.completed_orders),
      totalSpent: parseFloat(data.total_spent),
      registrationDays,
      lastLoginDays
    };
  }
}