/**
 * 日志统计控制器
 */
import type { Request, Response } from 'express';
import { query as dbQuery } from '../../../../database/index.js';
import type {
  LogsStats,
  RouteHandler,
  StatsResponse
} from '../types/logs.types.js';

export class LogsStatsController {
  /**
   * 获取综合日志统计
   */
  static getStats: RouteHandler = async (req: Request, res: Response) => {
    try {
      // 获取操作日志统计
      const operationStatsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as this_week,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as this_month
        FROM operation_logs
      `;

      // 获取登录日志统计
      const loginStatsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN login_time >= NOW() - INTERVAL '1 day' THEN 1 END) as today,
          COUNT(CASE WHEN login_time >= NOW() - INTERVAL '7 days' THEN 1 END) as this_week,
          COUNT(CASE WHEN login_time >= NOW() - INTERVAL '30 days' THEN 1 END) as this_month,
          ROUND(
            COUNT(CASE WHEN status = 1 AND login_time >= NOW() - INTERVAL '30 days' THEN 1 END) * 100.0 /
            NULLIF(COUNT(CASE WHEN login_time >= NOW() - INTERVAL '30 days' THEN 1 END), 0), 2
          ) as success_rate
        FROM login_logs
      `;

      // 获取Top操作统计
      const topOperationsQuery = `
        SELECT 
          operation,
          COUNT(*) as count
        FROM operation_logs 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY operation
        ORDER BY count DESC
        LIMIT 10
      `;

      // 获取Top用户统计
      const topUsersQuery = `
        SELECT 
          a.username,
          a.email,
          COUNT(ol.id) as operation_count,
          COUNT(ll.id) as login_count
        FROM admins a
        LEFT JOIN operation_logs ol ON a.id::text = ol.admin_id::text AND ol.created_at >= NOW() - INTERVAL '30 days'
        LEFT JOIN login_logs ll ON a.id = ll.user_id AND ll.login_time >= NOW() - INTERVAL '30 days'
        GROUP BY a.id, a.username, a.email
        HAVING COUNT(ol.id) > 0 OR COUNT(ll.id) > 0
        ORDER BY (COUNT(ol.id) + COUNT(ll.id)) DESC
        LIMIT 10
      `;

      const [operationStats, loginStats, topOperations, topUsers] = await Promise.all([
        dbQuery(operationStatsQuery),
        dbQuery(loginStatsQuery), 
        dbQuery(topOperationsQuery),
        dbQuery(topUsersQuery)
      ]);

      const stats: LogsStats = {
        operation_logs: {
          total: parseInt(operationStats.rows[0]?.total) || 0,
          today: parseInt(operationStats.rows[0]?.today) || 0,
          this_week: parseInt(operationStats.rows[0]?.this_week) || 0,
          this_month: parseInt(operationStats.rows[0]?.this_month) || 0
        },
        login_logs: {
          total: parseInt(loginStats.rows[0]?.total) || 0,
          today: parseInt(loginStats.rows[0]?.today) || 0,
          this_week: parseInt(loginStats.rows[0]?.this_week) || 0,
          this_month: parseInt(loginStats.rows[0]?.this_month) || 0,
          success_rate: parseFloat(loginStats.rows[0]?.success_rate) || 0
        },
        top_operations: topOperations.rows.map(row => ({
          operation: row.operation,
          count: parseInt(row.count)
        })),
        top_users: topUsers.rows.map(row => ({
          username: row.username,
          email: row.email,
          operation_count: parseInt(row.operation_count) || 0,
          login_count: parseInt(row.login_count) || 0
        }))
      };

      const response: StatsResponse = {
        success: true,
        data: stats
      };

      res.json(response);
        return;
    } catch (error: any) {
      console.error('获取日志统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取日志统计失败'
      });
    }
  };

  /**
   * 获取登录趋势数据
   */
  static getLoginTrend: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { days = '7' } = req.query;
      const trendDays = parseInt(days as string);
      
      if (trendDays < 1 || trendDays > 365) {
        return res.status(400).json({
          success: false,
          error: '天数范围必须在1-365之间'
        });
      }

      const trendQuery = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '${trendDays - 1} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date as date
        )
        SELECT 
          ds.date,
          COALESCE(COUNT(ll.id), 0) as total,
          COALESCE(COUNT(CASE WHEN ll.status = 1 THEN 1 END), 0) as success,
          COALESCE(COUNT(CASE WHEN ll.status = 0 THEN 1 END), 0) as failed
        FROM date_series ds
        LEFT JOIN login_logs ll ON DATE(ll.login_time) = ds.date
        GROUP BY ds.date
        ORDER BY ds.date
      `;

      const result = await dbQuery(trendQuery);

      res.json({
        success: true,
        data: {
          trend: result.rows.map(row => ({
            date: row.date,
            total: parseInt(row.total),
            success: parseInt(row.success),
            failed: parseInt(row.failed)
          }))
        }
      });
    } catch (error: any) {
      console.error('获取登录趋势失败:', error);
      res.status(500).json({
        success: false,
        error: '获取登录趋势失败'
      });
    }
  };

  /**
   * 获取操作趋势数据
   */
  static getOperationTrend: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { days = '7' } = req.query;
      const trendDays = parseInt(days as string);
      
      if (trendDays < 1 || trendDays > 365) {
        return res.status(400).json({
          success: false,
          error: '天数范围必须在1-365之间'
        });
      }

      const trendQuery = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '${trendDays - 1} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date as date
        )
        SELECT 
          ds.date,
          COALESCE(COUNT(ol.id), 0) as count,
          COALESCE(COUNT(DISTINCT ol.admin_id), 0) as unique_users
        FROM date_series ds
        LEFT JOIN operation_logs ol ON DATE(ol.created_at) = ds.date
        GROUP BY ds.date
        ORDER BY ds.date
      `;

      const result = await dbQuery(trendQuery);

      res.json({
        success: true,
        data: {
          trend: result.rows.map(row => ({
            date: row.date,
            count: parseInt(row.count),
            unique_users: parseInt(row.unique_users)
          }))
        }
      });
    } catch (error: any) {
      console.error('获取操作趋势失败:', error);
      res.status(500).json({
        success: false,
        error: '获取操作趋势失败'
      });
    }
  };

  /**
   * 获取用户活跃度统计
   */
  static getUserActivity: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);

      // 获取活跃用户统计
      const activityQuery = `
        WITH user_activity AS (
          SELECT 
            a.id,
            a.username,
            a.email,
            COUNT(DISTINCT DATE(ol.created_at)) as active_days,
            COUNT(ol.id) as operation_count,
            COUNT(DISTINCT ol.operation) as unique_operations,
            COUNT(ll.id) as login_count,
            MAX(COALESCE(ol.created_at, ll.login_time)) as last_activity
          FROM admins a
          LEFT JOIN operation_logs ol ON a.id::text = ol.admin_id::text 
            AND ol.created_at >= NOW() - INTERVAL '${days} days'
          LEFT JOIN login_logs ll ON a.id = ll.user_id 
            AND ll.login_time >= NOW() - INTERVAL '${days} days'
          GROUP BY a.id, a.username, a.email
          HAVING COUNT(ol.id) > 0 OR COUNT(ll.id) > 0
        )
        SELECT 
          *,
          CASE 
            WHEN active_days >= ${Math.ceil(days * 0.8)} THEN 'highly_active'
            WHEN active_days >= ${Math.ceil(days * 0.4)} THEN 'moderately_active'
            WHEN active_days >= 1 THEN 'slightly_active'
            ELSE 'inactive'
          END as activity_level
        FROM user_activity
        ORDER BY operation_count + login_count DESC
      `;

      // 获取活跃度分布
      const distributionQuery = `
        WITH activity_levels AS (
          SELECT 
            a.id,
            COUNT(DISTINCT DATE(ol.created_at)) as active_days,
            COUNT(ol.id) as operation_count,
            COUNT(ll.id) as login_count
          FROM admins a
          LEFT JOIN operation_logs ol ON a.id::text = ol.admin_id::text 
            AND ol.created_at >= NOW() - INTERVAL '${days} days'
          LEFT JOIN login_logs ll ON a.id = ll.user_id 
            AND ll.login_time >= NOW() - INTERVAL '${days} days'
          GROUP BY a.id
        )
        SELECT 
          CASE 
            WHEN active_days >= ${Math.ceil(days * 0.8)} THEN 'highly_active'
            WHEN active_days >= ${Math.ceil(days * 0.4)} THEN 'moderately_active'
            WHEN active_days >= 1 THEN 'slightly_active'
            ELSE 'inactive'
          END as activity_level,
          COUNT(*) as user_count
        FROM activity_levels
        GROUP BY 
          CASE 
            WHEN active_days >= ${Math.ceil(days * 0.8)} THEN 'highly_active'
            WHEN active_days >= ${Math.ceil(days * 0.4)} THEN 'moderately_active'
            WHEN active_days >= 1 THEN 'slightly_active'
            ELSE 'inactive'
          END
        ORDER BY user_count DESC
      `;

      const [activityResult, distributionResult] = await Promise.all([
        dbQuery(activityQuery),
        dbQuery(distributionQuery)
      ]);

      res.json({
        success: true,
        data: {
          users: activityResult.rows,
          distribution: distributionResult.rows,
          period: days
        }
      });
    } catch (error: any) {
      console.error('获取用户活跃度统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取用户活跃度统计失败'
      });
    }
  };

  /**
   * 获取系统使用峰值统计
   */
  static getPeakUsage: RouteHandler = async (req: Request, res: Response) => {
    try {
      // 获取每小时统计
      const hourlyQuery = `
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count
        FROM operation_logs 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `;

      // 获取每周统计
      const weeklyQuery = `
        SELECT 
          EXTRACT(DOW FROM created_at) as day_of_week,
          COUNT(*) as count
        FROM operation_logs 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(DOW FROM created_at)
        ORDER BY day_of_week
      `;

      const [hourlyResult, weeklyResult] = await Promise.all([
        dbQuery(hourlyQuery),
        dbQuery(weeklyQuery)
      ]);

      // 转换周几数字为名称
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weeklyData = weeklyResult.rows.map(row => ({
        day: dayNames[parseInt(row.day_of_week)],
        day_number: parseInt(row.day_of_week),
        count: parseInt(row.count)
      }));

      res.json({
        success: true,
        data: {
          hourly: hourlyResult.rows.map(row => ({
            hour: parseInt(row.hour),
            count: parseInt(row.count)
          })),
          weekly: weeklyData
        }
      });
    } catch (error: any) {
      console.error('获取系统使用峰值统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取系统使用峰值统计失败'
      });
    }
  };
}
