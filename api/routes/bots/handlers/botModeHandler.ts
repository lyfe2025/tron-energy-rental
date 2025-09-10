/**
 * 机器人模式管理处理器
 * 包含：模式切换、Webhook管理、Telegram同步
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';
import { TelegramBotService } from '../../../services/telegram-bot.js';
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
 * 从Telegram同步机器人信息到数据库
 * POST /api/bots/:id/sync-from-telegram
 * 权限：管理员
 */
export const syncBotFromTelegram: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查机器人是否存在
    const botResult = await query(
      'SELECT id, bot_token, bot_name, description FROM telegram_bots WHERE id = $1',
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
    
    try {
      // 创建TelegramBotService实例进行同步
      const botService = new TelegramBotService(bot.bot_token);
      const syncResult = await botService.syncFromTelegram();
      
      if (!syncResult.success) {
        res.status(400).json({
          success: false,
          message: `同步失败: ${syncResult.error}`
        });
        return;
      }
      
      // 更新数据库中的机器人信息
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (syncResult.data.name && syncResult.data.name !== bot.bot_name) {
        updateFields.push(`bot_name = $${paramIndex++}`);
        updateValues.push(syncResult.data.name);
      }
      
      if (syncResult.data.description && syncResult.data.description !== bot.description) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(syncResult.data.description);
      }
      
      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);
        
        const updateQuery = `
          UPDATE telegram_bots 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;
        
        const updateResult = await query(updateQuery, updateValues);
        const updatedBot = updateResult.rows[0];
        
        res.status(200).json({
          success: true,
          message: '机器人信息同步成功',
          data: {
            bot: updatedBot,
            sync_info: syncResult.data,
            changes: {
              name_updated: syncResult.data.name !== bot.bot_name,
              description_updated: syncResult.data.description !== bot.description
            }
          }
        });
      } else {
        res.status(200).json({
          success: true,
          message: '机器人信息已是最新，无需同步',
          data: {
            bot,
            sync_info: syncResult.data,
            changes: {
              name_updated: false,
              description_updated: false
            }
          }
        });
      }
      
    } catch (apiError) {
      console.error('Telegram API调用错误:', apiError);
      res.status(500).json({
        success: false,
        message: 'Telegram API调用失败'
      });
    }
    
  } catch (error) {
    console.error('同步机器人信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
