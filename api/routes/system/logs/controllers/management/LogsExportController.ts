/**
 * 日志导出控制器
 * 负责处理日志导出相关功能
 */
import type { Request, Response } from 'express';
import { query as dbQuery } from '../../../../../database/index.ts';
import type {
    ExportLogsRequest,
    ExportResponse,
    RouteHandler
} from '../../types/logs.types.ts';

export class LogsExportController {
  /**
   * 导出日志
   */
  static exportLogs: RouteHandler = async (req: Request, res: Response) => {
    try {
      const {
        type,
        format = 'csv',
        start_date,
        end_date,
        user_id,
        operation,
        login_status
      } = req.body as ExportLogsRequest;

      if (!['operations', 'logins'].includes(type)) {
        res.status(400).json({
          success: false,
          error: '日志类型必须是 operations 或 logins'
        });
        return;
      }

      if (!['csv', 'json', 'excel'].includes(format)) {
        res.status(400).json({
          success: false,
          error: '导出格式必须是 csv、json 或 excel'
        });
        return;
      }

      // 构建查询条件
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (user_id) {
        if (type === 'operations') {
          whereClause += ` AND ol.admin_id = $${paramIndex++}`;
        } else {
          whereClause += ` AND ll.user_id = $${paramIndex++}`;
        }
        params.push(user_id);
      }

      if (start_date) {
        if (type === 'operations') {
          whereClause += ` AND ol.created_at >= $${paramIndex++}`;
        } else {
          whereClause += ` AND ll.login_time >= $${paramIndex++}`;
        }
        params.push(start_date);
      }

      if (end_date) {
        if (type === 'operations') {
          whereClause += ` AND ol.created_at <= $${paramIndex++}`;
        } else {
          whereClause += ` AND ll.login_time <= $${paramIndex++}`;
        }
        params.push(end_date);
      }

      if (operation && type === 'operations') {
        whereClause += ` AND ol.operation ILIKE $${paramIndex++}`;
        params.push(`%${operation}%`);
      }

      if (login_status && type === 'logins') {
        whereClause += ` AND ll.status = $${paramIndex++}`;
        params.push(login_status);
      }

      // 构建查询语句
      let query: string;
      if (type === 'operations') {
        query = `
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
          ${whereClause}
          ORDER BY ol.created_at DESC
          LIMIT 10000
        `;
      } else {
        query = `
          SELECT 
            ll.id,
            ll.user_id,
            ll.username,
            ll.ip_address,
            ll.user_agent,
            ll.status as login_status,
            ll.message as failure_reason,
            ll.login_time as created_at,
            ll.session_id,
            ll.country,
            ll.city,
            a.email
          FROM login_logs ll
          LEFT JOIN admins a ON ll.user_id = a.id
          ${whereClause}
          ORDER BY ll.login_time DESC
          LIMIT 10000
        `;
      }

      // 执行查询
      const result = await dbQuery(query, params);
      
      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '_');
      const filename = `${type}_logs_${timestamp}.${format}`;

      // 在实际应用中，这里应该：
      // 1. 将数据写入到指定格式的文件
      // 2. 将文件保存到临时目录或云存储
      // 3. 返回下载链接和过期时间
      
      // 简化实现：直接返回数据
      const response: ExportResponse = {
        success: true,
        data: {
          filename,
          download_url: `/api/system/logs/download/${filename}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时后过期
        },
        message: `导出完成，共 ${result.rowCount} 条记录`
      };

      // 模拟文件生成过程
      if (format === 'json') {
        // JSON格式：直接返回数据
        res.json({
          ...response,
          records: result.rows
        });
      } else {
        // CSV/Excel格式：提示文件已准备好
        res.json(response);
        return;
      }

    } catch (error: any) {
      console.error('导出日志失败:', error);
      res.status(500).json({
        success: false,
        error: '导出日志失败',
        details: error.message
      });
    }
  };
}
