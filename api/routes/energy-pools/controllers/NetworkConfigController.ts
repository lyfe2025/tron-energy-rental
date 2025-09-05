/**
 * 能量池网络配置管理控制器
 * 职责：处理能量池与TRON网络的关联配置
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.ts';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 获取能量池网络关联配置
 * GET /api/energy-pools-extended/:id/network-config
 * 权限：管理员
 */
export const getPoolNetworkConfig: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取能量池及其网络配置
    const poolResult = await query(
      `SELECT 
        ep.id, ep.name, ep.account_name, ep.account_alias, ep.account_group,
        ep.network_id, ep.config, ep.api_settings, ep.monitoring_settings,
        ep.security_settings, ep.auto_sync_enabled, ep.sync_interval_minutes,
        ep.last_sync_at, ep.sync_status, ep.health_status, ep.last_health_check,
        tn.name as network_name, tn.type as network_type, tn.rpc_url, tn.chain_id
       FROM energy_pools ep
       LEFT JOIN tron_networks tn ON ep.network_id = tn.id
       WHERE ep.id = $1`,
      [id]
    );
    
    if (poolResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量池不存在'
      });
      return;
    }
    
    const pool = poolResult.rows[0];
    
    res.status(200).json({
      success: true,
      message: '能量池网络配置获取成功',
      data: {
        pool_info: {
          id: pool.id,
          name: pool.name,
          account_name: pool.account_name,
          account_alias: pool.account_alias,
          account_group: pool.account_group
        },
        network_config: {
          network_id: pool.network_id,
          network_name: pool.network_name,
          network_type: pool.network_type,
          rpc_url: pool.rpc_url,
          chain_id: pool.chain_id
        },
        pool_config: pool.config,
        api_settings: pool.api_settings,
        monitoring_settings: pool.monitoring_settings,
        security_settings: pool.security_settings,
        sync_config: {
          auto_sync_enabled: pool.auto_sync_enabled,
          sync_interval_minutes: pool.sync_interval_minutes,
          last_sync_at: pool.last_sync_at,
          sync_status: pool.sync_status
        },
        health_info: {
          health_status: pool.health_status,
          last_health_check: pool.last_health_check
        }
      }
    });
    
  } catch (error) {
    console.error('获取能量池网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新能量池网络关联
 * PUT /api/energy-pools-extended/:id/network
 * 权限：管理员
 */
export const updatePoolNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { network_id, config, api_settings, monitoring_settings, security_settings } = req.body;
    
    // 验证网络是否存在
    if (network_id) {
      const networkCheck = await query(
        'SELECT id FROM tron_networks WHERE id = $1 AND is_active = true',
        [network_id]
      );
      
      if (networkCheck.rows.length === 0) {
        res.status(400).json({
          success: false,
          message: '指定的网络不存在或未激活'
        });
        return;
      }
    }
    
    // 检查能量池是否存在
    const poolCheck = await query(
      'SELECT id FROM energy_pools WHERE id = $1',
      [id]
    );
    
    if (poolCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量池不存在'
      });
      return;
    }
    
    // 构建更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (network_id !== undefined) {
      updateFields.push(`network_id = $${paramIndex}`);
      updateValues.push(network_id);
      paramIndex++;
    }
    
    if (config !== undefined) {
      updateFields.push(`config = $${paramIndex}`);
      updateValues.push(JSON.stringify(config));
      paramIndex++;
    }
    
    if (api_settings !== undefined) {
      updateFields.push(`api_settings = $${paramIndex}`);
      updateValues.push(JSON.stringify(api_settings));
      paramIndex++;
    }
    
    if (monitoring_settings !== undefined) {
      updateFields.push(`monitoring_settings = $${paramIndex}`);
      updateValues.push(JSON.stringify(monitoring_settings));
      paramIndex++;
    }
    
    if (security_settings !== undefined) {
      updateFields.push(`security_settings = $${paramIndex}`);
      updateValues.push(JSON.stringify(security_settings));
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
      return;
    }
    
    // 添加更新时间
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    
    // 执行更新
    const updateQuery = `
      UPDATE energy_pools 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, network_id, updated_at
    `;
    
    const updatedPool = await query(updateQuery, updateValues);
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, changed_fields,
        new_values, change_reason, changed_by, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'energy_pool',
        id,
        'update_network',
        updateFields.filter(f => !f.includes('updated_at')),
        JSON.stringify(req.body),
        '更新能量池网络配置',
        req.user?.id || 'system',
        req.ip
      ]
    );
    
    res.status(200).json({
      success: true,
      message: '能量池网络配置更新成功',
      data: {
        pool: updatedPool.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新能量池网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取能量池当前网络配置（单网络模式）
 * GET /api/energy-pools-extended/:id/network
 * 权限：管理员
 */
export const getPoolCurrentNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查能量池是否存在
    const poolCheck = await query('SELECT id FROM energy_pools WHERE id = $1', [id]);
    if (poolCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量池不存在'
      });
      return;
    }
    
    // 获取能量池的网络配置
    const networkResult = await query(`
      SELECT 
        ep.id,
        ep.name,
        ep.account_name,
        ep.account_alias,
        ep.network_id,
        ep.config,
        ep.api_settings,
        ep.monitoring_settings,
        ep.security_settings,
        ep.status,
        ep.created_at,
        ep.updated_at,
        tn.name as network_name,
        tn.type as network_type,
        tn.rpc_url,
        tn.is_active as network_is_active
      FROM energy_pools ep
      LEFT JOIN tron_networks tn ON ep.network_id = tn.id
      WHERE ep.id = $1
    `, [id]);
    
    const poolData = networkResult.rows[0];
    
    if (!poolData.network_id) {
      res.status(200).json({
        success: true,
        message: '能量池尚未配置网络',
        data: {
          pool: {
            id: poolData.id,
            name: poolData.name,
            account_name: poolData.account_name,
            account_alias: poolData.account_alias,
            status: poolData.status
          },
          network: null
        }
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: '获取能量池网络配置成功',
      data: {
        pool: {
          id: poolData.id,
          name: poolData.name,
          account_name: poolData.account_name,
          account_alias: poolData.account_alias,
          status: poolData.status,
          config: poolData.config,
          api_settings: poolData.api_settings,
          monitoring_settings: poolData.monitoring_settings,
          security_settings: poolData.security_settings,
          created_at: poolData.created_at,
          updated_at: poolData.updated_at
        },
        network: {
          network_id: poolData.network_id,
          network_name: poolData.network_name,
          network_type: poolData.network_type,
          rpc_url: poolData.rpc_url,
          network_is_active: poolData.network_is_active
        }
      }
    });
    
  } catch (error) {
    console.error('获取能量池网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 设置能量池网络配置（单网络模式）
 * PUT /api/energy-pools-extended/:id/network
 * 权限：管理员
 */
export const setPoolNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { network_id, config, api_settings, monitoring_settings, security_settings } = req.body;
    
    // 验证必需字段
    if (!network_id) {
      res.status(400).json({
        success: false,
        message: '网络ID是必需的'
      });
      return;
    }
    
    // 检查能量池是否存在
    const poolCheck = await query('SELECT id, name FROM energy_pools WHERE id = $1', [id]);
    if (poolCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量池不存在'
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
    
    // 使用数据库函数设置能量池网络配置
    const result = await query(
      'SELECT set_energy_pool_network($1, $2, $3, $4, $5, $6) as success',
      [
        id,
        network_id,
        config ? JSON.stringify(config) : null,
        api_settings ? JSON.stringify(api_settings) : null,
        monitoring_settings ? JSON.stringify(monitoring_settings) : null,
        security_settings ? JSON.stringify(security_settings) : null
      ]
    );
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, changed_fields,
        new_values, change_reason, changed_by, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'energy_pool',
        id,
        'set_network',
        ['network_id', 'config', 'api_settings', 'monitoring_settings', 'security_settings'],
        JSON.stringify({ network_id, config, api_settings, monitoring_settings, security_settings }),
        '设置能量池网络配置',
        req.user?.id || 'system',
        req.ip
      ]
    );
    
    // 获取设置后的网络配置
    const newConfigResult = await query(`
      SELECT 
        ep.id,
        ep.name,
        ep.account_name,
        ep.network_id,
        ep.config,
        ep.api_settings,
        ep.monitoring_settings,
        ep.security_settings,
        ep.updated_at,
        tn.name as network_name,
        tn.type as network_type
      FROM energy_pools ep
      JOIN tron_networks tn ON ep.network_id = tn.id
      WHERE ep.id = $1
    `, [id]);
    
    res.status(200).json({
      success: true,
      message: '能量池网络配置设置成功',
      data: {
        pool: newConfigResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('设置能量池网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};


