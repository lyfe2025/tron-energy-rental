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
    
    // 检查机器人是否存在并获取当前网络配置
    const botResult = await query(
      'SELECT id, network_configurations FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    const bot = botResult.rows[0];
    const networkConfigs = bot.network_configurations || [];
    
    // 检查网络配置是否存在
    const configExists = networkConfigs.some((config: any) => config.networkId === networkId);
    if (!configExists) {
      res.status(404).json({
        success: false,
        message: '网络配置不存在'
      });
      return;
    }
    
    // 更新网络配置：将所有网络设为非主要，指定网络设为主要
    const updatedConfigs = networkConfigs.map((config: any) => ({
      ...config,
      isPrimary: config.networkId === networkId
    }));
    
    // 更新机器人的网络配置
    await query(
      'UPDATE telegram_bots SET network_configurations = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(updatedConfigs), id]
    );
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        new_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'telegram_bot',
        id,
        'update',
        'network_configurations',
        JSON.stringify({ primary_network: networkId }),
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
