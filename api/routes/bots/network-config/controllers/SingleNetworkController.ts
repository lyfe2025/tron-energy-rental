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
    
    // 检查机器人是否存在并获取网络配置
    const botResult = await query('SELECT id, network_configurations FROM telegram_bots WHERE id = $1', [id]);
    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    const bot = botResult.rows[0];
    const networkConfigs = bot.network_configurations || [];
    
    // 查找当前活跃的主要网络配置
    const activeConfig = networkConfigs.find(config => config.is_active && config.is_primary);
    
    if (!activeConfig) {
      res.status(200).json({
        success: true,
        message: '机器人尚未配置网络',
        data: {
          network: null
        }
      });
      return;
    }
    
    // 获取网络详细信息
    const networkResult = await query(`
      SELECT id, name, network_type, rpc_url, is_active
      FROM tron_networks 
      WHERE id = $1
    `, [activeConfig.network_id]);
    
    if (networkResult.rows.length === 0) {
      res.status(200).json({
        success: true,
        message: '机器人网络配置已损坏',
        data: {
          network: null
        }
      });
      return;
    }
    
    const networkInfo = networkResult.rows[0];
    const networkConfig = {
      network_id: activeConfig.network_id,
      network_name: networkInfo.name,
      network_type: networkInfo.network_type,
      rpc_url: networkInfo.rpc_url,
      network_is_active: networkInfo.is_active,
      is_active: activeConfig.is_active,
      is_primary: activeConfig.is_primary,
      priority: activeConfig.priority,
      config: activeConfig.config,
      api_settings: activeConfig.api_settings,
      contract_addresses: activeConfig.contract_addresses,
      gas_settings: activeConfig.gas_settings,
      monitoring_settings: activeConfig.monitoring_settings,
      created_at: activeConfig.created_at,
      updated_at: activeConfig.updated_at
    };
    
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
    const { 
      network_id, 
      is_primary = true, 
      is_active = true,
      config = {},
      api_settings = {},
      contract_addresses = {},
      gas_settings = {},
      monitoring_settings = {}
    } = req.body;
    
    console.log('setBotNetwork 请求参数:', {
      botId: id,
      networkId: network_id,
      isPrimary: is_primary,
      isActive: is_active,
      body: req.body
    });

    // 验证必需字段
    if (!network_id) {
      console.log('验证失败: 网络ID为空');
      return res.status(400).json({
        success: false,
        message: '网络ID不能为空'
      });
    }
    
    // 检查机器人是否存在
    const botCheck = await query('SELECT id FROM telegram_bots WHERE id = $1', [id]);
    if (botCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 检查网络是否存在且活跃
    const networkCheck = await query(
      'SELECT id, name, network_type, rpc_url FROM tron_networks WHERE id = $1 AND is_active = true',
      [network_id]
    );
    
    if (networkCheck.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: '指定的网络不存在或未激活'
      });
      return;
    }
    
    const networkInfo = networkCheck.rows[0];
    
    // 构建新的网络配置对象
    const newNetworkConfig = {
      network_id: network_id,
      network_name: networkInfo.name,
      network_type: networkInfo.network_type,
      rpc_url: networkInfo.rpc_url,
      is_active,
      is_primary,
      priority: 100,
      config,
      api_settings,
      contract_addresses,
      gas_settings,
      monitoring_settings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 直接更新机器人的网络配置，避免函数重载问题
    const updateResult = await query(
      `UPDATE telegram_bots 
       SET network_configurations = JSONB_BUILD_ARRAY($2::jsonb),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1::uuid`,
      [id, JSON.stringify(newNetworkConfig)]
    );
    
    if (updateResult.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在或更新失败'
      });
      return;
    }
    
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
        'single_network_config',
        JSON.stringify(newNetworkConfig),
        '设置机器人单网络配置',
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.status(200).json({
      success: true,
      message: '机器人网络配置设置成功',
      data: {
        network: newNetworkConfig
      }
    });
    
  } catch (error) {
    console.error('设置机器人网络配置错误:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      botId: req.params.id,
      networkId: req.body.network_id
    });
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
