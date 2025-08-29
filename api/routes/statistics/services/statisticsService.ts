/**
 * 统计分析业务逻辑服务
 */
import { query } from '../../../config/database.js';
import type {
    BotStatistics,
    BotStatusStats,
    OrderStatistics,
    OverviewStats,
    RealtimeStatistics,
    RevenueStatistics,
    StatisticsQuery,
    UserStatistics
} from '../types/statistics.types.js';

export class StatisticsService {
  /**
   * 获取总览统计数据
   */
  async getOverviewStats(period = '30'): Promise<OverviewStats> {
    const days = Number(period);
    
    // 获取基础统计数据
    const overviewStats = await query(`
      SELECT 
        -- 用户统计
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days') as new_users,
        
        -- 订单统计
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'completed') as completed_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
        (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days') as recent_orders,
        
        -- 收入统计
        (SELECT COALESCE(SUM(price), 0) FROM orders WHERE status = 'completed') as total_revenue,
        (SELECT COALESCE(SUM(price), 0) FROM orders WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '${days} days') as recent_revenue,
        
        -- 机器人统计
        (SELECT COUNT(*) FROM telegram_bots) as total_bots,
        (SELECT COUNT(*) FROM telegram_bots WHERE is_active = true) as active_bots
    `);

    const stats = overviewStats.rows[0];

    return {
      total_orders: parseInt(stats.total_orders),
      total_revenue: parseFloat(stats.total_revenue),
      total_users: parseInt(stats.total_users), // 添加总用户数字段
      active_users: parseInt(stats.active_users),
      online_bots: parseInt(stats.active_bots),
      orders_change: 0, // 简化实现
      revenue_change: 0,
      users_change: 0,
      bots_change: 0
    };
  }

  /**
   * 获取订单统计数据
   */
  async getOrderStats(queryParams: StatisticsQuery): Promise<OrderStatistics> {
    const { period = '30', group_by = 'day' } = queryParams;
    const days = Number(period);

    // 时间序列统计（简化实现）
    const timeSeriesStats = await query(`
      SELECT 
        DATE(o.created_at) as period,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price END), 0) as revenue
      FROM orders o
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(o.created_at)
      ORDER BY period
    `);

    return {
      time_series: timeSeriesStats.rows,
      by_status: [],
      by_package: [],
      top_users: [],
      period_days: days,
      group_by: group_by
    };
  }

  /**
   * 获取收入统计数据
   */
  async getRevenueStats(queryParams: StatisticsQuery): Promise<RevenueStatistics> {
    const { period = '30', group_by = 'day' } = queryParams;
    const days = Number(period);

    const revenueTimeSeries = await query(`
      SELECT 
        DATE(o.created_at) as period,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price END), 0) as revenue,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders
      FROM orders o
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(o.created_at)
      ORDER BY period
    `);

    return {
      time_series: revenueTimeSeries.rows,
      by_package: [],
      agent_earnings: [],
      summary: {
        current_period_revenue: 0,
        previous_period_revenue: 0,
        growth_rate: 0
      },
      period_days: days,
      group_by: group_by
    };
  }

  /**
   * 获取用户活跃度统计
   */
  async getUserStats(period = '30'): Promise<UserStatistics> {
    const days = Number(period);

    // 获取用户概览统计
    const overviewStats = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
        COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned_users,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as new_users_today,
        COUNT(CASE WHEN DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as new_users_month,
        COALESCE(SUM(usdt_balance), 0) as total_balance,
        COALESCE(AVG(usdt_balance), 0) as average_balance
      FROM users
    `);

    const registrationTrend = await query(`
      SELECT 
        DATE(u.created_at) as date,
        COUNT(*) as new_users
      FROM users u
      WHERE u.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(u.created_at)
      ORDER BY date
    `);

    const overview = overviewStats.rows[0];

    return {
      overview: {
        total_users: parseInt(overview.total_users),
        active_users: parseInt(overview.active_users),
        inactive_users: parseInt(overview.inactive_users),
        banned_users: parseInt(overview.banned_users),
        new_users_today: parseInt(overview.new_users_today),
        new_users_month: parseInt(overview.new_users_month),
        total_balance: parseFloat(overview.total_balance),
        average_balance: parseFloat(overview.average_balance)
      },
      registration_trend: registrationTrend.rows,
      activity_trend: [],
      user_segmentation: [],
      retention_analysis: [],
      user_distribution: [],
      period_days: days
    };
  }

  /**
   * 获取机器人使用率统计
   */
  async getBotStats(period = '30'): Promise<BotStatistics> {
    const days = Number(period);

    const botStats = await query(`
      SELECT 
        b.id,
        b.bot_name as name,
        b.bot_username as username,
        b.is_active as status,
        b.created_at
      FROM telegram_bots b
      ORDER BY b.created_at DESC
    `);

    return {
      bot_overview: botStats.rows,
      order_statistics: [],
      usage_trend: [],
      performance_metrics: [],
      error_statistics: [],
      period_days: days
    };
  }

  /**
   * 获取实时统计数据
   */
  async getRealtimeStats(): Promise<RealtimeStatistics> {
    const realtimeStats = await query(`
      SELECT 
        COUNT(CASE WHEN DATE(o.created_at) = CURRENT_DATE THEN 1 END) as orders_today,
        COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURRENT_DATE AND o.status = 'completed' THEN o.price END), 0) as revenue_today,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders
      FROM orders o
    `);

    return {
      realtime_metrics: realtimeStats.rows[0],
      recent_orders: [],
      system_status: {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取机器人状态统计
   */
  async getBotStatusStats(): Promise<BotStatusStats> {
    const botStatusStats = await query(`
      SELECT 
        CASE WHEN is_active = true THEN 'active' ELSE 'inactive' END as status,
        COUNT(*) as count
      FROM telegram_bots 
      GROUP BY is_active
      ORDER BY count DESC
    `);

    const statusCounts = {
      online: 0,
      offline: 0,
      error: 0,
      maintenance: 0
    };

    botStatusStats.rows.forEach(row => {
      const status = row.status.toLowerCase();
      const count = parseInt(row.count);
      
      switch (status) {
        case 'active':
        case 'online':
          statusCounts.online = count;
          break;
        case 'inactive':
        case 'offline':
          statusCounts.offline = count;
          break;
        case 'error':
        case 'failed':
          statusCounts.error = count;
          break;
        case 'maintenance':
          statusCounts.maintenance = count;
          break;
      }
    });

    return {
      ...statusCounts,
      chart_data: botStatusStats.rows
    };
  }
}
