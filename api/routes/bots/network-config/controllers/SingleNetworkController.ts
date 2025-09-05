/**
 * 单网络配置控制器
 * 包含：单网络模式的获取和设置功能
 */
import { type Request, type Response } from 'express';
import { query } from '../../../../config/database.js';
import type { RouteHandler } from '../../types.js';

/**
 * 获取机器人当前网络配置（单网络模式）
 * GET /api/bots/:id/network
 * 权限：管理员
 */
export const getBotCurrentNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查机器人是否存在
    const botCheck = await query('SELECT id FROM bots WHERE id = $1', [id]);
    if (botCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 获取当前活跃的网络配置
    const networkResult = await query(`
      SELECT 
        bnc.network_id,
        bnc.is_active,
        bnc.is_primary,
        bnc.priority,
        bnc.config,
        bnc.api_settings,
        bnc.contract_addresses,
        bnc.gas_settings,
        bnc.monitoring_settings,
        bnc.created_at,
        bnc.updated_at,
        tn.name as network_name,
        tn.type as network_type,
        tn.rpc_url,
        tn.is_active as network_is_active
      FROM bot_network_configs bnc
      JOIN tron_networks tn ON bnc.network_id = tn.id
      WHERE bnc.bot_id = $1 AND bnc.is_active = true
      ORDER BY bnc.is_primary DESC, bnc.priority ASC
      LIMIT 1
    `, [id]);
    
    if (networkResult.rows.length === 0) {
      res.status(200).json({
        success: true,
        message: '机器人尚未配置网络',
        data: {
          network: null
        }
      });
      return;
    }
    
    const networkConfig = networkResult.rows[0];
    
    res.status(200).json({
      success: true,
      message: '获取机器人网络配置成功',
      data: {
        network: {
          network_id: networkConfig.network_id,
          network_name: networkConfig.network_name,
          network_type: networkConfig.network_type,
          rpc_url: networkConfig.rpc_url,
          network_is_active: networkConfig.network_is_active,
          is_active: networkConfig.is_active,
          is_primary: networkConfig.is_primary,
          priority: networkConfig.priority,
          config: networkConfig.config,
          api_settings: networkConfig.api_settings,
          contract_addresses: networkConfig.contract_addresses,
          gas_settings: networkConfig.gas_settings,
          monitoring_settings: networkConfig.monitoring_settings,
          created_at: networkConfig.created_at,
          updated_at: networkConfig.updated_at
        }
      }
    });
    
  } catch (error) {
    console.error('获取机器人网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 设置机器人网络配置（单网络模式）
 * PUT /api/bots/:id/network
 * 权限：管理员
 */
export const setBotNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { network_id, config, api_settings, contract_addresses, gas_settings, monitoring_settings } = req.body;
    
    // 验证必需字段
    if (!network_id) {
      res.status(400).json({
        success: false,
        message: '网络ID是必需的'
      });
      return;
    }
    
    // 检查机器人是否存在
    const botCheck = await query('SELECT id FROM bots WHERE id = $1', [id]);
    if (botCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
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
    
    // 使用数据库函数设置单网络配置
    const result = await query(
      'SELECT set_bot_network_config($1, $2, $3, $4, $5, $6, $7) as config_id',
      [
        id,
        network_id,
        config ? JSON.stringify(config) : null,
        api_settings ? JSON.stringify(api_settings) : null,
        contract_addresses ? JSON.stringify(contract_addresses) : null,
        gas_settings ? JSON.stringify(gas_settings) : null,
        monitoring_settings ? JSON.stringify(monitoring_settings) : null
      ]
    );
    
    const configId = result.rows[0].config_id;
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        new_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'bot_network_config',
        configId,
        'update',
        'single_network_config',
        JSON.stringify({ network_id, config, api_settings, contract_addresses, gas_settings, monitoring_settings }),
        '设置机器人单网络配置',
        req.user?.id || null,
        req.ip
      ]
    );
    
    // 获取设置后的网络配置
    const newConfigResult = await query(`
      SELECT 
        bnc.network_id,
        bnc.is_active,
        bnc.is_primary,
        bnc.priority,
        bnc.config,
        bnc.api_settings,
        bnc.contract_addresses,
        bnc.gas_settings,
        bnc.monitoring_settings,
        bnc.created_at,
        bnc.updated_at,
        tn.name as network_name,
        tn.type as network_type
      FROM bot_network_configs bnc
      JOIN tron_networks tn ON bnc.network_id = tn.id
      WHERE bnc.bot_id = $1 AND bnc.is_active = true
    `, [id]);
    
    res.status(200).json({
      success: true,
      message: '机器人网络配置设置成功',
      data: {
        network: newConfigResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('设置机器人网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
