/**
 * 日志清理控制器
 * 负责处理日志清理和预览相关功能
 */
import type { Request, Response } from 'express';
import { query as dbQuery } from '../../../../../database/index.js';
import type {
  CleanupRequest,
  CleanupResponse,
  RouteHandler
} from '../../types/logs.types.js';

export class LogsCleanupController {
  /**
   * 执行日志清理
   */
  static cleanupLogs: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { type, retention_days, force = false } = req.body as CleanupRequest;

      if (!['operations', 'logins', 'both'].includes(type)) {
        res.status(400).json({
          success: false,
          error: '清理类型必须是 operations、logins 或 both'
        });
        return;
      }

      if (!retention_days || retention_days < 7 || retention_days > 3650) {
        res.status(400).json({
          success: false,
          error: '保留天数必须在7-3650之间'
        });
        return;
      }

      let totalDeleted = 0;
      const results: Array<{ type: string; deleted: number }> = [];

      // 清理操作日志
      if (type === 'operations' || type === 'both') {
        // 先检查将要删除的记录数
        const countQuery = `
          SELECT COUNT(*) as count
          FROM operation_logs 
          WHERE created_at < NOW() - INTERVAL '${retention_days} days'
        `;
        const countResult = await dbQuery(countQuery);
        const operationCount = parseInt(countResult.rows[0].count);

        if (operationCount > 10000 && !force) {
          res.status(400).json({
            success: false,
            error: `即将删除 ${operationCount} 条操作日志，请设置 force: true 确认删除`,
            data: { count: operationCount }
          });
          return;
        }

        const operationDeleteQuery = `
          DELETE FROM operation_logs 
          WHERE created_at < NOW() - INTERVAL '${retention_days} days'
        `;
        const operationResult = await dbQuery(operationDeleteQuery);
        const operationDeleted = operationResult.rowCount || 0;
        
        totalDeleted += operationDeleted;
        results.push({ type: 'operations', deleted: operationDeleted });
      }

      // 清理登录日志
      if (type === 'logins' || type === 'both') {
        // 先检查将要删除的记录数
        const countQuery = `
          SELECT COUNT(*) as count
          FROM login_logs 
          WHERE login_time < NOW() - INTERVAL '${retention_days} days'
        `;
        const countResult = await dbQuery(countQuery);
        const loginCount = parseInt(countResult.rows[0].count);

        if (loginCount > 10000 && !force) {
          res.status(400).json({
            success: false,
            error: `即将删除 ${loginCount} 条登录日志，请设置 force: true 确认删除`,
            data: { count: loginCount }
          });
          return;
        }

        const loginDeleteQuery = `
          DELETE FROM login_logs 
          WHERE login_time < NOW() - INTERVAL '${retention_days} days'
        `;
        const loginResult = await dbQuery(loginDeleteQuery);
        const loginDeleted = loginResult.rowCount || 0;
        
        totalDeleted += loginDeleted;
        results.push({ type: 'logins', deleted: loginDeleted });
      }

      // 记录清理操作
      const logQuery = `
        INSERT INTO operation_logs (
          admin_id, username, operation, module, url, method, request_params, 
          ip_address, user_agent, created_at
        ) VALUES (
          $1, $2, 'logs_cleanup', 'system', '/api/system/logs/cleanup', 'POST', $3,
          $4, $5, NOW()
        )
      `;
      
      const adminId = (req as any).user?.id;
      const username = (req as any).user?.username;
      const requestParams = JSON.stringify({ type, retention_days, force, results });
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      await dbQuery(logQuery, [adminId, username, requestParams, ipAddress, userAgent]);

      const response: CleanupResponse = {
        success: true,
        data: {
          deleted_count: totalDeleted,
          operation: type,
          retention_days
        },
        message: `成功清理 ${totalDeleted} 条日志记录`
      };

      res.json(response);
        return;
    } catch (error: any) {
      console.error('清理日志失败:', error);
      res.status(500).json({
        success: false,
        error: '清理日志失败',
        details: error.message
      });
    }
  };

  /**
   * 获取清理预览（查看将要删除的记录数）
   */
  static getCleanupPreview: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { type, retention_days } = req.query;

      if (!type || !['operations', 'logins', 'both'].includes(type as string)) {
        res.status(400).json({
          success: false,
          error: '清理类型必须是 operations、logins 或 both'
        });
        return;
      }

      const days = parseInt(retention_days as string);
      if (!days || days < 7 || days > 3650) {
        res.status(400).json({
          success: false,
          error: '保留天数必须在7-3650之间'
        });
        return;
      }

      const preview: Array<{ type: string; count: number; oldest_date: string; size_mb?: number }> = [];

      // 预览操作日志
      if (type === 'operations' || type === 'both') {
        const operationQuery = `
          SELECT 
            COUNT(*) as count,
            MIN(created_at) as oldest_date,
            pg_size_pretty(pg_total_relation_size('operation_logs')) as table_size
          FROM operation_logs 
          WHERE created_at < NOW() - INTERVAL '${days} days'
        `;
        const result = await dbQuery(operationQuery);
        const row = result.rows[0];
        
        preview.push({
          type: 'operations',
          count: parseInt(row.count) || 0,
          oldest_date: row.oldest_date || null,
          size_mb: row.table_size
        });
      }

      // 预览登录日志
      if (type === 'logins' || type === 'both') {
        const loginQuery = `
          SELECT 
            COUNT(*) as count,
            MIN(login_time) as oldest_date,
            pg_size_pretty(pg_total_relation_size('login_logs')) as table_size
          FROM login_logs 
          WHERE login_time < NOW() - INTERVAL '${days} days'
        `;
        const result = await dbQuery(loginQuery);
        const row = result.rows[0];
        
        preview.push({
          type: 'logins',
          count: parseInt(row.count) || 0,
          oldest_date: row.oldest_date || null,
          size_mb: row.table_size
        });
      }

      const totalCount = preview.reduce((sum, item) => sum + item.count, 0);

      res.json({
        success: true,
        data: {
          preview,
          total_count: totalCount,
          retention_days: days,
          cutoff_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    } catch (error: any) {
      console.error('获取清理预览失败:', error);
      res.status(500).json({
        success: false,
        error: '获取清理预览失败',
        details: error.message
      });
    }
  };
}
