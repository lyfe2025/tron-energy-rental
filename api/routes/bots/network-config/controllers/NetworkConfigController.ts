/**
 * 机器人网络配置基础CRUD控制器
 * 包含：获取、添加、更新、删除网络配置
 */
import { type Request, type Response } from 'express';
import { query } from '../../../../config/database.js';
import type { RouteHandler } from '../../types.js';

/**
 * 获取机器人的网络配置列表
 * GET /api/bots/:id/networks
 * 权限：管理员
 */
export const getBotNetworks: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查机器人是否存在并获取网络配置
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
    
    // 如果有网络配置，获取网络详细信息
    let networks = [];
    if (networkConfigs.length > 0) {
      const networkIds = networkConfigs.map((config: any) => config.network_id);
      const networksResult = await query(
        `SELECT id, name, type, rpc_url, chain_id, explorer_url, health_status, is_active
         FROM tron_networks 
         WHERE id = ANY($1::uuid[])`,
        [networkIds]
      );
      
      // 合并网络配置和网络信息
      networks = networkConfigs.map((config: any) => {
        const networkInfo = networksResult.rows.find((n: any) => n.id === config.network_id);
        return {
          ...config,
          network_name: networkInfo?.name || 'Unknown',
          network_type: networkInfo?.type || 'unknown',
          rpc_url: networkInfo?.rpc_url || '',
          chain_id: networkInfo?.chain_id || '',
          explorer_url: networkInfo?.explorer_url || '',
          network_health_status: networkInfo?.health_status || 'unknown',
          network_is_active: networkInfo?.is_active || false
        };
      }).sort((a: any, b: any) => a.priority - b.priority);
    }
    
    res.status(200).json({
      success: true,
      message: '机器人网络配置获取成功',
      data: {
        bot_id: id,
        networks: networks
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
 * 为机器人添加网络配置
 * POST /api/bots/:id/networks
 * 权限：管理员
 */
export const addBotNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      network_id,
      is_primary = false,
      priority = 1,
      config = {},
      api_settings = {},
      contract_addresses = {},
      gas_settings = {},
      monitoring_settings = {}
    } = req.body;
    
    // 验证必填字段
    if (!network_id) {
      res.status(400).json({
        success: false,
        message: '网络ID为必填项'
      });
      return;
    }
    
    // 检查机器人是否存在
    const botCheck = await query(
      'SELECT id, network_configurations FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (botCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 检查网络是否存在
    const networkCheck = await query(
      'SELECT id, name, type, rpc_url FROM tron_networks WHERE id = $1',
      [network_id]
    );
    
    if (networkCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '网络不存在'
      });
      return;
    }
    
    const networkInfo = networkCheck.rows[0];
    const currentConfigs = botCheck.rows[0].network_configurations || [];
    
    // 检查是否已存在该网络配置
    const existingConfig = currentConfigs.find((config: any) => config.network_id === network_id);
    if (existingConfig) {
      res.status(400).json({
        success: false,
        message: '该机器人已配置此网络'
      });
      return;
    }
    
    // 使用数据库函数添加网络配置
    const result = await query(
      `SELECT add_bot_network_config($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as success`,
      [
        id, network_id, true, is_primary, priority,
        JSON.stringify(config), JSON.stringify(api_settings),
        JSON.stringify(contract_addresses), JSON.stringify(gas_settings),
        JSON.stringify(monitoring_settings)
      ]
    );
    
    if (!result.rows[0].success) {
      res.status(500).json({
        success: false,
        message: '添加网络配置失败'
      });
      return;
    }
    
    // 获取更新后的配置
    const updatedBot = await query(
      'SELECT network_configurations FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    const newConfig = updatedBot.rows[0].network_configurations.find(
      (config: any) => config.network_id === network_id
    );
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        new_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'bot_network_config',
        id,
        'create',
        'network_configurations',
        JSON.stringify(req.body),
        '添加机器人网络配置',
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.status(201).json({
      success: true,
      message: '网络配置添加成功',
      data: {
        config: {
          ...newConfig,
          network_name: networkInfo.name,
          network_type: networkInfo.type,
          rpc_url: networkInfo.rpc_url
        }
      }
    });
    
  } catch (error) {
    console.error('添加机器人网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新机器人网络配置
 * PUT /api/bots/:id/networks/:networkId
 * 权限：管理员
 */
export const updateBotNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id, networkId } = req.params;
    const {
      is_active,
      is_primary,
      priority,
      config,
      api_settings,
      contract_addresses,
      gas_settings,
      monitoring_settings
    } = req.body;
    
    // 检查机器人是否存在并获取当前配置
    const botCheck = await query(
      'SELECT id, network_configurations FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (botCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    const currentConfigs = botCheck.rows[0].network_configurations || [];
    const configIndex = currentConfigs.findIndex((config: any) => config.network_id === parseInt(networkId));
    
    if (configIndex === -1) {
      res.status(404).json({
        success: false,
        message: '网络配置不存在'
      });
      return;
    }
    
    const currentConfig = currentConfigs[configIndex];
    
    // 构建更新的配置对象
    const updatedConfig = {
      ...currentConfig,
      ...(is_active !== undefined && { is_active }),
      ...(is_primary !== undefined && { is_primary }),
      ...(priority !== undefined && { priority }),
      ...(config !== undefined && { config }),
      ...(api_settings !== undefined && { api_settings }),
      ...(contract_addresses !== undefined && { contract_addresses }),
      ...(gas_settings !== undefined && { gas_settings }),
      ...(monitoring_settings !== undefined && { monitoring_settings }),
      updated_at: new Date().toISOString()
    };
    
    // 使用数据库函数更新网络配置
    const result = await query(
      `SELECT update_bot_network_config($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as success`,
      [
        id, networkId,
        updatedConfig.is_active,
        updatedConfig.is_primary,
        updatedConfig.priority,
        JSON.stringify(updatedConfig.config),
        JSON.stringify(updatedConfig.api_settings),
        JSON.stringify(updatedConfig.contract_addresses),
        JSON.stringify(updatedConfig.gas_settings),
        JSON.stringify(updatedConfig.monitoring_settings)
      ]
    );
    
    if (!result.rows[0].success) {
      res.status(500).json({
        success: false,
        message: '更新网络配置失败'
      });
      return;
    }
    
    // 获取更新后的配置
    const updatedBot = await query(
      'SELECT network_configurations FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    const newConfig = updatedBot.rows[0].network_configurations.find(
      (config: any) => config.network_id === parseInt(networkId)
    );
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        old_value, new_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'bot_network_config',
        id,
        'update',
        Object.keys(req.body).join(','),
        JSON.stringify(currentConfig),
        JSON.stringify(req.body),
        '更新机器人网络配置',
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.json({
      success: true,
      message: '网络配置更新成功',
      data: {
        config: newConfig
      }
    });
    
  } catch (error) {
    console.error('更新机器人网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 删除机器人网络配置
 * DELETE /api/bots/:id/networks/:networkId
 * 权限：管理员
 */
export const deleteBotNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id, networkId } = req.params;
    
    // 检查机器人是否存在并获取当前配置
    const botCheck = await query(
      'SELECT id, network_configurations FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (botCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    const currentConfigs = botCheck.rows[0].network_configurations || [];
    const configIndex = currentConfigs.findIndex((config: any) => config.network_id === parseInt(networkId));
    
    if (configIndex === -1) {
      res.status(404).json({
        success: false,
        message: '网络配置不存在'
      });
      return;
    }
    
    const config = currentConfigs[configIndex];
    
    // 检查是否为主要网络
    if (config.is_primary && currentConfigs.length > 1) {
      res.status(400).json({
        success: false,
        message: '不能删除主要网络配置，请先设置其他网络为主要网络'
      });
      return;
    }
    
    // 使用数据库函数删除网络配置
    const result = await query(
      `SELECT remove_bot_network_config($1, $2) as success`,
      [id, networkId]
    );
    
    if (!result.rows[0].success) {
      res.status(500).json({
        success: false,
        message: '删除网络配置失败'
      });
      return;
    }
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        old_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'bot_network_config',
        id,
        'delete',
        'network_configurations',
        JSON.stringify(config),
        '删除机器人网络配置',
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.json({
      success: true,
      message: '网络配置删除成功'
    });
    
  } catch (error) {
    console.error('删除机器人网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
