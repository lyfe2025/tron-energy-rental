/**
 * 登录日志控制器
 */
import type { Request, Response } from 'express';
import { query as dbQuery } from '../../../../database/index.ts';
import type {
  ApiResponse,
  BatchDeleteRequest,
  LogDetailResponse,
  LoginLog,
  LoginLogQueryParams,
  PaginatedResponse,
  RouteHandler
} from '../types/logs.types.ts';

export class LoginLogsController {
  /**
   * 获取登录日志列表
   */
  static getList: RouteHandler = async (req: Request, res: Response) => {
    try {
      const {
        page = '1',
        limit = '20',
        user_id,
        login_status,
        ip_address,
        start_date,
        end_date
      } = req.query as LoginLogQueryParams;

      const offset = (Number(page) - 1) * Number(limit);
      
      // 构建查询条件
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (user_id) {
        whereClause += ` AND ll.user_id = $${paramIndex++}`;
        params.push(user_id);
      }

      if (login_status) {
        whereClause += ` AND ll.status = $${paramIndex++}`;
        params.push(login_status);
      }

      if (ip_address) {
        whereClause += ` AND ll.ip_address ILIKE $${paramIndex++}`;
        params.push(`%${ip_address}%`);
      }

      if (start_date) {
        whereClause += ` AND ll.login_time >= $${paramIndex++}`;
        params.push(start_date);
      }

      if (end_date) {
        whereClause += ` AND ll.login_time <= $${paramIndex++}`;
        params.push(end_date);
      }

      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM login_logs ll
        ${whereClause}
      `;
      const countResult = await dbQuery(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // 查询数据
      const dataQuery = `
        SELECT 
          ll.id,
          ll.user_id,
          ll.username,
          ll.ip_address,
          ll.user_agent,
          ll.status,
          ll.message as failure_reason,
          ll.login_time as created_at,
          ll.login_time,
          a.email
        FROM login_logs ll
        LEFT JOIN admins a ON ll.user_id = a.id
        ${whereClause}
        ORDER BY ll.login_time DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(Number(limit), offset);
      
      const dataResult = await dbQuery(dataQuery, params);

      const response: PaginatedResponse<LoginLog> = {
        success: true,
        data: {
          logs: dataResult.rows,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      };

      res.json(response);
        return;
    } catch (error: any) {
      console.error('获取登录日志失败:', error);
      res.status(500).json({
        success: false,
        error: '获取登录日志失败'
      });
    }
  };

  /**
   * 获取登录日志详情
   */
  static getDetail: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          ll.id,
          ll.user_id,
          ll.username,
          ll.ip_address,
          ll.user_agent,
          ll.status,
          ll.message as failure_reason,
          ll.login_time as created_at,
          ll.login_time,
          ll.session_id,
          ll.country,
          ll.city,
          a.email,
          a.name as full_name
        FROM login_logs ll
        LEFT JOIN admins a ON ll.user_id = a.id
        WHERE ll.id = $1
      `;
      
      const result = await dbQuery(query, [id]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: '登录日志不存在'
        });
        return;
      }

      const response: LogDetailResponse<LoginLog> = {
        success: true,
        data: result.rows[0]
      };

      res.json(response);
        return;
    } catch (error: any) {
      console.error('获取登录日志详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取登录日志详情失败'
      });
    }
  };

  /**
   * 批量删除登录日志
   */
  static batchDelete: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { ids, confirm = false } = req.body as BatchDeleteRequest;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: '请提供要删除的日志ID列表'
        });
        return;
      }

      if (!confirm) {
        res.status(400).json({
          success: false,
          error: '请确认删除操作',
          message: '删除操作不可恢复，请设置 confirm: true 确认删除'
        });
        return;
      }

      // 验证所有ID都是有效的整数
      const validIds = ids.filter(id => !isNaN(Number(id)) && Number(id) > 0);
      if (validIds.length !== ids.length) {
        res.status(400).json({
          success: false,
          error: '包含无效的日志ID'
        });
        return;
      }

      // 执行批量删除
      const placeholders = validIds.map((_, index) => `$${index + 1}`).join(',');
      const deleteQuery = `DELETE FROM login_logs WHERE id IN (${placeholders})`;
      
      const result = await dbQuery(deleteQuery, validIds);

      const response: ApiResponse<{ deletedCount: number }> = {
        success: true,
        data: {
          deletedCount: result.rowCount || 0
        },
        message: `成功删除 ${result.rowCount || 0} 条登录日志`
      };

      res.json(response);
        return;
    } catch (error: any) {
      console.error('批量删除登录日志失败:', error);
      res.status(500).json({
        success: false,
        error: '批量删除登录日志失败'
      });
    }
  };

  /**
   * 获取登录统计数据
   */
  static getLoginStats: RouteHandler = async (req: Request, res: Response) => {
    try {
      // 获取登录成功率统计
      const successRateQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 1 THEN 1 END) as success,
          COUNT(CASE WHEN status = 0 THEN 1 END) as failed,
          ROUND(
            COUNT(CASE WHEN status = 1 THEN 1 END) * 100.0 / COUNT(*), 2
          ) as success_rate
        FROM login_logs 
        WHERE login_time >= NOW() - INTERVAL '30 days'
      `;

      // 获取每日登录量统计
      const dailyStatsQuery = `
        SELECT 
          DATE(login_time) as date,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 1 THEN 1 END) as success,
          COUNT(CASE WHEN status = 0 THEN 1 END) as failed
        FROM login_logs 
        WHERE login_time >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(login_time)
        ORDER BY date DESC
      `;

      // 获取IP地址统计
      const ipStatsQuery = `
        SELECT 
          ip_address,
          COUNT(*) as login_count,
          COUNT(CASE WHEN status = 1 THEN 1 END) as success_count,
          COUNT(CASE WHEN status = 0 THEN 1 END) as failed_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM login_logs 
        WHERE login_time >= NOW() - INTERVAL '30 days'
        GROUP BY ip_address
        ORDER BY login_count DESC
        LIMIT 10
      `;

      // 获取用户登录统计
      const userStatsQuery = `
        SELECT 
          ll.username,
          a.email,
          COUNT(*) as login_count,
          COUNT(CASE WHEN ll.status = 1 THEN 1 END) as success_count,
          COUNT(CASE WHEN ll.status = 0 THEN 1 END) as failed_count,
          MAX(ll.login_time) as last_login
        FROM login_logs ll
        LEFT JOIN admins a ON ll.user_id = a.id
        WHERE ll.login_time >= NOW() - INTERVAL '30 days'
        GROUP BY ll.username, a.email
        ORDER BY login_count DESC
        LIMIT 10
      `;

      const [successRateStats, dailyStats, ipStats, userStats] = await Promise.all([
        dbQuery(successRateQuery),
        dbQuery(dailyStatsQuery),
        dbQuery(ipStatsQuery),
        dbQuery(userStatsQuery)
      ]);

      res.json({
        success: true,
        data: {
          successRateStats: successRateStats.rows[0] || {},
          dailyStats: dailyStats.rows,
          ipStats: ipStats.rows,
          userStats: userStats.rows
        }
      });
    } catch (error: any) {
      console.error('获取登录统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取登录统计失败'
      });
    }
  };

  /**
   * 获取安全警报（可疑登录活动）
   */
  static getSecurityAlerts: RouteHandler = async (req: Request, res: Response) => {
    try {
      // 获取频繁失败登录的IP
      const frequentFailuresQuery = `
        SELECT 
          ip_address,
          COUNT(*) as failed_attempts,
          MIN(login_time) as first_attempt,
          MAX(login_time) as last_attempt,
          COUNT(DISTINCT user_id) as targeted_users
        FROM login_logs 
        WHERE status = 0 
          AND login_time >= NOW() - INTERVAL '24 hours'
        GROUP BY ip_address
        HAVING COUNT(*) >= 5
        ORDER BY failed_attempts DESC
      `;

      // 获取异地登录检测
      const suspiciousLoginsQuery = `
        WITH user_usual_ips AS (
          SELECT 
            user_id,
            ip_address,
            COUNT(*) as usage_count
          FROM login_logs 
          WHERE status = 1 
            AND login_time >= NOW() - INTERVAL '30 days'
          GROUP BY user_id, ip_address
        ),
        recent_logins AS (
          SELECT 
            ll.user_id,
            ll.username,
            ll.ip_address,
            ll.login_time,
            ll.user_agent
          FROM login_logs ll
          WHERE ll.status = 1 
            AND ll.login_time >= NOW() - INTERVAL '24 hours'
        )
        SELECT 
          rl.user_id,
          rl.username,
          rl.ip_address,
          rl.login_time,
          rl.user_agent,
          CASE 
            WHEN uui.usage_count IS NULL THEN 'new_ip'
            WHEN uui.usage_count < 3 THEN 'unusual_ip'
            ELSE 'normal'
          END as risk_level
        FROM recent_logins rl
        LEFT JOIN user_usual_ips uui ON rl.user_id = uui.user_id AND rl.ip_address = uui.ip_address
        WHERE uui.usage_count IS NULL OR uui.usage_count < 3
        ORDER BY rl.login_time DESC
      `;

      // 获取短时间内多次登录
      const rapidLoginsQuery = `
        SELECT 
          user_id,
          username,
          COUNT(*) as login_count,
          MIN(login_time) as first_login,
          MAX(login_time) as last_login,
          EXTRACT(EPOCH FROM (MAX(login_time) - MIN(login_time)))/60 as time_span_minutes
        FROM login_logs 
        WHERE status = 1 
          AND login_time >= NOW() - INTERVAL '1 hour'
        GROUP BY user_id, username
        HAVING COUNT(*) >= 10
        ORDER BY login_count DESC
      `;

      const [frequentFailures, suspiciousLogins, rapidLogins] = await Promise.all([
        dbQuery(frequentFailuresQuery),
        dbQuery(suspiciousLoginsQuery),
        dbQuery(rapidLoginsQuery)
      ]);

      res.json({
        success: true,
        data: {
          frequentFailures: frequentFailures.rows,
          suspiciousLogins: suspiciousLogins.rows,
          rapidLogins: rapidLogins.rows,
          alertCount: frequentFailures.rowCount + suspiciousLogins.rowCount + rapidLogins.rowCount
        }
      });
    } catch (error: any) {
      console.error('获取安全警报失败:', error);
      res.status(500).json({
        success: false,
        error: '获取安全警报失败'
      });
    }
  };
}
