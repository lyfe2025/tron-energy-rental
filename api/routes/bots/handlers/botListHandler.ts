/**
 * 机器人列表相关处理器
 * 包含：列表查询、详情获取、选择器列表
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.ts';
import { buildWhereClause } from '../middleware.ts';
import type { PaginationParams, RouteHandler } from '../types.ts';

/**
 * 获取机器人列表
 * GET /api/bots
 * 权限：管理员
 */
export const getBotsList: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search 
    } = req.query as PaginationParams;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件，添加已删除机器人过滤
    const { whereClause, queryParams, paramIndex } = buildWhereClause({ status, search }, ['tb.deleted_at IS NULL']);
    
    // 查询机器人列表，包含网络配置信息和健康状态
    const botsQuery = `
      SELECT 
        tb.id, tb.bot_name as name, tb.bot_username as username, tb.bot_token as token,
        tb.description, tb.short_description, tb.welcome_message, tb.help_message,
        tb.menu_button_enabled, tb.menu_button_text, tb.menu_type, tb.web_app_url,
        tb.menu_commands, tb.custom_commands,
        tb.is_active,
        CASE WHEN tb.is_active THEN 'active' ELSE 'inactive' END as status,
        tb.work_mode, tb.webhook_url, tb.webhook_secret, tb.max_connections, 
        tb.keyboard_config, tb.created_at, tb.updated_at, tb.network_id,
        tb.health_status, tb.last_health_check,
        (SELECT COUNT(*) FROM users WHERE bot_id = tb.id) as total_users,
        (SELECT COUNT(*) FROM orders WHERE bot_id = tb.id) as total_orders,
        tn.id as network_id_ref, tn.name as network_name, tn.network_type, 
        tn.is_active as network_active, tn.health_status as network_health_status,
        tn.rpc_url as network_endpoint
      FROM telegram_bots tb
      LEFT JOIN tron_networks tn ON tb.network_id = tn.id
      ${whereClause}
      ORDER BY tb.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), String(offset));
    
    const botsResult = await query(botsQuery, queryParams);
    
    // 处理查询结果，组织网络配置信息
    const processedBots = botsResult.rows.map((bot: any) => ({
      id: bot.id,
      name: bot.name,
      username: bot.username,
      token: bot.token,
      description: bot.description,
      short_description: bot.short_description,
      welcome_message: bot.welcome_message,
      help_message: bot.help_message,
      menu_button_enabled: bot.menu_button_enabled,
      menu_button_text: bot.menu_button_text,
      menu_type: bot.menu_type,
      web_app_url: bot.web_app_url,
      menu_commands: bot.menu_commands,
      custom_commands: bot.custom_commands,
      is_active: bot.is_active,
      status: bot.status,
      work_mode: bot.work_mode,
      webhook_url: bot.webhook_url,
      webhook_secret: bot.webhook_secret,
      max_connections: bot.max_connections,
      keyboard_config: bot.keyboard_config,
      created_at: bot.created_at,
      updated_at: bot.updated_at,
      network_id: bot.network_id,
      health_status: bot.health_status,
      last_health_check: bot.last_health_check,
      total_users: parseInt(bot.total_users) || 0,
      total_orders: parseInt(bot.total_orders) || 0,
      current_network: bot.network_id ? {
        id: bot.network_id_ref,
        name: bot.network_name,
        type: bot.network_type,
        status: bot.network_active ? 'active' : 'inactive',
        health_status: bot.network_health_status,
        endpoint: bot.network_endpoint
      } : null
    }));
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM telegram_bots tb ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '机器人列表获取成功',
      data: {
        bots: processedBots,
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
export const getBotDetails: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const botResult = await query(
      `SELECT 
        tb.id, tb.bot_name as name, tb.bot_username as username, tb.bot_token as token,
        tb.is_active,
        CASE WHEN tb.is_active THEN 'active' ELSE 'inactive' END as status,
        COALESCE(tb.work_mode, 'polling') as work_mode,
        tb.webhook_url, tb.webhook_secret, tb.max_connections, tb.keyboard_config,
        tb.description, tb.short_description, tb.welcome_message, tb.help_message,
        tb.menu_button_enabled, tb.menu_button_text, tb.menu_type, tb.web_app_url,
        tb.menu_commands, tb.custom_commands,
        tb.created_at, tb.updated_at, tb.health_status, tb.last_health_check,
        COALESCE(user_stats.total_users, 0) as total_users,
        COALESCE(order_stats.total_orders, 0) as total_orders,
        tn.id as network_id, tn.name as network_name, tn.network_type,
        CASE WHEN tn.is_active THEN 'active' ELSE 'inactive' END as network_status, tn.rpc_url as network_endpoint
       FROM telegram_bots tb
       LEFT JOIN (
         SELECT bot_id, COUNT(*) as total_users 
         FROM users 
         WHERE bot_id IS NOT NULL 
         GROUP BY bot_id
       ) user_stats ON tb.id = user_stats.bot_id
       LEFT JOIN (
         SELECT bot_id, COUNT(*) as total_orders 
         FROM orders 
         WHERE bot_id IS NOT NULL 
         GROUP BY bot_id
       ) order_stats ON tb.id = order_stats.bot_id
       LEFT JOIN tron_networks tn ON tb.network_id = tn.id
       WHERE tb.id = $1 AND tb.deleted_at IS NULL`,
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
    
    const rawBot = botResult.rows[0];
    const userStats = userStatsResult.rows[0];
    const orderStats = orderStatsResult.rows[0];
    
    // 处理机器人数据，组织网络配置信息
    const bot = {
      id: rawBot.id,
      name: rawBot.name,
      username: rawBot.username,
      token: rawBot.token,
      description: rawBot.description,
      short_description: rawBot.short_description,
      welcome_message: rawBot.welcome_message,
      help_message: rawBot.help_message,
      menu_button_enabled: rawBot.menu_button_enabled,
      menu_button_text: rawBot.menu_button_text,
      menu_type: rawBot.menu_type,
      web_app_url: rawBot.web_app_url,
      menu_commands: rawBot.menu_commands,
      custom_commands: rawBot.custom_commands,
      is_active: rawBot.is_active,
      status: rawBot.status,
      work_mode: rawBot.work_mode,
      webhook_url: rawBot.webhook_url,
      webhook_secret: rawBot.webhook_secret,
      max_connections: rawBot.max_connections,
      keyboard_config: rawBot.keyboard_config,
      total_users: rawBot.total_users,
      total_orders: rawBot.total_orders,
      created_at: rawBot.created_at,
      updated_at: rawBot.updated_at,
      health_status: rawBot.health_status,
      last_health_check: rawBot.last_health_check,
      current_network: rawBot.network_id ? {
        id: rawBot.network_id,
        name: rawBot.network_name,
        type: rawBot.network_type,
        status: rawBot.network_status,
        endpoint: rawBot.network_endpoint
      } : null
    };
    
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
 * 获取机器人选择器列表（简化版，用于下拉选择）
 * GET /api/bots/selector
 * 权限：已认证用户即可
 */
export const getBotsSelector: RouteHandler = async (req: Request, res: Response) => {
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
      WHERE deleted_at IS NULL
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
