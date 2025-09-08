/**
 * 机器人CRUD操作路由
 * 包含：列表查询、详情获取、创建、更新、删除操作
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import { buildUpdateFields, buildWhereClause, isValidBotToken } from './middleware.js';
import type { BotModeSwitchData, CreateBotData, PaginationParams, RouteHandler, UpdateBotData } from './types.js';

const router: Router = Router();

/**
 * 获取机器人列表
 * GET /api/bots
 * 权限：管理员
 */
const getBotsList: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search 
    } = req.query as PaginationParams;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const { whereClause, queryParams, paramIndex } = buildWhereClause({ status, search });
    
    // 查询机器人列表
    const botsQuery = `
      SELECT 
        id, bot_name as name, bot_username as username, 
        CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
        COALESCE(work_mode, 'polling') as work_mode,
        webhook_url, webhook_secret, max_connections, 
        0 as total_users, 0 as total_orders, 
        created_at, updated_at
      FROM telegram_bots 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), String(offset));
    
    const botsResult = await query(botsQuery, queryParams);
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM telegram_bots ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '机器人列表获取成功',
      data: {
        bots: botsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取机器人列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取单个机器人详情
 * GET /api/bots/:id
 * 权限：管理员
 */
const getBotDetails: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const botResult = await query(
      `SELECT 
        id, bot_name as name, bot_username as username, 
        CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
        COALESCE(work_mode, 'polling') as work_mode,
        webhook_url, webhook_secret, max_connections, 
        0 as total_users, 0 as total_orders, 
        created_at, updated_at
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
    
    // 获取机器人用户统计 - 从users表统计有telegram_id的用户
    const userStatsResult = await query(
      `SELECT 
        COUNT(*) as total_bot_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_users,
        COUNT(CASE WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_users_week
       FROM users 
       WHERE telegram_id IS NOT NULL`,
      []
    );
    
    // 获取机器人订单统计
    const orderStatsResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as orders_week,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price END), 0) as total_revenue
       FROM orders 
       WHERE bot_id = $1`,
      [id]
    );
    
    const bot = botResult.rows[0];
    const userStats = userStatsResult.rows[0];
    const orderStats = orderStatsResult.rows[0];
    
    res.status(200).json({
      success: true,
      message: '机器人信息获取成功',
      data: {
        bot,
        stats: {
          users: userStats,
          orders: orderStats
        }
      }
    });
    
  } catch (error) {
    console.error('获取机器人详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 创建新机器人
 * POST /api/bots
 * 权限：管理员
 */
const createBot: RouteHandler = async (req: Request, res: Response) => {
  try {
    const {
      name,
      username,
      token,
      description,
      work_mode = 'polling',
      webhook_url,
      webhook_secret,
      max_connections = 40,
      settings = {},
      welcome_message = '欢迎使用TRON能量租赁服务！',
      help_message = '如需帮助，请联系客服。',
      commands = []
    } = req.body as CreateBotData;
    
    // 验证必填字段
    if (!name || !username || !token) {
      res.status(400).json({
        success: false,
        message: '机器人名称、用户名和Token为必填项'
      });
      return;
    }
    
    // 验证Token格式（基本验证）
    if (!isValidBotToken(token)) {
      res.status(400).json({
        success: false,
        message: 'Token格式不正确'
      });
      return;
    }

    // 如果选择webhook模式，验证webhook_url
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
    
    // 检查用户名是否已存在
    const existingBot = await query(
      'SELECT id FROM telegram_bots WHERE bot_username = $1',
      [username]
    );
    
    if (existingBot.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '该用户名已被使用'
      });
      return;
    }
    
    // 检查Token是否已存在
    const existingToken = await query(
      'SELECT id FROM telegram_bots WHERE bot_token = $1',
      [token]
    );
    
    if (existingToken.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '该Token已被使用'
      });
      return;
    }
    
    // 创建机器人
    const newBot = await query(
      `INSERT INTO telegram_bots (
        bot_name, bot_username, bot_token, description, work_mode, 
        webhook_url, webhook_secret, max_connections, config, 
        welcome_message, help_message, allowed_updates, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id, bot_name as name, bot_username as username, description, 
        CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
        COALESCE(work_mode, 'polling') as work_mode,
        webhook_url, webhook_secret, max_connections,
        config as settings, welcome_message, help_message, 
        allowed_updates as commands, 0 as total_users, 0 as total_orders, created_at`,
      [name, username, token, description, work_mode, 
       webhook_url, webhook_secret, max_connections, JSON.stringify(settings), 
       welcome_message, help_message, JSON.stringify(commands), true]
    );
    
    res.status(201).json({
      success: true,
      message: '机器人创建成功',
      data: {
        bot: newBot.rows[0]
      }
    });
    
  } catch (error) {
    console.error('创建机器人错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新机器人信息
 * PUT /api/bots/:id
 * 权限：管理员
 */
const updateBot: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateBotData;
    
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
    
    // 检查用户名是否被其他机器人使用
    if (updateData.username) {
      const usernameCheck = await query(
        'SELECT id FROM telegram_bots WHERE bot_username = $1 AND id != $2',
        [updateData.username, id]
      );
      
      if (usernameCheck.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该用户名已被其他机器人使用'
        });
        return;
      }
    }
    
    // 检查Token是否被其他机器人使用
    if (updateData.token) {
      if (!isValidBotToken(updateData.token)) {
        res.status(400).json({
          success: false,
          message: 'Token格式不正确'
        });
        return;
      }
      
      const tokenCheck = await query(
        'SELECT id FROM telegram_bots WHERE bot_token = $1 AND id != $2',
        [updateData.token, id]
      );
      
      if (tokenCheck.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该Token已被其他机器人使用'
        });
        return;
      }
    }
    
    // 构建更新字段
    const { updateFields, updateValues, paramIndex } = buildUpdateFields(updateData);
    
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
      UPDATE telegram_bots 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, bot_name as name, bot_username as username, description, 
        CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
        COALESCE(work_mode, 'polling') as work_mode,
        webhook_url, webhook_secret, max_connections,
        config as settings, welcome_message, help_message, 
        allowed_updates as commands, 0 as total_users, 0 as total_orders, updated_at
    `;
    
    const updatedBot = await query(updateQuery, updateValues);
    
    res.status(200).json({
      success: true,
      message: '机器人信息更新成功',
      data: {
        bot: updatedBot.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新机器人信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 删除机器人
 * DELETE /api/bots/:id
 * 权限：管理员
 */
const deleteBot: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
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
    
    // 检查机器人是否有关联的订单
    const orderCheck = await query(
      'SELECT COUNT(*) as count FROM orders WHERE bot_id = $1',
      [id]
    );
    
    if (parseInt(orderCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该机器人有关联的订单，不能删除。请先处理相关订单或将机器人状态设为停用。'
      });
      return;
    }
    
    // 注意：bot_users表已删除，不再需要检查关联用户
    
    // 删除机器人
    await query('DELETE FROM telegram_bots WHERE id = $1', [id]);
    
    res.status(200).json({
      success: true,
      message: '机器人删除成功'
    });
    
  } catch (error) {
    console.error('删除机器人错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取机器人选择器列表（简化版，用于下拉选择）
 * GET /api/bots/selector
 * 权限：已认证用户即可
 */
const getBotsSelector: RouteHandler = async (req: Request, res: Response) => {
  try {
    console.log('🔍 [BotCRUD] 获取机器人选择器列表...');
    
    // 查询所有机器人的基本信息（用于选择器）
    const botsQuery = `
      SELECT 
        id, 
        bot_name as name, 
        bot_username as username, 
        is_active,
        CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status
      FROM telegram_bots 
      ORDER BY bot_name ASC
    `;
    
    const botsResult = await query(botsQuery);
    
    console.log(`✅ [BotCRUD] 获取到 ${botsResult.rows.length} 个机器人供选择`);
    
    res.status(200).json({
      success: true,
      message: '获取机器人选择器列表成功',
      data: {
        bots: botsResult.rows
      }
    });
    
  } catch (error) {
    console.error('❌ [BotCRUD] 获取机器人选择器列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 验证Bot Token并获取机器人信息
 * POST /api/bots/verify-token
 * 权限：管理员
 */
const verifyBotToken: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Bot Token不能为空'
      });
      return;
    }
    
    // 验证Token格式
    if (!isValidBotToken(token)) {
      res.status(400).json({
        success: false,
        message: 'Bot Token格式不正确'
      });
      return;
    }
    
    // 检查Token是否已被使用
    const tokenCheck = await query(
      'SELECT id, bot_name FROM telegram_bots WHERE bot_token = $1',
      [token]
    );
    
    if (tokenCheck.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: `该Token已被机器人 "${tokenCheck.rows[0].bot_name}" 使用`
      });
      return;
    }
    
    // 使用Telegram Bot API验证Token并获取机器人信息
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      
      if (!data.ok) {
        res.status(400).json({
          success: false,
          message: 'Token无效或已过期'
        });
        return;
      }
      
      const botInfo = data.result;
      
      res.status(200).json({
        success: true,
        message: 'Token验证成功',
        data: {
          id: botInfo.id,
          name: botInfo.first_name,
          username: botInfo.username,
          is_bot: botInfo.is_bot,
          can_join_groups: botInfo.can_join_groups,
          can_read_all_group_messages: botInfo.can_read_all_group_messages,
          supports_inline_queries: botInfo.supports_inline_queries
        }
      });
      
    } catch (apiError) {
      console.error('Telegram API调用错误:', apiError);
      res.status(400).json({
        success: false,
        message: 'Token验证失败，请检查Token是否正确'
      });
    }
    
  } catch (error) {
    console.error('验证Bot Token错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 机器人模式切换
 * POST /api/bots/:id/switch-mode
 * 权限：管理员
 */
const switchBotMode: RouteHandler = async (req: Request, res: Response) => {
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
const getBotWebhookStatus: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查机器人是否存在
    const botResult = await query(
      'SELECT id, bot_token, work_mode FROM telegram_bots WHERE id = $1',
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
      // 调用Telegram Bot API获取webhook信息
      const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getWebhookInfo`);
      const data = await response.json();
      
      if (!data.ok) {
        res.status(400).json({
          success: false,
          message: '获取Webhook状态失败'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Webhook状态获取成功',
        data: {
          webhook_info: data.result
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


// 注册路由
router.post('/verify-token', verifyBotToken);  // 新增：Token验证端点（无需认证，用于创建机器人时验证）
router.get('/selector', authenticateToken, getBotsSelector);  // 新增：选择器端点，只需认证
router.post('/:id/switch-mode', authenticateToken, requireAdmin, switchBotMode);  // 新增：模式切换端点
router.get('/:id/webhook-status', authenticateToken, requireAdmin, getBotWebhookStatus);  // 新增：Webhook状态端点
router.get('/', authenticateToken, requireAdmin, getBotsList);
router.get('/:id', authenticateToken, requireAdmin, getBotDetails);
router.post('/', authenticateToken, requireAdmin, createBot);
router.put('/:id', authenticateToken, requireAdmin, updateBot);
router.delete('/:id', authenticateToken, requireAdmin, deleteBot);

export default router;
