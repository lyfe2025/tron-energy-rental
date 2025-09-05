/**
 * 能量池批量操作控制器
 * 职责：处理能量池的批量配置更新和批量网络设置
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.ts';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 批量更新能量池配置
 * PUT /api/energy-pools-extended/batch-config
 * 权限：管理员
 */
export const batchUpdateConfig: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { pool_ids, config_updates } = req.body;
    
    if (!Array.isArray(pool_ids) || pool_ids.length === 0) {
      res.status(400).json({
        success: false,
        message: '请提供有效的能量池ID列表'
      });
      return;
    }
    
    if (!config_updates || typeof config_updates !== 'object') {
      res.status(400).json({
        success: false,
        message: '请提供有效的配置更新数据'
      });
      return;
    }
    
    // 验证能量池是否存在
    const poolsCheck = await query(
      'SELECT id, name FROM energy_pools WHERE id = ANY($1)',
      [pool_ids]
    );
    
    if (poolsCheck.rows.length !== pool_ids.length) {
      res.status(400).json({
        success: false,
        message: '部分能量池不存在'
      });
      return;
    }
    
    // 构建批量更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'auto_sync_enabled', 'sync_interval_minutes', 'config',
      'api_settings', 'monitoring_settings', 'security_settings'
    ];
    
    for (const field of allowedFields) {
      if (config_updates[field] !== undefined) {
        if (['config', 'api_settings', 'monitoring_settings', 'security_settings'].includes(field)) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(JSON.stringify(config_updates[field]));
        } else {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(config_updates[field]);
        }
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有提供要更新的配置字段'
      });
      return;
    }
    
    // 添加更新时间
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(pool_ids);
    
    // 执行批量更新
    const updateQuery = `
      UPDATE energy_pools 
      SET ${updateFields.join(', ')}
      WHERE id = ANY($${paramIndex})
      RETURNING id, name, updated_at
    `;
    
    const updatedPools = await query(updateQuery, updateValues);
    
    // 记录配置变更历史
    for (const pool of updatedPools.rows) {
      await query(
        `INSERT INTO system_config_history (
          entity_type, entity_id, operation_type, changed_fields,
          new_values, change_reason, changed_by, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'energy_pool',
          pool.id,
          'batch_update',
          updateFields.filter(f => !f.includes('updated_at')),
          JSON.stringify(config_updates),
          '批量更新能量池配置',
          req.user?.id || 'system',
          req.ip
        ]
      );
    }
    
    res.status(200).json({
      success: true,
      message: `成功更新 ${updatedPools.rows.length} 个能量池的配置`,
      data: {
        updated_pools: updatedPools.rows,
        update_count: updatedPools.rows.length
      }
    });
    
  } catch (error) {
    console.error('批量更新能量池配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 批量设置能量池网络配置
 * PUT /api/energy-pools-extended/batch-network
 * 权限：管理员
 */
export const batchSetPoolsNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { pool_ids, network_id, config, api_settings, monitoring_settings, security_settings } = req.body;
    
    // 验证必需字段
    if (!Array.isArray(pool_ids) || pool_ids.length === 0) {
      res.status(400).json({
        success: false,
        message: '请提供有效的能量池ID列表'
      });
      return;
    }
    
    if (!network_id) {
      res.status(400).json({
        success: false,
        message: '网络ID是必需的'
      });
      return;
    }
    
    // 检查网络是否存在且活跃
    const networkCheck = await query(
      'SELECT id, name, type FROM tron_networks WHERE id = $1 AND is_active = true',
      [network_id]
    );
    
    if (networkCheck.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: '指定的网络不存在或未激活'
      });
      return;
    }
    
    // 验证能量池是否存在
    const poolsCheck = await query(
      'SELECT id, name FROM energy_pools WHERE id = ANY($1)',
      [pool_ids]
    );
    
    if (poolsCheck.rows.length !== pool_ids.length) {
      res.status(400).json({
        success: false,
        message: '部分能量池不存在'
      });
      return;
    }
    
    // 使用数据库函数批量设置网络配置
    const result = await query(
      'SELECT batch_set_energy_pools_network($1, $2, $3, $4, $5, $6) as updated_count',
      [
        pool_ids,
        network_id,
        config ? JSON.stringify(config) : null,
        api_settings ? JSON.stringify(api_settings) : null,
        monitoring_settings ? JSON.stringify(monitoring_settings) : null,
        security_settings ? JSON.stringify(security_settings) : null
      ]
    );
    
    const updatedCount = result.rows[0].updated_count;
    
    // 记录批量配置变更历史
    for (const poolId of pool_ids) {
      await query(
        `INSERT INTO system_config_history (
          entity_type, entity_id, operation_type, changed_fields,
          new_values, change_reason, changed_by, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'energy_pool',
          poolId,
          'batch_set_network',
          ['network_id', 'config', 'api_settings', 'monitoring_settings', 'security_settings'],
          JSON.stringify({ network_id, config, api_settings, monitoring_settings, security_settings }),
          '批量设置能量池网络配置',
          req.user?.id || 'system',
          req.ip
        ]
      );
    }
    
    // 获取更新后的能量池信息
    const updatedPoolsResult = await query(`
      SELECT 
        ep.id,
        ep.name,
        ep.account_name,
        ep.network_id,
        ep.updated_at,
        tn.name as network_name,
        tn.type as network_type
      FROM energy_pools ep
      JOIN tron_networks tn ON ep.network_id = tn.id
      WHERE ep.id = ANY($1)
      ORDER BY ep.name
    `, [pool_ids]);
    
    res.status(200).json({
      success: true,
      message: `批量设置网络配置成功，共更新 ${updatedCount} 个能量池`,
      data: {
        updated_count: updatedCount,
        network: {
          network_id: network_id,
          network_name: networkCheck.rows[0].name,
          network_type: networkCheck.rows[0].type
        },
        updated_pools: updatedPoolsResult.rows
      }
    });
    
  } catch (error) {
    console.error('批量设置能量池网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};


