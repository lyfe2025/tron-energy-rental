/**
 * 机器人模式管理处理器
 * 包含：模式切换、Webhook管理、Telegram同步
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';
import { PriceConfigService } from '../../../services/PriceConfigService.js';
import type { BotModeSwitchData, RouteHandler } from '../types.js';

/**
 * 机器人模式切换
 * POST /api/bots/:id/switch-mode
 * 权限：管理员
 */
export const switchBotMode: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { work_mode, webhook_url, webhook_secret, max_connections } = req.body as BotModeSwitchData;
    
    // 验证工作模式
    if (!['polling', 'webhook'].includes(work_mode)) {
      res.status(400).json({
        success: false,
        message: '无效的工作模式'
      });
      return;
    }
    
    // 检查机器人是否存在
    const existingBot = await query(
      'SELECT id, work_mode FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (existingBot.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // Webhook模式验证
    if (work_mode === 'webhook') {
      if (!webhook_url) {
        res.status(400).json({
          success: false,
          message: 'Webhook模式需要提供webhook_url'
        });
        return;
      }
      
      try {
        const parsedUrl = new URL(webhook_url);
        if (parsedUrl.protocol !== 'https:') {
          res.status(400).json({
            success: false,
            message: 'Webhook URL必须使用HTTPS协议'
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Webhook URL格式不正确'
        });
        return;
      }
    }
    
    // 更新数据库
    const updateResult = await query(
      `UPDATE telegram_bots 
       SET work_mode = $1, webhook_url = $2, webhook_secret = $3, 
           max_connections = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING 
         id, bot_name as name, bot_username as username,
         CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
         work_mode, webhook_url, webhook_secret, max_connections`,
      [work_mode, webhook_url || null, webhook_secret || null, 
       max_connections || 40, id]
    );
    
    const updatedBot = updateResult.rows[0];
    
    res.status(200).json({
      success: true,
      message: `机器人已切换到${work_mode === 'webhook' ? 'Webhook' : 'Polling'}模式`,
      data: {
        bot: updatedBot
      }
    });
    
  } catch (error) {
    console.error('切换机器人模式错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取机器人Webhook状态
 * GET /api/bots/:id/webhook-status
 * 权限：管理员
 */
export const getBotWebhookStatus: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查机器人是否存在，同时获取配置的webhook信息
    const botResult = await query(
      'SELECT id, bot_token, work_mode, webhook_url, webhook_secret FROM telegram_bots WHERE id = $1',
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
    
    if (bot.work_mode !== 'webhook') {
      res.status(400).json({
        success: false,
        message: '该机器人不是Webhook模式'
      });
      return;
    }
    
    try {
      // 调用Telegram Bot API获取实际的webhook信息
      const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getWebhookInfo`);
      const data = await response.json();
      
      if (!data.ok) {
        res.status(400).json({
          success: false,
          message: '获取Webhook状态失败'
        });
        return;
      }
      
      // 合并配置的信息和实际状态
      const webhookInfo = {
        ...data.result,
        configured_url: bot.webhook_url || '',
        configured_secret: bot.webhook_secret ? '已配置' : '未配置',
        is_url_synced: data.result.url === (bot.webhook_url || '')
      };
      
      res.status(200).json({
        success: true,
        message: 'Webhook状态获取成功',
        data: {
          webhook_info: webhookInfo
        }
      });
      
    } catch (apiError) {
      console.error('Telegram API调用错误:', apiError);
      res.status(500).json({
        success: false,
        message: 'Telegram API调用失败'
      });
    }
    
  } catch (error) {
    console.error('获取Webhook状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 应用Webhook设置
 * POST /api/bots/:id/apply-webhook
 * 权限：管理员
 */
export const applyWebhookSettings: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取机器人信息
    const botResult = await query(
      'SELECT id, bot_token, work_mode, webhook_url, webhook_secret FROM telegram_bots WHERE id = $1',
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
    
    if (bot.work_mode !== 'webhook') {
      res.status(400).json({
        success: false,
        message: '该机器人不是Webhook模式'
      });
      return;
    }
    
    if (!bot.webhook_url) {
      res.status(400).json({
        success: false,
        message: 'Webhook URL未配置'
      });
      return;
    }
    
    try {
      // 构建setWebhook请求参数
      const webhookParams = new URLSearchParams({
        url: bot.webhook_url
      });
      
      if (bot.webhook_secret) {
        webhookParams.append('secret_token', bot.webhook_secret);
      }
      
      // 调用Telegram Bot API设置webhook
      const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: webhookParams
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        res.status(400).json({
          success: false,
          message: `设置Webhook失败: ${data.description || '未知错误'}`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Webhook设置成功'
      });
      
    } catch (apiError) {
      console.error('Telegram API调用错误:', apiError);
      res.status(500).json({
        success: false,
        message: 'Telegram API调用失败'
      });
    }
    
  } catch (error) {
    console.error('应用Webhook设置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 手动同步机器人设置到Telegram
 * POST /api/bots/:id/manual-sync
 * 权限：管理员
 */
export const manualSyncToTelegram: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { options, formData } = req.body;
    
    // 检查机器人是否存在
    const botResult = await query(
      'SELECT id, bot_token, bot_name, description, short_description FROM telegram_bots WHERE id = $1',
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
    
    if (!bot.bot_token || bot.bot_token === 'temp-token') {
      res.status(400).json({
        success: false,
        message: 'Bot Token无效，无法进行同步'
      });
      return;
    }

    const results: Record<string, boolean | null> = {};
    const errors: string[] = [];
    const logs: string[] = [];
    
    try {
      // 1. 同步机器人名称
      if (options.name && formData.name) {
        try {
          logs.push(`🎯 开始同步机器人名称: ${formData.name}`);
          const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/setMyName`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formData.name })
          });
          const data = await response.json();
          
          if (data.ok) {
            results.name = true;
            logs.push(`✅ 机器人名称同步成功`);
          } else {
            results.name = false;
            errors.push(`机器人名称同步失败: ${data.description || '未知错误'}`);
            logs.push(`❌ 机器人名称同步失败: ${data.description}`);
          }
        } catch (error: any) {
          results.name = false;
          errors.push(`机器人名称同步失败: ${error.message}`);
          logs.push(`❌ 机器人名称同步失败: ${error.message}`);
        }
      } else if (options.name) {
        results.name = null;
        logs.push(`⏭️ 跳过机器人名称同步（未提供名称）`);
      }

      // 2. 同步机器人描述
      if (options.description && formData.description) {
        try {
          logs.push(`🎯 开始同步机器人描述`);
          const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/setMyDescription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: formData.description })
          });
          const data = await response.json();
          
          if (data.ok) {
            results.description = true;
            logs.push(`✅ 机器人描述同步成功`);
          } else {
            results.description = false;
            errors.push(`机器人描述同步失败: ${data.description || '未知错误'}`);
            logs.push(`❌ 机器人描述同步失败: ${data.description}`);
          }
        } catch (error: any) {
          results.description = false;
          errors.push(`机器人描述同步失败: ${error.message}`);
          logs.push(`❌ 机器人描述同步失败: ${error.message}`);
        }
      } else if (options.description) {
        results.description = null;
        logs.push(`⏭️ 跳过机器人描述同步（未提供描述）`);
      }

      // 3. 同步短描述
      if (options.shortDescription && formData.short_description) {
        try {
          logs.push(`🎯 开始同步机器人短描述`);
          const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/setMyShortDescription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ short_description: formData.short_description })
          });
          const data = await response.json();
          
          if (data.ok) {
            results.shortDescription = true;
            logs.push(`✅ 机器人短描述同步成功`);
          } else {
            results.shortDescription = false;
            errors.push(`机器人短描述同步失败: ${data.description || '未知错误'}`);
            logs.push(`❌ 机器人短描述同步失败: ${data.description}`);
          }
        } catch (error: any) {
          results.shortDescription = false;
          errors.push(`机器人短描述同步失败: ${error.message}`);
          logs.push(`❌ 机器人短描述同步失败: ${error.message}`);
        }
      } else if (options.shortDescription) {
        results.shortDescription = null;
        logs.push(`⏭️ 跳过机器人短描述同步（未提供短描述）`);
      }

      // 4. 同步命令列表
      if (options.commands) {
        try {
          logs.push(`🎯 开始同步命令列表`);
          
          // 构建命令列表
          const commands: Array<{command: string, description: string}> = [];
          
          // 添加菜单命令
          if (formData.menu_commands && Array.isArray(formData.menu_commands)) {
            formData.menu_commands.forEach((cmd: any) => {
              if (cmd.command && cmd.description) {
                commands.push({
                  command: cmd.command,
                  description: cmd.description
                });
              }
            });
          }
          
          // 添加自定义命令（如果启用）
          if (formData.custom_commands && Array.isArray(formData.custom_commands)) {
            formData.custom_commands.forEach((cmd: any) => {
              if (cmd.command && cmd.is_enabled && !commands.find(c => c.command === cmd.command)) {
                commands.push({
                  command: cmd.command,
                  description: cmd.response_message || `自定义命令: ${cmd.command}`
                });
              }
            });
          }
          
          const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/setMyCommands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commands })
          });
          const data = await response.json();
          
          if (data.ok) {
            results.commands = true;
            logs.push(`✅ 命令列表同步成功 (${commands.length}个命令)`);
          } else {
            results.commands = false;
            errors.push(`命令列表同步失败: ${data.description || '未知错误'}`);
            logs.push(`❌ 命令列表同步失败: ${data.description}`);
          }
        } catch (error: any) {
          results.commands = false;
          errors.push(`命令列表同步失败: ${error.message}`);
          logs.push(`❌ 命令列表同步失败: ${error.message}`);
        }
      }

      // 5. 同步工作模式（Webhook设置）
      if (options.workMode) {
        try {
          logs.push(`🎯 开始同步工作模式: ${formData.work_mode}`);
          
          if (formData.work_mode === 'webhook' && formData.webhook_url) {
            // 设置Webhook
            const webhookParams = { url: formData.webhook_url };
            if (formData.webhook_secret) {
              (webhookParams as any).secret_token = formData.webhook_secret;
            }
            
            const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/setWebhook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookParams)
            });
            const data = await response.json();
            
            if (data.ok) {
              results.workMode = true;
              logs.push(`✅ Webhook模式设置成功`);
            } else {
              results.workMode = false;
              errors.push(`Webhook模式设置失败: ${data.description || '未知错误'}`);
              logs.push(`❌ Webhook模式设置失败: ${data.description}`);
            }
          } else if (formData.work_mode === 'polling') {
            // 删除Webhook
            const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/deleteWebhook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            
            if (data.ok) {
              results.workMode = true;
              logs.push(`✅ Polling模式设置成功`);
            } else {
              results.workMode = false;
              errors.push(`Polling模式设置失败: ${data.description || '未知错误'}`);
              logs.push(`❌ Polling模式设置失败: ${data.description}`);
            }
          } else {
            results.workMode = null;
            logs.push(`⏭️ 跳过工作模式同步（配置不完整）`);
          }
        } catch (error: any) {
          results.workMode = false;
          errors.push(`工作模式同步失败: ${error.message}`);
          logs.push(`❌ 工作模式同步失败: ${error.message}`);
        }
      }

      // 6. 同步菜单按钮
      if (options.menuButton && formData.menu_button_enabled) {
        try {
          logs.push(`🎯 开始同步菜单按钮`);
          
          const menuButton: any = { type: 'default' };
          if (formData.menu_type === 'web_app' && formData.web_app_url) {
            menuButton.type = 'web_app';
            menuButton.text = formData.menu_button_text || '菜单';
            menuButton.web_app = { url: formData.web_app_url };
          }
          
          const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/setChatMenuButton`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menu_button: menuButton })
          });
          const data = await response.json();
          
          if (data.ok) {
            results.menuButton = true;
            logs.push(`✅ 菜单按钮同步成功`);
          } else {
            results.menuButton = false;
            errors.push(`菜单按钮同步失败: ${data.description || '未知错误'}`);
            logs.push(`❌ 菜单按钮同步失败: ${data.description}`);
          }
        } catch (error: any) {
          results.menuButton = false;
          errors.push(`菜单按钮同步失败: ${error.message}`);
          logs.push(`❌ 菜单按钮同步失败: ${error.message}`);
        }
      } else if (options.menuButton) {
        results.menuButton = null;
        logs.push(`⏭️ 跳过菜单按钮同步（未启用或配置不完整）`);
      }

      // 7. 价格配置验证（不实际同步，只验证）
      if (options.priceConfig) {
        try {
          logs.push(`🎯 开始验证价格配置`);
          
          // 获取价格配置状态
          const priceConfigService = new PriceConfigService();
          const configs = await priceConfigService.getActiveConfigs();
          const configMap: { [key: string]: boolean } = {};
          configs.forEach((config: any) => {
            configMap[config.mode_type] = config.is_active;
          });
            
          // 验证键盘配置中的价格配置依赖
          let validationPassed = true;
          const keyboardConfig = formData.keyboard_config;
          
          if (keyboardConfig && keyboardConfig.main_menu) {
            for (const row of keyboardConfig.main_menu.rows) {
              if (row.is_enabled) {
                for (const button of row.buttons) {
                  if (button.is_enabled && button.price_config_dependency) {
                    if (!configMap[button.price_config_dependency]) {
                      validationPassed = false;
                      errors.push(`按钮 "${button.text}" 依赖的价格配置 "${button.price_config_dependency}" 未激活`);
                      logs.push(`❌ 价格配置验证失败: ${button.text} -> ${button.price_config_dependency}`);
                    }
                  }
                }
              }
            }
          }
          
          if (validationPassed) {
            results.priceConfig = true;
            logs.push(`✅ 价格配置验证通过`);
          } else {
            results.priceConfig = false;
            logs.push(`❌ 价格配置验证失败`);
          }
        } catch (error: any) {
          results.priceConfig = false;
          errors.push(`价格配置验证失败: ${error.message}`);
          logs.push(`❌ 价格配置验证失败: ${error.message}`);
        }
      }

      // 计算成功率
      const totalSelected = Object.keys(results).length;
      const successCount = Object.values(results).filter(r => r === true).length;
      const failedCount = Object.values(results).filter(r => r === false).length;
      
      const success = failedCount === 0 && successCount > 0;
      const hasPartialSuccess = successCount > 0 && failedCount > 0;
      
      logs.push(`📊 同步完成: 成功 ${successCount}/${totalSelected} 项`);

      res.status(200).json({
        success: true,
        message: '手动同步完成',
        data: {
          success,
          hasPartialSuccess,
          results,
          errors,
          logs,
          summary: `成功同步 ${successCount}/${totalSelected} 项设置`
        }
      });

    } catch (error: any) {
      console.error('手动同步失败:', error);
      res.status(500).json({
        success: false,
        message: '同步过程中发生错误',
        data: {
          success: false,
          hasPartialSuccess: false,
          results: {},
          errors: [error.message || '未知错误'],
          logs: [...logs, `❌ 同步失败: ${error.message}`],
          summary: '同步失败'
        }
      });
    }
    
  } catch (error) {
    console.error('手动同步错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
