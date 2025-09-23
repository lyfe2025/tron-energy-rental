/**
 * TRON网络查询控制器
 * 包含：网络列表查询、详情获取等查询操作
 */
import { type Request, type Response } from 'express';
import { query } from '../../../../config/database.js';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 获取TRON网络列表
 * GET /api/tron-networks
 * 权限：管理员
 */
export const getNetworksList: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status,
      search 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (type) {
      conditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    if (status === 'active') {
      conditions.push(`is_active = true`);
    } else if (status === 'inactive') {
      conditions.push(`is_active = false`);
    }
    
    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 查询网络列表
    const networksQuery = `
      SELECT 
        id, name, network_type, rpc_url, api_key, chain_id, block_explorer_url,
        is_active, is_default, priority, timeout_ms, retry_count,
        rate_limit_per_second, health_status, last_health_check,
        description, created_at, updated_at, config
      FROM tron_networks 
      ${whereClause}
      ORDER BY priority ASC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const networksResult = await query(networksQuery, queryParams);
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM tron_networks ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: 'TRON网络列表获取成功',
      data: {
        networks: networksResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取TRON网络列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取单个TRON网络详情
 * GET /api/tron-networks/:id
 * 权限：管理员
 */
export const getNetworkDetails: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const networkResult = await query(
      `SELECT 
        id, name, network_type, rpc_url, api_key, chain_id, block_explorer_url,
        is_active, is_default, priority, timeout_ms, retry_count,
        rate_limit_per_second, config, health_check_url, health_status,
        last_health_check, description, created_at, updated_at
       FROM tron_networks 
       WHERE id = $1`,
      [id]
    );
    
    if (networkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'TRON网络不存在'
      });
      return;
    }
    
    // 获取使用此网络的机器人数量
    const botCountResult = await query(
      `SELECT COUNT(*) as bot_count FROM telegram_bots 
       WHERE is_active = true 
       AND network_configurations IS NOT NULL 
       AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(network_configurations) AS config 
         WHERE (config->>'networkId')::uuid = $1 
         AND (config->>'isActive')::boolean IS NOT FALSE
       )`,
      [id]
    );
    
    // 获取使用此网络的能量池数量 (暂时设为0，因为energy_pools表没有network_id字段)
    const poolCountResult = { rows: [{ pool_count: '0' }] };
    
    const network = networkResult.rows[0];
    const botCount = parseInt(botCountResult.rows[0].bot_count);
    const poolCount = parseInt(poolCountResult.rows[0].pool_count);
    
    res.status(200).json({
      success: true,
      message: 'TRON网络详情获取成功',
      data: {
        network,
        usage_stats: {
          connected_bots: botCount,
          connected_pools: poolCount
        }
      }
    });
    
  } catch (error) {
    console.error('获取TRON网络详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
