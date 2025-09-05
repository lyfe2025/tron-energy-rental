/**
 * TRON网络健康检查和状态管理控制器
 * 包含：单个网络状态切换、批量状态更新等功能
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 切换单个网络状态
 * PATCH /api/tron-networks/:id/toggle
 * 权限：管理员
 */
export const toggleNetworkStatus: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取当前网络状态
    const networkResult = await query(
      `SELECT id, name, is_active FROM tron_networks WHERE id = $1`,
      [id]
    );
    
    if (networkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'TRON网络不存在'
      });
      return;
    }
    
    const currentNetwork = networkResult.rows[0];
    const newStatus = !currentNetwork.is_active;
    
    // 更新网络状态
    const updatedResult = await query(
      `UPDATE tron_networks 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, network_type as type, rpc_url, chain_id, 
                 block_explorer_url as explorer_url, is_active, is_default, 
                 priority, timeout_ms, retry_count, rate_limit_per_second as rate_limit, 
                 health_status, last_health_check as last_check_at, description, updated_at`,
      [newStatus, id]
    );
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        old_value, new_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'tron_network',
        id,
        'update',
        'is_active',
        JSON.stringify({ is_active: currentNetwork.is_active }),
        JSON.stringify({ is_active: newStatus }),
        `${newStatus ? '启用' : '禁用'}TRON网络`,
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.status(200).json({
      success: true,
      message: `网络已${newStatus ? '启用' : '禁用'}`,
      data: updatedResult.rows[0]
    });
    
  } catch (error) {
    console.error('切换网络状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 批量更新网络状态
 * PUT /api/tron-networks/batch/status
 * 权限：管理员
 */
export const batchUpdateNetworkStatus: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { network_ids, is_active } = req.body;
    
    // 验证请求参数
    if (!network_ids || !Array.isArray(network_ids) || network_ids.length === 0) {
      res.status(400).json({
        success: false,
        message: '请提供要更新的网络ID列表'
      });
      return;
    }
    
    if (typeof is_active !== 'boolean') {
      res.status(400).json({
        success: false,
        message: '请提供有效的状态值 (true/false)'
      });
      return;
    }
    
    // 检查网络是否存在
    const existingNetworksResult = await query(
      `SELECT id, name FROM tron_networks WHERE id = ANY($1)`,
      [network_ids]
    );
    
    const existingIds = existingNetworksResult.rows.map(row => row.id);
    const notFoundIds = network_ids.filter(id => !existingIds.includes(id));
    
    if (notFoundIds.length > 0) {
      res.status(400).json({
        success: false,
        message: `以下网络ID不存在: ${notFoundIds.join(', ')}`
      });
      return;
    }
    
    // 批量更新网络状态
    const updateResult = await query(
      `UPDATE tron_networks 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($2)
       RETURNING id, name, network_type as type, is_active, last_health_check as last_check_at`,
      [is_active, network_ids]
    );
    
    // 批量记录配置变更历史
    const historyPromises = network_ids.map(networkId => 
      query(
        `INSERT INTO system_config_history (
          entity_type, entity_id, operation_type, field_name,
          new_value, change_reason, user_id, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'tron_network',
          networkId,
          'update',
          'is_active',
          JSON.stringify({ is_active }),
          `批量${is_active ? '启用' : '禁用'}TRON网络`,
          req.user?.id || null,
          req.ip
        ]
      )
    );
    
    await Promise.all(historyPromises);
    
    res.status(200).json({
      success: true,
      message: `成功${is_active ? '启用' : '禁用'} ${updateResult.rows.length} 个网络`,
      data: {
        updated_count: updateResult.rows.length,
        networks: updateResult.rows
      }
    });
    
  } catch (error) {
    console.error('批量更新网络状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
