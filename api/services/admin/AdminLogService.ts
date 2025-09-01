/**
 * 管理员操作日志服务
 * 从 admin.ts 中安全分离的操作日志记录功能
 */

import pool from '../../config/database.js';

export class AdminLogService {
  /**
   * 记录操作日志
   */
  static async logOperation(data: {
    user_id: string;
    action: string;
    resource: string;
    resource_id?: string;
    details?: any;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    const { user_id, action, resource, resource_id, details, ip_address, user_agent } = data;
    
    const query = `
      INSERT INTO operation_logs (
        user_id, action, resource, resource_id, details, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await pool.query(query, [
      user_id,
      action,
      resource,
      resource_id,
      details ? JSON.stringify(details) : null,
      ip_address,
      user_agent
    ]);
  }

  /**
   * 获取操作日志列表
   */
  static async getOperationLogs(params: {
    page?: number;
    limit?: number;
    user_id?: string;
    action?: string;
    resource?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      user_id,
      action,
      resource,
      start_date,
      end_date
    } = params;
    
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 构建查询条件
    if (user_id) {
      conditions.push(`ol.user_id = $${paramIndex}`);
      values.push(user_id);
      paramIndex++;
    }

    if (action) {
      conditions.push(`ol.action = $${paramIndex}`);
      values.push(action);
      paramIndex++;
    }

    if (resource) {
      conditions.push(`ol.resource = $${paramIndex}`);
      values.push(resource);
      paramIndex++;
    }

    if (start_date) {
      conditions.push(`ol.created_at >= $${paramIndex}`);
      values.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      conditions.push(`ol.created_at <= $${paramIndex}`);
      values.push(end_date);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM operation_logs ol
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // 获取数据
    const dataQuery = `
      SELECT 
        ol.*,
        a.username,
        a.email
      FROM operation_logs ol
      LEFT JOIN admins a ON ol.user_id = a.id
      ${whereClause}
      ORDER BY ol.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    
    const dataResult = await pool.query(dataQuery, values);

    return {
      logs: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 获取用户操作统计
   */
  static async getUserOperationStats(userId: string, days: number = 30) {
    const query = `
      SELECT 
        action,
        resource,
        COUNT(*) as count
      FROM operation_logs
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY action, resource
      ORDER BY count DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * 获取系统操作统计（按天）
   */
  static async getSystemOperationStats(days: number = 7) {
    const query = `
      SELECT 
        DATE(created_at) as operation_date,
        action,
        COUNT(*) as count
      FROM operation_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at), action
      ORDER BY operation_date DESC, count DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * 获取热门操作排行
   */
  static async getTopOperations(limit: number = 10, days: number = 30) {
    const query = `
      SELECT 
        action,
        resource,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as user_count
      FROM operation_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY action, resource
      ORDER BY count DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * 获取异常操作记录
   */
  static async getSuspiciousOperations(days: number = 7) {
    const query = `
      SELECT 
        ol.*,
        a.username,
        a.email,
        COUNT(*) OVER (PARTITION BY ol.user_id, ol.ip_address) as same_ip_count
      FROM operation_logs ol
      LEFT JOIN admins a ON ol.user_id = a.id
      WHERE ol.created_at >= NOW() - INTERVAL '${days} days'
        AND (
          ol.action IN ('delete', 'update_password', 'update_status') 
          OR ol.created_at IN (
            SELECT created_at 
            FROM operation_logs 
            WHERE user_id = ol.user_id 
              AND created_at >= NOW() - INTERVAL '1 hour' 
            GROUP BY user_id, DATE_TRUNC('hour', created_at) 
            HAVING COUNT(*) > 50
          )
        )
      ORDER BY ol.created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * 清理过期日志
   */
  static async cleanupExpiredLogs(retentionDays: number = 90): Promise<number> {
    const query = `
      DELETE FROM operation_logs 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    `;
    
    const result = await pool.query(query);
    return result.rowCount || 0;
  }

  /**
   * 导出操作日志
   */
  static async exportLogs(params: {
    start_date?: string;
    end_date?: string;
    user_id?: string;
    format?: 'csv' | 'json';
  }) {
    const { start_date, end_date, user_id, format = 'csv' } = params;
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (start_date) {
      conditions.push(`ol.created_at >= $${paramIndex}`);
      values.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      conditions.push(`ol.created_at <= $${paramIndex}`);
      values.push(end_date);
      paramIndex++;
    }

    if (user_id) {
      conditions.push(`ol.user_id = $${paramIndex}`);
      values.push(user_id);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        ol.created_at,
        a.username,
        a.email,
        ol.action,
        ol.resource,
        ol.resource_id,
        ol.details,
        ol.ip_address,
        ol.user_agent
      FROM operation_logs ol
      LEFT JOIN admins a ON ol.user_id = a.id
      ${whereClause}
      ORDER BY ol.created_at DESC
    `;
    
    const result = await pool.query(query, values);
    
    if (format === 'json') {
      return result.rows;
    } else {
      // 生成CSV格式
      const headers = ['时间', '用户名', '邮箱', '操作', '资源', '资源ID', '详情', 'IP地址', '用户代理'];
      const csvRows = [headers.join(',')];
      
      result.rows.forEach(row => {
        const csvRow = [
          row.created_at,
          row.username || '',
          row.email || '',
          row.action,
          row.resource,
          row.resource_id || '',
          row.details ? JSON.stringify(row.details).replace(/"/g, '""') : '',
          row.ip_address || '',
          row.user_agent || ''
        ].map(field => `"${field}"`);
        
        csvRows.push(csvRow.join(','));
      });
      
      return csvRows.join('\n');
    }
  }
}
