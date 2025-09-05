/**
 * 机器人CRUD操作路由
 * 包含：列表查询、详情获取、创建、更新、删除操作
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import { buildUpdateFields, buildWhereClause, isValidBotToken } from './middleware.js';
import type { CreateBotData, PaginationParams, RouteHandler, UpdateBotData } from './types.js';

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
        webhook_url, 0 as total_users, 0 as total_orders, 
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
        webhook_url, 0 as total_users, 0 as total_orders, 
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
      webhook_url,
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
        bot_name, bot_username, bot_token, description, webhook_url, config, 
        welcome_message, help_message, allowed_updates, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, bot_name as name, bot_username as username, description, 
        CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status, 
        webhook_url, config as settings, welcome_message, help_message, 
        allowed_updates as commands, 0 as total_users, 0 as total_orders, created_at`,
      [name, username, token, description, webhook_url, JSON.stringify(settings), 
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
        webhook_url, config as settings, welcome_message, help_message, 
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

// 注册路由
router.get('/selector', authenticateToken, getBotsSelector);  // 新增：选择器端点，只需认证
router.get('/', authenticateToken, requireAdmin, getBotsList);
router.get('/:id', authenticateToken, requireAdmin, getBotDetails);
router.post('/', authenticateToken, requireAdmin, createBot);
router.put('/:id', authenticateToken, requireAdmin, updateBot);
router.delete('/:id', authenticateToken, requireAdmin, deleteBot);

export default router;
