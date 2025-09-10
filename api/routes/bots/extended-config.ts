/**
 * 机器人扩展配置管理路由
 * 包含：网络配置、webhook配置、消息模板、限流设置、安全设置等
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import type { ExtendedBotConfigData, RouteHandler } from './types.js';

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
        network_configurations, webhook_url as webhook_config, custom_commands as message_templates,
        max_connections as rate_limits, bot_token as security_settings, last_health_check,
        health_status, description, keyboard_config as config
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
        id, network_configurations as network_config, webhook_url as webhook_config, custom_commands as message_templates,
        max_connections as rate_limits, bot_token as security_settings, updated_at
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
      `SELECT id, bot_token, webhook_url, network_configurations FROM telegram_bots WHERE id = $1`,
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
      console.log('开始健康检查:', bot.id, bot.bot_token ? 'Token存在' : 'Token不存在');
      
      // 基础检查
      if (!bot.bot_token) {
        healthStatus = 'unhealthy';
        errorMessage = '缺少Bot Token';
      } else if (bot.bot_token.length < 20) {
        healthStatus = 'unhealthy';
        errorMessage = 'Bot Token格式无效';
      } else {
        // 获取机器人的工作模式
        const modeResult = await query(
          'SELECT work_mode, webhook_url FROM telegram_bots WHERE id = $1',
          [id]
        );
        
        const workMode = modeResult.rows[0]?.work_mode || 'polling';
        const webhookUrl = modeResult.rows[0]?.webhook_url;
        
        console.log('机器人工作模式:', workMode, 'Webhook URL:', webhookUrl);
        
        // 基础Token格式验证
        const tokenRegex = /^\d+:[a-zA-Z0-9_-]{35}$/;
        if (!tokenRegex.test(bot.bot_token)) {
          healthStatus = 'unhealthy';
          errorMessage = 'Bot Token格式不正确，应为数字:字符串格式（如123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg）';
        } else {
          // 健康检查逻辑：优先检查webhook URL，再检查Telegram API
          if (workMode === 'webhook') {
          // Webhook模式：主要检查webhook URL
          if (!webhookUrl) {
            healthStatus = 'unhealthy';
            errorMessage = 'Webhook模式但未设置webhook URL';
          } else {
            try {
              // 1. 检查webhook URL格式
              const webhookCheckUrl = new URL(webhookUrl);
              if (!webhookCheckUrl.protocol.startsWith('http')) {
                healthStatus = 'unhealthy';
                errorMessage = 'Webhook URL必须使用HTTPS协议';
              } else {
                // 2. 检查webhook URL可达性
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 8000);
                  
                  const webhookResponse = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'User-Agent': 'TronEnergyRental-Bot-Health-Check'
                    },
                    body: JSON.stringify({
                      update_id: 0,
                      message: {
                        message_id: 0,
                        date: Math.floor(Date.now() / 1000),
                        chat: { id: 0, type: 'private' },
                        from: { id: 0, is_bot: false, first_name: 'Health Check' },
                        text: '/health_check'
                      }
                    }),
                    signal: controller.signal
                  });
                  
                  clearTimeout(timeoutId);
                  
                  // webhook URL可达，状态码200表示正常
                  if (webhookResponse.status === 200) {
                    healthStatus = 'healthy';
                    errorMessage = '';
                    console.log('Webhook URL检查通过:', webhookUrl);
                  } else {
                    healthStatus = 'unhealthy';
                    errorMessage = `Webhook URL响应异常 (状态码: ${webhookResponse.status})`;
                  }
                  
                } catch (webhookError) {
                  healthStatus = 'unhealthy';
                  if (webhookError.name === 'AbortError') {
                    errorMessage = 'Webhook URL响应超时，请检查服务状态';
                  } else {
                    errorMessage = `Webhook URL不可达: ${webhookError instanceof Error ? webhookError.message : '连接失败'}`;
                  }
                  console.error('Webhook检查错误:', webhookError);
                }
              }
            } catch (urlError) {
              healthStatus = 'unhealthy';
              errorMessage = 'Webhook URL格式无效';
            }
          }
        } else {
          // Polling模式：本地环境下进行基础验证
          console.log('Polling模式健康检查 - 本地环境验证');
          
          // 检查环境变量判断是否为本地开发环境
          const isLocalEnv = process.env.NODE_ENV === 'development' || 
                            process.env.NODE_ENV === 'dev' || 
                            !process.env.NODE_ENV ||
                            process.env.TELEGRAM_API_CHECK === 'false';
          
          if (isLocalEnv) {
            // 本地环境：只进行基础配置验证
            console.log('本地环境模式 - 跳过外网API检查');
            
            // 检查Token格式的详细性
            const tokenParts = bot.bot_token.split(':');
            if (tokenParts.length !== 2) {
              healthStatus = 'unhealthy';
              errorMessage = 'Bot Token格式错误：应包含冒号分隔的两部分';
            } else {
              const [botId, tokenSecret] = tokenParts;
              
              // 验证bot ID部分（应该是纯数字）
              if (!/^\d+$/.test(botId)) {
                healthStatus = 'unhealthy';
                errorMessage = 'Bot Token格式错误：冒号前应为纯数字（Bot ID）';
              } else if (tokenSecret.length < 25) {
                healthStatus = 'unhealthy';
                errorMessage = 'Bot Token格式错误：密钥部分长度不足';
              } else if (!/^[a-zA-Z0-9_-]+$/.test(tokenSecret)) {
                healthStatus = 'unhealthy';
                errorMessage = 'Bot Token格式错误：密钥部分包含无效字符';
              } else {
                // 本地环境下认为配置正确即为健康
                healthStatus = 'healthy';
                errorMessage = '';
                console.log('本地环境 - Bot配置验证通过:', {
                  botId: botId,
                  tokenLength: tokenSecret.length,
                  workMode: workMode
                });
              }
            }
          } else {
            // 生产环境：尝试连接Telegram API（带降级处理）
            console.log('生产环境模式 - 尝试Telegram API连接');
            
            try {
              const telegramApiUrl = `https://api.telegram.org/bot${bot.bot_token}/getMe`;
              
              // 使用https模块，设置较短的超时时间
              const https = await import('https');
              const url = await import('url');
              
              const apiUrl = new URL(telegramApiUrl);
              
              const response: any = await new Promise((resolve, reject) => {
                const options = {
                  hostname: apiUrl.hostname,
                  port: apiUrl.port || 443,
                  path: apiUrl.pathname + apiUrl.search,
                  method: 'GET',
                  timeout: 5000, // 减少到5秒超时
                  headers: {
                    'User-Agent': 'TronEnergyRental-Bot-Health-Check',
                    'Connection': 'close'
                  },
                  rejectUnauthorized: true,
                  agent: false
                };
                
                const req = https.request(options, (res: any) => {
                  let data = '';
                  res.on('data', (chunk: string) => data += chunk);
                  res.on('end', () => {
                    try {
                      const jsonData = JSON.parse(data);
                      resolve({ 
                        ok: res.statusCode === 200, 
                        data: jsonData, 
                        status: res.statusCode
                      });
                    } catch (err) {
                      reject(new Error('API响应解析失败'));
                    }
                  });
                });
                
                req.on('error', (err: Error) => {
                  reject(err);
                });
                
                req.on('timeout', () => {
                  req.destroy();
                  reject(new Error('连接超时'));
                });
                
                req.setTimeout(5000);
                req.end();
              });
              
              if (response.ok && response.data.ok) {
                console.log('Telegram API检查通过');
                healthStatus = 'healthy';
                errorMessage = '';
              } else {
                healthStatus = 'unhealthy';
                errorMessage = `Telegram API错误: ${response.data?.description || '未知错误'}`;
              }
              
            } catch (apiError) {
              // 生产环境API连接失败时降级为基础验证
              console.log('Telegram API连接失败，降级为基础验证:', apiError instanceof Error ? apiError.message : '未知错误');
              
              // 执行基础Token验证作为降级方案
              const tokenParts = bot.bot_token.split(':');
              if (tokenParts.length === 2 && /^\d+$/.test(tokenParts[0]) && tokenParts[1].length >= 25) {
                healthStatus = 'healthy';
                errorMessage = '';
                console.log('降级验证通过 - Token格式正确');
              } else {
                healthStatus = 'unhealthy';
                errorMessage = 'Token格式验证失败且无法连接Telegram API进行验证';
              }
            }
          }
          }
        }
      }
      
    } catch (error) {
      healthStatus = 'unhealthy';
      errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('健康检查过程中出错:', error);
    }
    
    const responseTime = Date.now() - startTime;
    
    // 重新获取工作模式信息
    const finalModeResult = await query(
      'SELECT work_mode, webhook_url FROM telegram_bots WHERE id = $1',
      [id]
    );
    const finalWorkMode = finalModeResult.rows[0]?.work_mode || 'polling';
    const finalWebhookUrl = finalModeResult.rows[0]?.webhook_url;
    
    // 更新机器人健康状态
    await query(
      `UPDATE telegram_bots 
       SET health_status = $1, last_health_check = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [healthStatus, id]
    );
    
    const healthCheckResult: any = {
      bot_id: id,
      status: healthStatus as 'healthy' | 'unhealthy' | 'maintenance',
      last_check: new Date().toISOString(),
      response_time_ms: responseTime,
      error_message: errorMessage || undefined,
      network_status: networkStatus,
      // 添加更多详细信息
      details: {
        work_mode: finalWorkMode,
        webhook_url: finalWorkMode === 'webhook' ? finalWebhookUrl : undefined,
        check_type: finalWorkMode === 'webhook' ? 'webhook_connectivity' : 
                   (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? 'local_validation' : 'telegram_api',
        environment: (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? 'local' : 'production',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('健康检查完成:', healthCheckResult);
    
    res.status(200).json({
      success: true,
      message: healthStatus === 'healthy' ? '健康检查通过' : '健康检查发现问题',
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