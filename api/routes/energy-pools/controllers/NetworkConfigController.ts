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
    
    console.log(`🔍 [NetworkConfig] 获取能量池网络配置，ID: ${id}`);
    
    // 检查能量池是否存在
    const poolResult = await query(`
      SELECT 
        id,
        name,
        tron_address,
        status,
        created_at,
        updated_at
      FROM energy_pools 
      WHERE id = $1
    `, [id]);
    
    if (poolResult.rows.length === 0) {
      console.log(`❌ [NetworkConfig] 能量池不存在，ID: ${id}`);
      res.status(404).json({
        success: false,
        message: '能量池不存在'
      });
      return;
    }
    
    const poolData = poolResult.rows[0];
    console.log(`✅ [NetworkConfig] 找到能量池: ${poolData.name}`);
    
    // 获取能量池账户的实际网络配置
    const networkResult = await query(`
      SELECT 
        ep.network_id,
        tn.id,
        tn.name,
        tn.network_type,
        tn.rpc_url,
        tn.is_active
      FROM energy_pools ep
      LEFT JOIN tron_networks tn ON ep.network_id = tn.id
      WHERE ep.id = $1
    `, [id]);
    
    let networkInfo = null;
    if (networkResult.rows.length > 0) {
      const networkData = networkResult.rows[0];
      if (networkData.network_id && networkData.id) {
        // 账户有配置网络
        networkInfo = {
          network_id: networkData.id,
          network_name: networkData.name,
          network_type: networkData.network_type,
          rpc_url: networkData.rpc_url,
          network_is_active: networkData.is_active
        };
        console.log(`✅ [NetworkConfig] 使用账户配置的网络: ${networkData.name}`);
      } else {
        // 账户没有配置网络，使用默认网络
        console.log(`⚠️ [NetworkConfig] 账户未配置网络，查找默认网络`);
        const defaultNetworkResult = await query(`
          SELECT 
            id,
            name,
            network_type,
            rpc_url,
            is_active
          FROM tron_networks 
          WHERE is_default = true 
          LIMIT 1
        `);
        
        if (defaultNetworkResult.rows.length > 0) {
          const defaultNetwork = defaultNetworkResult.rows[0];
          networkInfo = {
            network_id: defaultNetwork.id,
            network_name: defaultNetwork.name,
            network_type: defaultNetwork.network_type,
            rpc_url: defaultNetwork.rpc_url,
            network_is_active: defaultNetwork.is_active
          };
          console.log(`✅ [NetworkConfig] 使用默认网络: ${defaultNetwork.name}`);
        }
      }
    } else {
      console.log(`⚠️ [NetworkConfig] 查询网络配置失败`);
    }
    
    res.status(200).json({
      success: true,
      message: networkInfo ? '获取能量池网络配置成功' : '能量池尚未配置网络',
      data: {
        pool: {
          id: poolData.id,
          name: poolData.name,
          tron_address: poolData.tron_address,
          status: poolData.status,
          created_at: poolData.created_at,
          updated_at: poolData.updated_at
        },
        network_id: networkInfo?.network_id || null,
        network: networkInfo
      }
    });
    
  } catch (error) {
    console.error('💥 [NetworkConfig] 获取能量池网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const { network_id } = req.body;
    
    console.log(`🔍 [NetworkConfig] 设置能量池网络配置，Pool ID: ${id}, Network ID: ${network_id}`);
    
    // 验证必需字段
    if (!network_id) {
      console.log(`❌ [NetworkConfig] 网络ID缺失`);
      res.status(400).json({
        success: false,
        message: '网络ID是必需的'
      });
      return;
    }
    
    // 检查能量池是否存在
    const poolResult = await query(`
      SELECT 
        id, 
        name, 
        tron_address, 
        status 
      FROM energy_pools 
      WHERE id = $1
    `, [id]);
    
    if (poolResult.rows.length === 0) {
      console.log(`❌ [NetworkConfig] 能量池不存在，ID: ${id}`);
      res.status(404).json({
        success: false,
        message: '能量池不存在'
      });
      return;
    }
    
    const poolData = poolResult.rows[0];
    console.log(`✅ [NetworkConfig] 找到能量池: ${poolData.name}`);
    
    // 检查网络是否存在且活跃
    const networkResult = await query(`
      SELECT 
        id, 
        name, 
        network_type, 
        rpc_url, 
        is_active 
      FROM tron_networks 
      WHERE id = $1
    `, [network_id]);
    
    if (networkResult.rows.length === 0) {
      console.log(`❌ [NetworkConfig] 网络不存在，ID: ${network_id}`);
      res.status(400).json({
        success: false,
        message: '指定的网络不存在'
      });
      return;
    }
    
    const networkData = networkResult.rows[0];
    
    if (!networkData.is_active) {
      console.log(`⚠️ [NetworkConfig] 网络未激活: ${networkData.name}`);
      res.status(400).json({
        success: false,
        message: '指定的网络未激活'
      });
      return;
    }
    
    console.log(`✅ [NetworkConfig] 找到网络: ${networkData.name} (${networkData.network_type})`);
    
    // 将网络ID保存到能量池表中
    console.log(`💾 [NetworkConfig] 保存网络配置到数据库`);
    
    const updateResult = await query(
      'UPDATE energy_pools SET network_id = $1, updated_at = NOW() WHERE id = $2',
      [network_id, id]
    );
    
    if (updateResult.rowCount === 0) {
      console.log(`❌ [NetworkConfig] 更新能量池网络配置失败，可能能量池不存在`);
      res.status(404).json({
        success: false,
        message: '更新失败，能量池不存在'
      });
      return;
    }
    
    console.log(`✅ [NetworkConfig] 网络配置已成功保存到数据库`);
    
    // 可选：记录配置变更到历史表（如果存在）
    try {
      await query(
        `INSERT INTO system_config_history (
          entity_type, entity_id, operation_type, changed_fields,
          new_values, change_reason, changed_by, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'energy_pool',
          id,
          'set_network',
          ['network_id'],
          JSON.stringify({ network_id, pool_name: poolData.name, network_name: networkData.name }),
          '设置能量池网络配置',
          req.user?.id || 'system',
          req.ip || 'unknown'
        ]
      );
      console.log(`📝 [NetworkConfig] 记录配置变更历史成功`);
    } catch (historyError) {
      console.warn(`⚠️ [NetworkConfig] 记录配置变更历史失败:`, historyError);
      // 不因为历史记录失败而中断主要流程
    }
    
    res.status(200).json({
      success: true,
      message: '能量池网络配置设置成功',
      data: {
        pool: {
          id: poolData.id,
          name: poolData.name,
          tron_address: poolData.tron_address,
          status: poolData.status
        },
        network: {
          id: networkData.id,
          name: networkData.name,
          network_type: networkData.network_type,
          rpc_url: networkData.rpc_url,
          is_active: networkData.is_active
        },
        message: '网络配置已更新并保存到数据库'
      }
    });
    
    console.log(`✅ [NetworkConfig] 网络配置设置完成`);
    
  } catch (error) {
    console.error('💥 [NetworkConfig] 设置能量池网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


