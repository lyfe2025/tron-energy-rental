/**
 * 统计分析API路由
 * 处理订单统计、收入统计、用户活跃度、机器人使用率等功能
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth.js';

const router: Router = Router();

/**
 * 获取总览统计数据
 * GET /api/statistics/overview
 * 权限：管理员
 */
router.get('/overview', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query; // 默认30天
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
        (SELECT COUNT(*) FROM bots) as total_bots,
        (SELECT COUNT(*) FROM bots WHERE status = 'active') as active_bots,
        
        -- 能量包统计
        (SELECT COUNT(*) FROM energy_packages) as total_packages,
        (SELECT COUNT(*) FROM energy_packages WHERE is_active = true) as active_packages
    `);
    
    // 获取今日统计
    const todayStats = await query(`
      SELECT 
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as orders_today,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE AND status = 'completed' THEN price END), 0) as revenue_today,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as new_users_today
      FROM orders
      FULL OUTER JOIN users ON false -- 用于合并查询
    `);
    
    // 计算增长率（与前一个周期对比）
    const previousPeriodStats = await query(`
      SELECT 
        COUNT(*) as prev_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price END), 0) as prev_revenue
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days * 2} days' 
        AND created_at < CURRENT_DATE - INTERVAL '${days} days'
    `);
    
    const stats = overviewStats.rows[0];
    const today = todayStats.rows[0];
    const previous = previousPeriodStats.rows[0];
    
    // 计算增长率
    const orderGrowthRate = previous.prev_orders > 0 
      ? ((stats.recent_orders - previous.prev_orders) / previous.prev_orders * 100).toFixed(2)
      : '0';
    
    const revenueGrowthRate = previous.prev_revenue > 0 
      ? ((stats.recent_revenue - previous.prev_revenue) / previous.prev_revenue * 100).toFixed(2)
      : '0';
    
    res.status(200).json({
      success: true,
      message: '总览统计数据获取成功',
      data: {
        overview: {
          users: {
            total: parseInt(stats.total_users),
            active: parseInt(stats.active_users),
            new_in_period: parseInt(stats.new_users),
            new_today: parseInt(today.new_users_today)
          },
          orders: {
            total: parseInt(stats.total_orders),
            completed: parseInt(stats.completed_orders),
            pending: parseInt(stats.pending_orders),
            recent: parseInt(stats.recent_orders),
            today: parseInt(today.orders_today),
            growth_rate: parseFloat(orderGrowthRate)
          },
          revenue: {
            total: parseFloat(stats.total_revenue),
            recent: parseFloat(stats.recent_revenue),
            today: parseFloat(today.revenue_today),
            growth_rate: parseFloat(revenueGrowthRate)
          },
          bots: {
            total: parseInt(stats.total_bots),
            active: parseInt(stats.active_bots)
          },
          packages: {
            total: parseInt(stats.total_packages),
            active: parseInt(stats.active_packages)
          }
        },
        period_days: days
      }
    });
    
  } catch (error) {
    console.error('获取总览统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取订单统计数据
 * GET /api/statistics/orders
 * 权限：管理员
 */
router.get('/orders', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      period = '30',
      group_by = 'day' // day, week, month
    } = req.query;
    
    const days = Number(period);
    let dateFormat: string;
    let dateInterval: string;
    
    switch (group_by) {
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        dateInterval = '1 week';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        dateInterval = '1 month';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
        dateInterval = '1 day';
    }
    
    // 获取时间序列订单统计
    const timeSeriesStats = await query(`
      SELECT 
        TO_CHAR(created_at, '${dateFormat}') as period,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price END), 0) as revenue
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY TO_CHAR(created_at, '${dateFormat}')
      ORDER BY period
    `);
    
    // 获取按状态分组的统计
    const statusStats = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(price), 0) as total_amount,
        COALESCE(AVG(price), 0) as avg_amount
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY status
      ORDER BY count DESC
    `);
    
    // 获取按能量包分组的统计
    const packageStats = await query(`
      SELECT 
        ep.name as package_name,
        ep.energy_amount,
        ep.price as package_price,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.price), 0) as total_revenue,
        COALESCE(AVG(o.price), 0) as avg_order_value
      FROM orders o
      JOIN energy_packages ep ON o.package_id = ep.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY ep.id, ep.name, ep.energy_amount, ep.price
      ORDER BY order_count DESC
      LIMIT 10
    `);
    
    // 获取按用户分组的统计（Top用户）
    const topUsersStats = await query(`
      SELECT 
        u.telegram_id,
        u.username,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.price), 0) as total_spent,
        COALESCE(AVG(o.price), 0) as avg_order_value
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY u.id, u.telegram_id, u.username
      ORDER BY total_spent DESC
      LIMIT 10
    `);
    
    res.status(200).json({
      success: true,
      message: '订单统计数据获取成功',
      data: {
        time_series: timeSeriesStats.rows,
        by_status: statusStats.rows,
        by_package: packageStats.rows,
        top_users: topUsersStats.rows,
        period_days: days,
        group_by
      }
    });
    
  } catch (error) {
    console.error('获取订单统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取收入统计数据
 * GET /api/statistics/revenue
 * 权限：管理员
 */
router.get('/revenue', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      period = '30',
      group_by = 'day'
    } = req.query;
    
    const days = Number(period);
    let dateFormat: string;
    
    switch (group_by) {
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }
    
    // 获取时间序列收入统计
    const revenueTimeSeries = await query(`
      SELECT 
        TO_CHAR(created_at, '${dateFormat}') as period,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price END), 0) as revenue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN price END), 0) as avg_order_value
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY TO_CHAR(created_at, '${dateFormat}')
      ORDER BY period
    `);
    
    // 获取收入来源分析（按能量包）
    const revenueByPackage = await query(`
      SELECT 
        ep.name as package_name,
        ep.energy_amount,
        COALESCE(SUM(o.price), 0) as total_revenue,
        COUNT(o.id) as order_count,
        ROUND((COALESCE(SUM(o.price), 0) * 100.0 / (
          SELECT COALESCE(SUM(price), 1) 
          FROM orders 
          WHERE status = 'completed' 
            AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
        )), 2) as revenue_percentage
      FROM orders o
      JOIN energy_packages ep ON o.package_id = ep.id
      WHERE o.status = 'completed' 
        AND o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY ep.id, ep.name, ep.energy_amount
      ORDER BY total_revenue DESC
    `);
    
    // 获取代理商收入统计
    const agentRevenue = await query(`
      SELECT 
        u.username as agent_name,
        u.telegram_id,
        COALESCE(SUM(ae.amount), 0) as total_earnings,
        COUNT(ae.id) as earning_records,
        COALESCE(AVG(ae.amount), 0) as avg_earning
      FROM agent_earnings ae
      JOIN users u ON ae.agent_id = u.id
      WHERE ae.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY u.id, u.username, u.telegram_id
      ORDER BY total_earnings DESC
      LIMIT 10
    `);
    
    // 计算收入趋势
    const currentPeriodRevenue = await query(`
      SELECT COALESCE(SUM(price), 0) as current_revenue
      FROM orders 
      WHERE status = 'completed' 
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
    `);
    
    const previousPeriodRevenue = await query(`
      SELECT COALESCE(SUM(price), 0) as previous_revenue
      FROM orders 
      WHERE status = 'completed' 
        AND created_at >= CURRENT_DATE - INTERVAL '${days * 2} days'
        AND created_at < CURRENT_DATE - INTERVAL '${days} days'
    `);
    
    const currentRevenue = parseFloat(currentPeriodRevenue.rows[0].current_revenue);
    const previousRevenue = parseFloat(previousPeriodRevenue.rows[0].previous_revenue);
    const growthRate = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(2)
      : '0';
    
    res.status(200).json({
      success: true,
      message: '收入统计数据获取成功',
      data: {
        time_series: revenueTimeSeries.rows,
        by_package: revenueByPackage.rows,
        agent_earnings: agentRevenue.rows,
        summary: {
          current_period_revenue: currentRevenue,
          previous_period_revenue: previousRevenue,
          growth_rate: parseFloat(growthRate)
        },
        period_days: days,
        group_by
      }
    });
    
  } catch (error) {
    console.error('获取收入统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取用户活跃度统计
 * GET /api/statistics/users
 * 权限：管理员
 */
router.get('/users', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;
    const days = Number(period);
    
    // 获取用户注册趋势
    const registrationTrend = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    // 获取用户活跃度（按订单活动）
    const userActivity = await query(`
      SELECT 
        DATE(o.created_at) as date,
        COUNT(DISTINCT o.user_id) as active_users,
        COUNT(o.id) as total_orders
      FROM orders o
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(o.created_at)
      ORDER BY date
    `);
    
    // 获取用户分层统计
    const userSegmentation = await query(`
      SELECT 
        CASE 
          WHEN order_count = 0 THEN '未下单用户'
          WHEN order_count = 1 THEN '单次用户'
          WHEN order_count BETWEEN 2 AND 5 THEN '低频用户'
          WHEN order_count BETWEEN 6 AND 20 THEN '中频用户'
          ELSE '高频用户'
        END as user_segment,
        COUNT(*) as user_count,
        COALESCE(AVG(total_spent), 0) as avg_spent
      FROM (
        SELECT 
          u.id,
          COUNT(o.id) as order_count,
          COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price END), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id 
          AND o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY u.id
      ) user_stats
      GROUP BY 
        CASE 
          WHEN order_count = 0 THEN '未下单用户'
          WHEN order_count = 1 THEN '单次用户'
          WHEN order_count BETWEEN 2 AND 5 THEN '低频用户'
          WHEN order_count BETWEEN 6 AND 20 THEN '中频用户'
          ELSE '高频用户'
        END
      ORDER BY 
        CASE 
          WHEN user_segment = '高频用户' THEN 1
          WHEN user_segment = '中频用户' THEN 2
          WHEN user_segment = '低频用户' THEN 3
          WHEN user_segment = '单次用户' THEN 4
          ELSE 5
        END
    `);
    
    // 获取用户留存率
    const retentionStats = await query(`
      WITH user_cohorts AS (
        SELECT 
          u.id,
          DATE_TRUNC('week', u.created_at) as cohort_week,
          u.created_at as registration_date
        FROM users u
        WHERE u.created_at >= CURRENT_DATE - INTERVAL '8 weeks'
      ),
      user_activities AS (
        SELECT 
          uc.id,
          uc.cohort_week,
          DATE_TRUNC('week', o.created_at) as activity_week
        FROM user_cohorts uc
        LEFT JOIN orders o ON uc.id = o.user_id
        WHERE o.created_at IS NOT NULL
      )
      SELECT 
        cohort_week,
        COUNT(DISTINCT uc.id) as cohort_size,
        COUNT(DISTINCT CASE WHEN ua.activity_week = uc.cohort_week THEN ua.id END) as week_0,
        COUNT(DISTINCT CASE WHEN ua.activity_week = uc.cohort_week + INTERVAL '1 week' THEN ua.id END) as week_1,
        COUNT(DISTINCT CASE WHEN ua.activity_week = uc.cohort_week + INTERVAL '2 weeks' THEN ua.id END) as week_2,
        COUNT(DISTINCT CASE WHEN ua.activity_week = uc.cohort_week + INTERVAL '3 weeks' THEN ua.id END) as week_3
      FROM user_cohorts uc
      LEFT JOIN user_activities ua ON uc.id = ua.id
      GROUP BY cohort_week
      ORDER BY cohort_week
    `);
    
    // 获取用户地理分布（如果有相关数据）
    const userStats = await query(`
      SELECT 
        role,
        status,
        COUNT(*) as count
      FROM users
      GROUP BY role, status
      ORDER BY role, status
    `);
    
    res.status(200).json({
      success: true,
      message: '用户活跃度统计获取成功',
      data: {
        registration_trend: registrationTrend.rows,
        activity_trend: userActivity.rows,
        user_segmentation: userSegmentation.rows,
        retention_analysis: retentionStats.rows,
        user_distribution: userStats.rows,
        period_days: days
      }
    });
    
  } catch (error) {
    console.error('获取用户活跃度统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取机器人使用率统计
 * GET /api/statistics/bots
 * 权限：管理员
 */
router.get('/bots', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;
    const days = Number(period);
    
    // 获取机器人基础统计
    const botStats = await query(`
      SELECT 
        b.id,
        b.name,
        b.username,
        b.status,
        b.created_at,
        COUNT(bu.id) as total_users,
        COUNT(CASE WHEN bu.created_at >= CURRENT_DATE - INTERVAL '${days} days' THEN 1 END) as new_users_period,
        COUNT(CASE WHEN bu.last_interaction >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_users_week
      FROM bots b
      LEFT JOIN bot_users bu ON b.id = bu.bot_id
      GROUP BY b.id, b.name, b.username, b.status, b.created_at
      ORDER BY total_users DESC
    `);
    
    // 获取机器人订单处理统计
    const botOrderStats = await query(`
      SELECT 
        b.id,
        b.name,
        COUNT(o.id) as total_orders,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN o.status = 'failed' THEN 1 END) as failed_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN o.status = 'completed' THEN o.price END), 0) as avg_order_value,
        COUNT(CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '${days} days' THEN 1 END) as recent_orders
      FROM bots b
      LEFT JOIN bot_users bu ON b.id = bu.bot_id
      LEFT JOIN orders o ON bu.user_id = o.user_id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days' OR o.id IS NULL
      GROUP BY b.id, b.name
      ORDER BY total_revenue DESC
    `);
    
    // 获取机器人使用趋势
    const botUsageTrend = await query(`
      SELECT 
        DATE(bu.created_at) as date,
        b.name as bot_name,
        COUNT(bu.id) as new_users
      FROM bot_users bu
      JOIN bots b ON bu.bot_id = b.id
      WHERE bu.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(bu.created_at), b.id, b.name
      ORDER BY date, bot_name
    `);
    
    // 获取机器人性能指标
    const botPerformance = await query(`
      SELECT 
        b.id,
        b.name,
        b.status,
        -- 计算成功率
        CASE 
          WHEN COUNT(o.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN o.status = 'completed' THEN 1 END) * 100.0 / COUNT(o.id)), 2)
          ELSE 0
        END as success_rate,
        -- 计算平均响应时间（如果有相关字段）
        COUNT(DISTINCT bu.user_id) as unique_users,
        -- 计算用户留存率
        CASE 
          WHEN COUNT(bu.id) > 0 THEN
            ROUND((COUNT(CASE WHEN bu.last_interaction >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) * 100.0 / COUNT(bu.id)), 2)
          ELSE 0
        END as user_retention_rate
      FROM bots b
      LEFT JOIN bot_users bu ON b.id = bu.bot_id
      LEFT JOIN orders o ON bu.user_id = o.user_id 
        AND o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY b.id, b.name, b.status
      ORDER BY success_rate DESC
    `);
    
    // 获取机器人错误统计（如果有错误日志表）
    const botErrors = await query(`
      SELECT 
        'system' as error_type,
        COUNT(*) as error_count
      FROM orders 
      WHERE status = 'failed' 
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
    `);
    
    res.status(200).json({
      success: true,
      message: '机器人使用率统计获取成功',
      data: {
        bot_overview: botStats.rows,
        order_statistics: botOrderStats.rows,
        usage_trend: botUsageTrend.rows,
        performance_metrics: botPerformance.rows,
        error_statistics: botErrors.rows,
        period_days: days
      }
    });
    
  } catch (error) {
    console.error('获取机器人使用率统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取实时统计数据
 * GET /api/statistics/realtime
 * 权限：管理员
 */
router.get('/realtime', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取实时数据（最近24小时）
    const realtimeStats = await query(`
      SELECT 
        -- 今日数据
        COUNT(CASE WHEN DATE(o.created_at) = CURRENT_DATE THEN 1 END) as orders_today,
        COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURRENT_DATE AND o.status = 'completed' THEN o.price END), 0) as revenue_today,
        
        -- 最近1小时
        COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as orders_last_hour,
        COALESCE(SUM(CASE WHEN o.created_at >= NOW() - INTERVAL '1 hour' AND o.status = 'completed' THEN o.price END), 0) as revenue_last_hour,
        
        -- 最近24小时
        COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as orders_24h,
        COALESCE(SUM(CASE WHEN o.created_at >= NOW() - INTERVAL '24 hours' AND o.status = 'completed' THEN o.price END), 0) as revenue_24h,
        
        -- 当前待处理订单
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
        
        -- 在线用户（最近5分钟有活动）
        (SELECT COUNT(DISTINCT user_id) FROM bot_users WHERE last_interaction >= NOW() - INTERVAL '5 minutes') as online_users
      FROM orders o
      FULL OUTER JOIN users u ON false -- 用于合并查询
    `);
    
    // 获取最近订单
    const recentOrders = await query(`
      SELECT 
        o.id,
        o.status,
        o.price,
        o.created_at,
        u.username,
        ep.name as package_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN energy_packages ep ON o.package_id = ep.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    
    // 获取系统状态
    const systemStatus = await query(`
      SELECT 
        (SELECT COUNT(*) FROM bots WHERE status = 'active') as active_bots,
        (SELECT COUNT(*) FROM bots WHERE status = 'inactive') as inactive_bots,
        (SELECT COUNT(*) FROM energy_packages WHERE is_active = true) as active_packages,
        (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users
    `);
    
    res.status(200).json({
      success: true,
      message: '实时统计数据获取成功',
      data: {
        realtime_metrics: realtimeStats.rows[0],
        recent_orders: recentOrders.rows,
        system_status: systemStatus.rows[0],
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('获取实时统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 导出统计报告
 * GET /api/statistics/export
 * 权限：管理员
 */
router.get('/export', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      type = 'overview', // overview, orders, revenue, users, bots
      period = '30',
      format = 'json' // json, csv
    } = req.query;
    
    const days = Number(period);
    let data: any;
    
    switch (type) {
      case 'orders':
        data = await query(`
          SELECT 
            o.id,
            o.status,
            o.price,
            o.energy_amount,
            o.created_at,
            u.username,
            u.telegram_id,
            ep.name as package_name,
            b.name as bot_name
          FROM orders o
          JOIN users u ON o.user_id = u.id
          JOIN energy_packages ep ON o.package_id = ep.id
          LEFT JOIN bot_users bu ON u.id = bu.user_id
          LEFT JOIN bots b ON bu.bot_id = b.id
          WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
          ORDER BY o.created_at DESC
        `);
        break;
        
      case 'revenue':
        data = await query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as total_orders,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN price END), 0) as daily_revenue
          FROM orders 
          WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE(created_at)
          ORDER BY date
        `);
        break;
        
      case 'users':
        data = await query(`
          SELECT 
            u.id,
            u.telegram_id,
            u.username,
            u.role,
            u.status,
            u.balance,
            u.total_orders,
            u.total_energy_used,
            u.created_at,
            COUNT(o.id) as recent_orders,
            COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price END), 0) as recent_spent
          FROM users u
          LEFT JOIN orders o ON u.id = o.user_id 
            AND o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY u.id, u.telegram_id, u.username, u.role, u.status, u.balance, u.total_orders, u.total_energy_used, u.created_at
          ORDER BY u.created_at DESC
        `);
        break;
        
      default:
        // overview
        data = await query(`
          SELECT 
            'overview' as report_type,
            CURRENT_DATE as report_date,
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM orders) as total_orders,
            (SELECT COALESCE(SUM(price), 0) FROM orders WHERE status = 'completed') as total_revenue,
            (SELECT COUNT(*) FROM bots WHERE status = 'active') as active_bots
        `);
    }
    
    if (format === 'csv') {
      // 简单的CSV格式转换
      if (data.rows.length > 0) {
        const headers = Object.keys(data.rows[0]).join(',');
        const csvData = data.rows.map((row: any) => 
          Object.values(row).map(val => 
            typeof val === 'string' ? `"${val}"` : val
          ).join(',')
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${period}days.csv"`);
        res.status(200).send(headers + '\n' + csvData);
      } else {
        res.status(200).send('No data available');
      }
    } else {
      res.status(200).json({
        success: true,
        message: '统计报告导出成功',
        data: {
          report_type: type,
          period_days: days,
          generated_at: new Date().toISOString(),
          records: data.rows
        }
      });
    }
    
  } catch (error) {
    console.error('导出统计报告错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;