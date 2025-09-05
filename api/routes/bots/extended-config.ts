/**
 * 机器人扩展配置管理路由
 * 包含：网络配置、webhook配置、消息模板、限流设置、安全设置等
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import type { BotHealthCheck, ExtendedBotConfigData, RouteHandler } from './types.js';

const router: Router = Router();

/**
 * 获取机器人扩展配置
 * GET /api/bots/:id/extended-config
 * 权限：管理员
 */
const getBotExtendedConfig: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查机器人是否存在并获取配置
    const botResult = await query(
      `SELECT 
        id, bot_name, bot_username,
        network_config, webhook_config, message_templates,
        rate_limits, security_settings, last_health_check,
        health_status, description, config
       FROM telegram_bots 
       WHERE id = $1`,
      [id]
    );
    
    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
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
      [id]
    );
    
    const bot = botResult.rows[0];
    const networkConfigs = networkConfigsResult.rows;
    
    res.status(200).json({
      success: true,
      message: '机器人扩展配置获取成功',
      data: {
        bot_id: bot.id,
        bot_name: bot.bot_name,
        bot_username: bot.bot_username,
        network_config: bot.network_config || {},
        webhook_config: bot.webhook_config || {},
        message_templates: bot.message_templates || {},
        rate_limits: bot.rate_limits || {},
        security_settings: bot.security_settings || {},
        health_status: bot.health_status,
        last_health_check: bot.last_health_check,
        description: bot.description,
        config: bot.config || {},
        network_configs: networkConfigs
      }
    });
    
  } catch (error) {
    console.error('获取机器人扩展配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新机器人扩展配置
 * PUT /api/bots/:id/extended-config
 * 权限：管理员
 */
const updateBotExtendedConfig: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const configData = req.body as ExtendedBotConfigData;
    
    // 检查机器人是否存在
    const existingBot = await query(
      'SELECT id FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (existingBot.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 构建更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (configData.network_config !== undefined) {
      updateFields.push(`network_config = $${paramIndex}`);
      updateValues.push(JSON.stringify(configData.network_config));
      paramIndex++;
    }
    
    if (configData.webhook_config !== undefined) {
      updateFields.push(`webhook_config = $${paramIndex}`);
      updateValues.push(JSON.stringify(configData.webhook_config));
      paramIndex++;
    }
    
    if (configData.message_templates !== undefined) {
      updateFields.push(`message_templates = $${paramIndex}`);
      updateValues.push(JSON.stringify(configData.message_templates));
      paramIndex++;
    }
    
    if (configData.rate_limits !== undefined) {
      updateFields.push(`rate_limits = $${paramIndex}`);
      updateValues.push(JSON.stringify(configData.rate_limits));
      paramIndex++;
    }
    
    if (configData.security_settings !== undefined) {
      updateFields.push(`security_settings = $${paramIndex}`);
      updateValues.push(JSON.stringify(configData.security_settings));
      paramIndex++;
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
    updateValues.push(id);
    
    // 执行更新
    const updateQuery = `
      UPDATE telegram_bots 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, network_config, webhook_config, message_templates,
        rate_limits, security_settings, updated_at
    `;
    
    const updatedBot = await query(updateQuery, updateValues);
    
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
        null,
        JSON.stringify(configData),
        '机器人扩展配置更新',
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.status(200).json({
      success: true,
      message: '机器人扩展配置更新成功',
      data: {
        bot: updatedBot.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新机器人扩展配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 机器人健康检查
 * POST /api/bots/:id/health-check
 * 权限：管理员
 */
const performHealthCheck: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查机器人是否存在
    const botResult = await query(
      `SELECT id, bot_token, webhook_url, network_config FROM telegram_bots WHERE id = $1`,
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
    const startTime = Date.now();
    let healthStatus = 'healthy';
    let errorMessage = '';
    const networkStatus: Record<string, 'connected' | 'disconnected' | 'error'> = {};
    
    try {
      // 检查机器人Token有效性（模拟检查）
      // 在实际实现中，这里应该调用Telegram Bot API
      
      // 检查关联的网络连接状态
      const networkConfigsResult = await query(
        `SELECT tn.id, tn.name, tn.rpc_url, tn.health_check_url
         FROM telegram_bots tb
         CROSS JOIN LATERAL jsonb_array_elements(tb.network_configurations) AS nc
         JOIN tron_networks tn ON (nc->>'network_id')::UUID = tn.id
         WHERE tb.id = $1 AND (nc->>'is_active')::BOOLEAN = true`,
        [id]
      );
      
      for (const network of networkConfigsResult.rows) {
        try {
          // 模拟网络连接检查
          // 在实际实现中，这里应该检查TRON网络连接
          networkStatus[network.id] = 'connected';
        } catch (networkError) {
          networkStatus[network.id] = 'error';
          healthStatus = 'unhealthy';
        }
      }
      
    } catch (error) {
      healthStatus = 'unhealthy';
      errorMessage = error instanceof Error ? error.message : '未知错误';
    }
    
    const responseTime = Date.now() - startTime;
    
    // 更新机器人健康状态
    await query(
      `UPDATE telegram_bots 
       SET health_status = $1, last_health_check = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [healthStatus, id]
    );
    
    const healthCheckResult: BotHealthCheck = {
      bot_id: id,
      status: healthStatus as 'healthy' | 'unhealthy' | 'maintenance',
      last_check: new Date().toISOString(),
      response_time_ms: responseTime,
      error_message: errorMessage || undefined,
      network_status: networkStatus
    };
    
    res.status(200).json({
      success: true,
      message: '健康检查完成',
      data: healthCheckResult
    });
    
  } catch (error) {
    console.error('机器人健康检查错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取机器人配置历史
 * GET /api/bots/:id/config-history
 * 权限：管理员
 */
const getBotConfigHistory: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 获取配置变更历史
    const historyResult = await query(
      `SELECT 
        id, operation_type, changed_fields, old_values, new_values,
        change_reason, changed_by, ip_address, created_at
       FROM system_config_history
       WHERE entity_type = 'telegram_bot' AND entity_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, Number(limit), offset]
    );
    
    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM system_config_history
       WHERE entity_type = 'telegram_bot' AND entity_id = $1`,
      [id]
    );
    
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '配置历史获取成功',
      data: {
        history: historyResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取配置历史错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 注册路由
router.get('/:id/extended-config', authenticateToken, requireAdmin, getBotExtendedConfig);
router.put('/:id/extended-config', authenticateToken, requireAdmin, updateBotExtendedConfig);
router.post('/:id/health-check', authenticateToken, requireAdmin, performHealthCheck);
router.get('/:id/config-history', authenticateToken, requireAdmin, getBotConfigHistory);

export default router;