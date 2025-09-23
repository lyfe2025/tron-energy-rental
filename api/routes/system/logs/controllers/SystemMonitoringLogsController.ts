/**
 * 系统监控日志控制器
 */
import type { Request, Response } from 'express';
import pool from '../../../../config/database.ts';

export class SystemMonitoringLogsController {
  /**
   * 获取系统监控日志列表
   */
  static async getList(req: Request, res: Response) {
    try {
      const {
        page = 1,
        pageSize = 20,
        level,
        module,
        message,
        start_date,
        end_date,
        user_id
      } = req.query;

      // 构建查询条件
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      // 根据动作类型过滤（相当于level）
      if (level) {
        conditions.push(`action_type ILIKE $${++paramCount}`);
        params.push(`%${level}%`);
      }

      // 根据模块过滤（从action_data中提取）
      if (module) {
        conditions.push(`action_data->>'module' ILIKE $${++paramCount}`);
        params.push(`%${module}%`);
      }

      // 根据消息过滤（从action_data中提取）
      if (message) {
        conditions.push(`action_data->>'message' ILIKE $${++paramCount}`);
        params.push(`%${message}%`);
      }

      // 用户ID过滤
      if (user_id) {
        conditions.push(`admin_id = $${++paramCount}`);
        params.push(user_id);
      }

      // 时间范围过滤
      if (start_date) {
        conditions.push(`created_at >= $${++paramCount}`);
        params.push(start_date);
      }

      if (end_date) {
        conditions.push(`created_at <= $${++paramCount}`);
        params.push(end_date);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 计算分页
      const limit = Math.min(parseInt(pageSize as string, 10), 100);
      const offset = (parseInt(page as string, 10) - 1) * limit;

      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM system_monitoring_logs
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // 获取日志列表
      const logsQuery = `
        SELECT 
          sml.id,
          sml.action_type as level,
          COALESCE(sml.action_data->>'message', sml.action_type) as message,
          COALESCE(sml.action_data->>'module', 'system') as module,
          sml.action_data as context,
          sml.action_data->>'stack_trace' as stack_trace,
          sml.created_at,
          sml.created_at as updated_at,
          a.username as user_name
        FROM system_monitoring_logs sml
        LEFT JOIN admins a ON sml.admin_id = a.id
        ${whereClause}
        ORDER BY sml.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      params.push(limit, offset);

      const logsResult = await pool.query(logsQuery, params);

      // 计算分页信息
      const totalPages = Math.ceil(total / limit);
      const hasNext = parseInt(page as string, 10) < totalPages;
      const hasPrev = parseInt(page as string, 10) > 1;

      res.json({
        success: true,
        data: {
          list: logsResult.rows,
          pagination: {
            current: parseInt(page as string, 10),
            pageSize: limit,
            total,
            hasNext,
            hasPrev,
            totalPages
          }
        },
        message: '获取系统监控日志成功'
      });

    } catch (error) {
      console.error('获取系统监控日志失败:', error);
      res.status(500).json({
        success: false,
        error: '获取系统监控日志失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取系统监控日志详情
   */
  static async getDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          sml.id,
          sml.action_type as level,
          COALESCE(sml.action_data->>'message', sml.action_type) as message,
          COALESCE(sml.action_data->>'module', 'system') as module,
          sml.action_data as context,
          sml.action_data->>'stack_trace' as stack_trace,
          sml.created_at,
          sml.created_at as updated_at,
          a.username as user_name,
          a.email as user_email
        FROM system_monitoring_logs sml
        LEFT JOIN admins a ON sml.admin_id = a.id
        WHERE sml.id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '系统监控日志不存在',
          message: '未找到指定的日志记录'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: '获取系统监控日志详情成功'
      });

    } catch (error) {
      console.error('获取系统监控日志详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取系统监控日志详情失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取系统监控日志统计
   */
  static async getStats(req: Request, res: Response) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as this_month,
          COUNT(CASE WHEN action_type ILIKE '%error%' THEN 1 END) as error_count,
          COUNT(CASE WHEN action_type ILIKE '%warning%' THEN 1 END) as warning_count,
          COUNT(CASE WHEN action_type ILIKE '%info%' THEN 1 END) as info_count
        FROM system_monitoring_logs
      `;

      const result = await pool.query(query);
      const stats = result.rows[0];

      res.json({
        success: true,
        data: {
          total: parseInt(stats.total, 10),
          today: parseInt(stats.today, 10),
          thisWeek: parseInt(stats.this_week, 10),
          thisMonth: parseInt(stats.this_month, 10),
          errorCount: parseInt(stats.error_count, 10),
          warningCount: parseInt(stats.warning_count, 10),
          infoCount: parseInt(stats.info_count, 10)
        },
        message: '获取统计数据成功'
      });

    } catch (error) {
      console.error('获取系统监控日志统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取统计数据失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 创建系统监控日志（工具方法，供其他模块调用）
   */
  static async createLog(adminId: string | null, actionType: string, actionData: any) {
    try {
      const query = `
        INSERT INTO system_monitoring_logs (admin_id, action_type, action_data, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;
      
      const result = await pool.query(query, [
        adminId,
        actionType,
        JSON.stringify(actionData),
        new Date().toISOString()
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('创建系统监控日志失败:', error);
      throw error;
    }
  }
}
