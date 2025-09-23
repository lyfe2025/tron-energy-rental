/**
 * 配置历史控制器
 * 负责处理配置变更历史查询相关的请求
 */
import type { Request, Response } from 'express';
import { query } from '../../../config/database.ts';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 获取配置变更历史
 * GET /api/config-cache/history
 * 权限：管理员
 */
export const getConfigHistory: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { 
      entity_type, 
      entity_id, 
      operation_type, 
      limit = 50, 
      offset = 0 
    } = req.query;
    
    // 构建查询条件
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (entity_type) {
      conditions.push(`entity_type = $${paramIndex}`);
      queryParams.push(entity_type);
      paramIndex++;
    }
    
    if (entity_id) {
      conditions.push(`entity_id = $${paramIndex}`);
      queryParams.push(entity_id);
      paramIndex++;
    }
    
    if (operation_type) {
      conditions.push(`operation_type = $${paramIndex}`);
      queryParams.push(operation_type);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 获取历史记录
    const historyQuery = `
      SELECT 
        id, entity_type, entity_id, operation_type, field_name,
        old_value, new_value, change_reason, change_description, 
        user_id, user_type, ip_address, user_agent, session_id,
        request_id, rollback_id, is_rollback, severity, tags, 
        metadata, created_at
      FROM system_config_history
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit as string), parseInt(offset as string));
    
    const historyResult = await query(historyQuery, queryParams);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM system_config_history
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '配置变更历史获取成功',
      data: {
        history: historyResult.rows,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          has_more: total > parseInt(offset as string) + parseInt(limit as string)
        }
      }
    });
    
  } catch (error) {
    console.error('获取配置变更历史错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
