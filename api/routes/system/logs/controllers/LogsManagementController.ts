/**
 * 日志管理控制器 - 导出、清理等功能
 */
import type { Request, Response } from 'express';
import { query as dbQuery } from '../../../../database/index.js';
import type {
    CleanupConfig,
    CleanupRequest,
    CleanupResponse,
    ExportLogsRequest,
    ExportResponse,
    RouteHandler
} from '../types/logs.types.js';

export class LogsManagementController {
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

  /**
   * 获取清理配置
   */
  static getCleanupConfig: RouteHandler = async (req: Request, res: Response) => {
    try {
      // 从系统配置表获取清理配置
      const configQuery = `
        SELECT key, value
        FROM system_configs
        WHERE key IN (
          'operation_logs_retention_days',
          'login_logs_retention_days', 
          'auto_cleanup_enabled',
          'cleanup_schedule'
        )
      `;
      
      const result = await dbQuery(configQuery);
      
      // 将结果转换为配置对象
      const configMap = result.rows.reduce((acc: any, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});

      // 设置默认值
      const config: CleanupConfig = {
        operation_logs_retention_days: parseInt(configMap.operation_logs_retention_days) || 180,
        login_logs_retention_days: parseInt(configMap.login_logs_retention_days) || 90,
        auto_cleanup_enabled: configMap.auto_cleanup_enabled === 'true' || false,
        cleanup_schedule: configMap.cleanup_schedule || '0 2 * * 0' // 每周日凌晨2点
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      console.error('获取清理配置失败:', error);
      
      // 返回默认配置
      const defaultConfig: CleanupConfig = {
        operation_logs_retention_days: 180,
        login_logs_retention_days: 90,
        auto_cleanup_enabled: false,
        cleanup_schedule: '0 2 * * 0'
      };

      res.json({
        success: true,
        data: defaultConfig,
        message: '使用默认配置（无法从数据库加载配置）'
      });
    }
  };

  /**
   * 更新清理配置
   */
  static updateCleanupConfig: RouteHandler = async (req: Request, res: Response) => {
    try {
      const {
        operation_logs_retention_days,
        login_logs_retention_days,
        auto_cleanup_enabled,
        cleanup_schedule
      } = req.body as CleanupConfig;

      // 验证参数
      if (operation_logs_retention_days && (operation_logs_retention_days < 7 || operation_logs_retention_days > 3650)) {
        res.status(400).json({
          success: false,
          error: '操作日志保留天数必须在7-3650之间'
        });
        return;
      }

      if (login_logs_retention_days && (login_logs_retention_days < 7 || login_logs_retention_days > 3650)) {
        res.status(400).json({
          success: false,
          error: '登录日志保留天数必须在7-3650之间'
        });
        return;
      }

      // 更新系统配置表
      const configs = [
        { key: 'operation_logs_retention_days', value: operation_logs_retention_days?.toString() },
        { key: 'login_logs_retention_days', value: login_logs_retention_days?.toString() },
        { key: 'auto_cleanup_enabled', value: auto_cleanup_enabled?.toString() },
        { key: 'cleanup_schedule', value: cleanup_schedule }
      ].filter(config => config.value !== undefined);

      for (const config of configs) {
        const upsertQuery = `
          INSERT INTO system_configs (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET value = $2, updated_at = NOW()
        `;
        await dbQuery(upsertQuery, [config.key, config.value]);
      }

      const updatedConfig: CleanupConfig = {
        operation_logs_retention_days,
        login_logs_retention_days,
        auto_cleanup_enabled,
        cleanup_schedule
      };

      res.json({
        success: true,
        data: updatedConfig,
        message: '清理配置更新成功'
      });
    } catch (error: any) {
      console.error('更新清理配置失败:', error);
      res.status(500).json({
        success: false,
        error: '更新清理配置失败',
        details: error.message
      });
    }
  };

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
          admin_id, operation, module, url, method, request_params, 
          ip_address, user_agent, created_at
        ) VALUES (
          $1, 'logs_cleanup', 'system', '/api/system/logs/cleanup', 'POST', $2,
          $3, $4, NOW()
        )
      `;
      
      const adminId = (req as any).user?.id;
      const requestParams = JSON.stringify({ type, retention_days, force, results });
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      await dbQuery(logQuery, [adminId, requestParams, ipAddress, userAgent]);

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
