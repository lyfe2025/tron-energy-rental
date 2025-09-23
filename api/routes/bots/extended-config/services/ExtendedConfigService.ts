/**
 * 扩展配置服务
 * 提供机器人扩展配置的业务逻辑处理
 */
import { query } from '../../../../config/database.ts';
import type { ExtendedBotConfigData } from '../../types.ts';

export class ExtendedConfigService {
  /**
   * 获取机器人扩展配置
   */
  static async getBotExtendedConfig(botId: string) {
    // 检查机器人是否存在并获取配置
    const botResult = await query(
      `SELECT 
        id, bot_name, bot_username,
        network_configurations, webhook_url as webhook_config, custom_commands as message_templates,
        max_connections as rate_limits, bot_token as security_settings, last_health_check,
        health_status, description, keyboard_config as config
       FROM telegram_bots 
       WHERE id = $1`,
      [botId]
    );
    
    if (botResult.rows.length === 0) {
      return null;
    }
    
    // 获取机器人关联的网络配置
    const networkConfigsResult = await query(
      `SELECT 
        (nc->>'id')::UUID as id,
        (nc->>'network_id')::UUID as network_id,
        (nc->>'is_active')::BOOLEAN as is_active,
        (nc->>'is_primary')::BOOLEAN as is_primary,
        (nc->>'priority')::INTEGER as priority,
        nc as config,
        nc->'api_settings' as api_settings,
        nc->'contract_addresses' as contract_addresses,
        nc->'gas_settings' as gas_settings,
        nc->'monitoring_settings' as monitoring_settings,
        tn.name as network_name,
        tn.network_type as network_type,
        tn.rpc_url,
        tn.chain_id,
        tn.health_status as network_health_status
       FROM telegram_bots tb
       CROSS JOIN LATERAL jsonb_array_elements(tb.network_configurations) AS nc
       LEFT JOIN tron_networks tn ON (nc->>'network_id')::UUID = tn.id
       WHERE tb.id = $1
       ORDER BY (nc->>'priority')::INTEGER ASC`,
      [botId]
    );
    
    const bot = botResult.rows[0];
    const networkConfigs = networkConfigsResult.rows;
    
    return {
      bot_id: bot.id,
      bot_name: bot.bot_name,
      bot_username: bot.bot_username,
      network_config: bot.network_configurations || {},
      webhook_config: bot.webhook_config || {},
      message_templates: bot.message_templates || {},
      rate_limits: bot.rate_limits || {},
      security_settings: bot.security_settings || {},
      health_status: bot.health_status,
      last_health_check: bot.last_health_check,
      description: bot.description,
      config: bot.config || {},
      network_configs: networkConfigs
    };
  }

  /**
   * 更新机器人扩展配置
   */
  static async updateBotExtendedConfig(botId: string, configData: ExtendedBotConfigData, userId?: string, ipAddress?: string) {
    // 检查机器人是否存在
    const existingBot = await query(
      'SELECT id FROM telegram_bots WHERE id = $1',
      [botId]
    );
    
    if (existingBot.rows.length === 0) {
      throw new Error('机器人不存在');
    }
    
    // 构建更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (configData.network_config !== undefined) {
      updateFields.push(`network_configurations = $${paramIndex}`);
      updateValues.push(JSON.stringify(configData.network_config));
      paramIndex++;
    }
    
    if (configData.webhook_config !== undefined) {
      updateFields.push(`webhook_url = $${paramIndex}`);
      updateValues.push(configData.webhook_config?.url || null);
      paramIndex++;
    }
    
    if (configData.message_templates !== undefined) {
      updateFields.push(`custom_commands = $${paramIndex}`);
      updateValues.push(JSON.stringify(configData.message_templates));
      paramIndex++;
    }
    
    if (configData.rate_limits !== undefined) {
      updateFields.push(`max_connections = $${paramIndex}`);
      updateValues.push((configData.rate_limits as any)?.max_connections || 40);
      paramIndex++;
    }
    
    if (configData.security_settings !== undefined) {
      updateFields.push(`bot_token = $${paramIndex}`);
      updateValues.push((configData.security_settings as any)?.token || null);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      throw new Error('没有提供要更新的配置字段');
    }
    
    // 添加更新时间
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(botId);
    
    // 执行更新
    const updateQuery = `
      UPDATE telegram_bots 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, network_configurations as network_config, webhook_url as webhook_config, custom_commands as message_templates,
        max_connections as rate_limits, bot_token as security_settings, updated_at
    `;
    
    const updatedBot = await query(updateQuery, updateValues);
    
    // 记录配置变更历史
    await this.recordConfigHistory(botId, configData, userId, ipAddress);
    
    return updatedBot.rows[0];
  }

  /**
   * 记录配置变更历史
   */
  static async recordConfigHistory(botId: string, configData: ExtendedBotConfigData, userId?: string, ipAddress?: string) {
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        new_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'telegram_bot',
        botId,
        'update',
        null,
        JSON.stringify(configData),
        '机器人扩展配置更新',
        userId || null,
        ipAddress
      ]
    );
  }

  /**
   * 获取配置历史记录
   */
  static async getConfigHistory(botId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    
    // 获取配置变更历史
    const historyResult = await query(
      `SELECT 
        id, operation_type, changed_fields, old_values, new_values,
        change_reason, changed_by, ip_address, created_at
       FROM system_config_history
       WHERE entity_type = 'telegram_bot' AND entity_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [botId, limit, offset]
    );
    
    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM system_config_history
       WHERE entity_type = 'telegram_bot' AND entity_id = $1`,
      [botId]
    );
    
    const total = parseInt(countResult.rows[0].total);
    
    return {
      history: historyResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
