/**
 * 操作日志控制器
 */
import type { Request, Response } from 'express';
import { query as dbQuery } from '../../../../database/index.ts';
import type {
    ApiResponse,
    BatchDeleteRequest,
    LogDetailResponse,
    OperationLog,
    OperationLogQueryParams,
    PaginatedResponse,
    RouteHandler,
    UserOperationLogsParams
} from '../types/logs.types.ts';

export class OperationLogsController {
  /**
   * 获取操作日志列表
   */
  static getList: RouteHandler = async (req: Request, res: Response) => {
    try {
      const {
        page = '1',
        limit = '20',
        user_id,
        operation,
        start_date,
        end_date
      } = req.query as OperationLogQueryParams;

      const offset = (Number(page) - 1) * Number(limit);
      
      // 构建查询条件
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (user_id) {
        whereClause += ` AND ol.admin_id = $${paramIndex++}`;
        params.push(user_id);
      }

      if (operation) {
        whereClause += ` AND ol.operation ILIKE $${paramIndex++}`;
        params.push(`%${operation}%`);
      }

      if (start_date) {
        whereClause += ` AND ol.created_at >= $${paramIndex++}`;
        params.push(start_date);
      }

      if (end_date) {
        whereClause += ` AND ol.created_at <= $${paramIndex++}`;
        params.push(end_date);
      }

      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM operation_logs ol
        ${whereClause}
      `;
      const countResult = await dbQuery(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // 查询数据
      const dataQuery = `
        SELECT 
          ol.id,
          ol.admin_id as user_id,
          ol.operation,
          ol.module as resource_type,
          ol.url,
          ol.method,
          ol.request_params as details,
          ol.ip_address,
          ol.user_agent,
          ol.status,
          ol.execution_time,
          ol.created_at,
          a.username,
          a.email
        FROM operation_logs ol
        LEFT JOIN admins a ON ol.admin_id::text = a.id::text
        ${whereClause}
        ORDER BY ol.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(Number(limit), offset);
      
      const dataResult = await dbQuery(dataQuery, params);

      const response: PaginatedResponse<OperationLog> = {
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
      console.error('获取操作日志失败:', error);
      res.status(500).json({
        success: false,
        error: '获取操作日志失败'
      });
    }
  };

  /**
   * 获取操作日志详情
   */
  static getDetail: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          ol.id,
          ol.admin_id as user_id,
          ol.operation,
          ol.module as resource_type,
          ol.url,
          ol.method,
          ol.request_params as details,
          ol.response_data,
          ol.ip_address,
          ol.user_agent,
          ol.created_at,
          ol.status,
          ol.error_message,
          a.username,
          a.email
        FROM operation_logs ol
        LEFT JOIN admins a ON ol.admin_id::text = a.id::text
        WHERE ol.id = $1
      `;
      
      const result = await dbQuery(query, [id]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: '操作日志不存在'
        });
        return;
      }

      const response: LogDetailResponse<OperationLog> = {
        success: true,
        data: result.rows[0]
      };

      res.json(response);
        return;
    } catch (error: any) {
      console.error('获取操作日志详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取操作日志详情失败'
      });
    }
  };

  /**
   * 批量删除操作日志
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
      const deleteQuery = `DELETE FROM operation_logs WHERE id IN (${placeholders})`;
      
      const result = await dbQuery(deleteQuery, validIds);

      const response: ApiResponse<{ deletedCount: number }> = {
        success: true,
        data: {
          deletedCount: result.rowCount || 0
        },
        message: `成功删除 ${result.rowCount || 0} 条操作日志`
      };

      res.json(response);
        return;
    } catch (error: any) {
      console.error('批量删除操作日志失败:', error);
      res.status(500).json({
        success: false,
        error: '批量删除操作日志失败'
      });
    }
  };

  /**
   * 获取特定用户的操作日志
   */
  static getUserOperationLogs: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const {
        page = '1',
        limit = '20',
        operation,
        start_date,
        end_date
      } = req.query as Omit<UserOperationLogsParams, 'userId'>;

      const offset = (Number(page) - 1) * Number(limit);
      
      // 构建查询条件
      let whereClause = 'WHERE ol.admin_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (operation) {
        whereClause += ` AND ol.operation ILIKE $${paramIndex++}`;
        params.push(`%${operation}%`);
      }

      if (start_date) {
        whereClause += ` AND ol.created_at >= $${paramIndex++}`;
        params.push(start_date);
      }

      if (end_date) {
        whereClause += ` AND ol.created_at <= $${paramIndex++}`;
        params.push(end_date);
      }

      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM operation_logs ol
        ${whereClause}
      `;
      const countResult = await dbQuery(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // 查询数据
      const dataQuery = `
        SELECT 
          ol.id,
          ol.admin_id as user_id,
          ol.operation,
          ol.module as resource_type,
          ol.url,
          ol.method,
          ol.request_params as details,
          ol.ip_address,
          ol.user_agent,
          ol.status,
          ol.execution_time,
          ol.created_at,
          a.username,
          a.email
        FROM operation_logs ol
        LEFT JOIN admins a ON ol.admin_id::text = a.id::text
        ${whereClause}
        ORDER BY ol.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(Number(limit), offset);
      
      const dataResult = await dbQuery(dataQuery, params);

      // 获取用户基本信息
      const userQuery = `
        SELECT username, email
        FROM admins
        WHERE id = $1
      `;
      const userResult = await dbQuery(userQuery, [userId]);
      const userInfo = userResult.rows[0] || {};

      const response: PaginatedResponse<OperationLog> & { userInfo: any } = {
        success: true,
        data: {
          logs: dataResult.rows,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        },
        userInfo
      };

      res.json(response);
        return;
    } catch (error: any) {
      console.error('获取用户操作日志失败:', error);
      res.status(500).json({
        success: false,
        error: '获取用户操作日志失败'
      });
    }
  };

  /**
   * 获取操作统计数据
   */
  static getOperationStats: RouteHandler = async (req: Request, res: Response) => {
    try {
      // 获取操作类型统计
      const operationStatsQuery = `
        SELECT 
          operation,
          COUNT(*) as count,
          COUNT(DISTINCT admin_id) as unique_users,
          COUNT(CASE WHEN status >= 200 AND status < 300 THEN 1 END) as success_count,
          COUNT(CASE WHEN status >= 400 THEN 1 END) as failed_count,
          ROUND(
            COUNT(CASE WHEN status >= 200 AND status < 300 THEN 1 END) * 100.0 / COUNT(*), 2
          ) as success_rate
        FROM operation_logs 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY operation
        ORDER BY count DESC
        LIMIT 10
      `;

      // 获取每日操作量统计
      const dailyStatsQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          COUNT(CASE WHEN status >= 200 AND status < 300 THEN 1 END) as success_count,
          COUNT(CASE WHEN status >= 400 THEN 1 END) as failed_count
        FROM operation_logs 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      // 获取用户操作统计
      const userStatsQuery = `
        SELECT 
          a.username,
          a.email,
          COUNT(ol.id) as operation_count,
          COUNT(DISTINCT ol.operation) as unique_operations
        FROM operation_logs ol
        LEFT JOIN admins a ON ol.admin_id::text = a.id::text
        WHERE ol.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY a.username, a.email
        ORDER BY operation_count DESC
        LIMIT 10
      `;

      const [operationStats, dailyStats, userStats] = await Promise.all([
        dbQuery(operationStatsQuery),
        dbQuery(dailyStatsQuery),
        dbQuery(userStatsQuery)
      ]);

      res.json({
        success: true,
        data: {
          operationStats: operationStats.rows,
          dailyStats: dailyStats.rows,
          userStats: userStats.rows
        }
      });
    } catch (error: any) {
      console.error('获取操作统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取操作统计失败'
      });
    }
  };
}
