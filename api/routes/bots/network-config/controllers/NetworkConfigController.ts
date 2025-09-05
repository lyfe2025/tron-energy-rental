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
    
    // 检查机器人是否存在
    const botCheck = await query(
      'SELECT id FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (botCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 获取机器人关联的网络配置
    const networksResult = await query(
      `SELECT 
        bnc.id, bnc.bot_id, bnc.network_id, bnc.is_active, bnc.is_primary, bnc.priority,
        bnc.config, bnc.api_settings, bnc.contract_addresses, bnc.gas_settings,
        bnc.monitoring_settings, bnc.created_at, bnc.updated_at,
        tn.name as network_name, tn.type as network_type, tn.rpc_url, tn.chain_id,
        tn.explorer_url, tn.health_status as network_health_status, tn.is_active as network_is_active
       FROM bot_network_configs bnc
       JOIN tron_networks tn ON bnc.network_id = tn.id
       WHERE bnc.bot_id = $1
       ORDER BY bnc.priority ASC, bnc.created_at DESC`,
      [id]
    );
    
    res.status(200).json({
      success: true,
      message: '机器人网络配置获取成功',
      data: {
        bot_id: id,
        networks: networksResult.rows
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
      'SELECT id FROM telegram_bots WHERE id = $1',
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
      'SELECT id, name FROM tron_networks WHERE id = $1',
      [network_id]
    );
    
    if (networkCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '网络不存在'
      });
      return;
    }
    
    // 检查是否已存在该网络配置
    const existingConfig = await query(
      'SELECT id FROM bot_network_configs WHERE bot_id = $1 AND network_id = $2',
      [id, network_id]
    );
    
    if (existingConfig.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '该机器人已配置此网络'
      });
      return;
    }
    
    // 如果设置为主要网络，需要将其他网络的主要状态取消
    if (is_primary) {
      await query(
        'UPDATE bot_network_configs SET is_primary = false WHERE bot_id = $1',
        [id]
      );
    }
    
    // 创建网络配置
    const newConfigResult = await query(
      `INSERT INTO bot_network_configs (
        bot_id, network_id, is_active, is_primary, priority,
        config, api_settings, contract_addresses, gas_settings, monitoring_settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, network_id, true, is_primary, priority,
        JSON.stringify(config), JSON.stringify(api_settings),
        JSON.stringify(contract_addresses), JSON.stringify(gas_settings),
        JSON.stringify(monitoring_settings)
      ]
    );
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        new_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'bot_network_config',
        newConfigResult.rows[0].id,
        'create',
        null,
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
        config: newConfigResult.rows[0]
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
    const updateData = req.body;
    
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
    
    // 如果设置为主要网络，需要将其他网络的主要状态取消
    if (updateData.is_primary === true) {
      await query(
        'UPDATE bot_network_configs SET is_primary = false WHERE bot_id = $1 AND network_id != $2',
        [id, networkId]
      );
    }
    
    // 构建更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'is_active', 'is_primary', 'priority', 'config',
      'api_settings', 'contract_addresses', 'gas_settings', 'monitoring_settings'
    ];
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (['config', 'api_settings', 'contract_addresses', 'gas_settings', 'monitoring_settings'].includes(field)) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(JSON.stringify(updateData[field]));
        } else {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(updateData[field]);
        }
        paramIndex++;
      }
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
    updateValues.push(id, networkId);
    
    // 执行更新
    const updateQuery = `
      UPDATE bot_network_configs 
      SET ${updateFields.join(', ')}
      WHERE bot_id = $${paramIndex} AND network_id = $${paramIndex + 1}
      RETURNING *
    `;
    
    const updatedConfig = await query(updateQuery, updateValues);
    
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
        null,
        JSON.stringify(updateData),
        '更新机器人网络配置',
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.status(200).json({
      success: true,
      message: '网络配置更新成功',
      data: {
        config: updatedConfig.rows[0]
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
    
    // 检查配置是否存在
    const configCheck = await query(
      'SELECT id, is_primary FROM bot_network_configs WHERE bot_id = $1 AND network_id = $2',
      [id, networkId]
    );
    
    if (configCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '网络配置不存在'
      });
      return;
    }
    
    const config = configCheck.rows[0];
    
    // 检查是否为主要网络
    if (config.is_primary) {
      // 检查是否还有其他网络配置
      const otherNetworksResult = await query(
        'SELECT COUNT(*) as count FROM bot_network_configs WHERE bot_id = $1 AND network_id != $2',
        [id, networkId]
      );
      
      if (parseInt(otherNetworksResult.rows[0].count) > 0) {
        res.status(400).json({
          success: false,
          message: '不能删除主要网络配置，请先设置其他网络为主要网络'
        });
        return;
      }
    }
    
    // 删除配置
    await query(
      'DELETE FROM bot_network_configs WHERE bot_id = $1 AND network_id = $2',
      [id, networkId]
    );
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        old_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'bot_network_config',
        config.id,
        'delete',
        null,
        JSON.stringify({ network_id: networkId }),
        '删除机器人网络配置',
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.status(200).json({
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
