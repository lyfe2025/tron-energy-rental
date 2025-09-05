/**
 * 机器人网络管理控制器
 * 包含：设置主要网络等网络管理功能
 */
import { type Request, type Response } from 'express';
import { query } from '../../../../config/database.js';
import type { RouteHandler } from '../../types.js';

/**
 * 设置主要网络
 * PATCH /api/bots/:id/networks/:networkId/primary
 * 权限：管理员
 */
export const setPrimaryNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id, networkId } = req.params;
    
    // 检查配置是否存在
    const configCheck = await query(
      'SELECT id FROM bot_network_configs WHERE bot_id = $1 AND network_id = $2',
      [id, networkId]
    );
    
    if (configCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '网络配置不存在'
      });
      return;
    }
    
    // 将所有网络设为非主要
    await query(
      'UPDATE bot_network_configs SET is_primary = false WHERE bot_id = $1',
      [id]
    );
    
    // 设置指定网络为主要
    await query(
      'UPDATE bot_network_configs SET is_primary = true, updated_at = CURRENT_TIMESTAMP WHERE bot_id = $1 AND network_id = $2',
      [id, networkId]
    );
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        new_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'bot_network_config',
        configCheck.rows[0].id,
        'update',
        'is_primary',
        JSON.stringify({ is_primary: true }),
        '设置主要网络',
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.status(200).json({
      success: true,
      message: '主要网络设置成功'
    });
    
  } catch (error) {
    console.error('设置主要网络错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
