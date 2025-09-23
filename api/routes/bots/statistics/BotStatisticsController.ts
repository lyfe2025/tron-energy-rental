/**
 * 机器人统计控制器
 * 获取机器人的用户数和订单数统计
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.ts';
import type { RouteHandler } from '../types.ts';

/**
 * 获取单个机器人的统计信息
 * GET /api/bots/:id/statistics
 * 权限：管理员
 */
export const getBotStatistics: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [BotStats] 获取机器人统计信息，ID: ${id}`);
    
    // 检查机器人是否存在并获取统计数据
    const statsResult = await query('SELECT * FROM bot_statistics WHERE bot_id = $1', [id]);
    if (statsResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    const bot = statsResult.rows[0];
    
    const statistics = {
      total_users: parseInt(bot.total_users) || 0,
      total_orders: parseInt(bot.total_orders) || 0,
      active_users: parseInt(bot.active_users) || 0,
      completed_orders: parseInt(bot.completed_orders) || 0,
      total_revenue: parseFloat(bot.total_revenue) || 0
    };
    
    console.log(`✅ [BotStats] 机器人 ${bot.bot_name} 统计:`, statistics);
    
    res.status(200).json({
      success: true,
      message: '获取机器人统计信息成功',
      data: {
        bot: {
          id: bot.bot_id,
          name: bot.bot_name,
          username: bot.bot_username
        },
        statistics
      }
    });
    
  } catch (error) {
    console.error('❌ [BotStats] 获取机器人统计信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取所有机器人的统计信息
 * GET /api/bots/statistics
 * 权限：管理员
 */
export const getAllBotStatistics: RouteHandler = async (req: Request, res: Response) => {
  try {
    console.log('🔍 [BotStats] 获取所有机器人统计信息...');
    
    // 使用统计函数获取所有机器人数据
    const statsResult = await query('SELECT * FROM get_all_bot_stats()');
    
    const botStatistics = statsResult.rows.map(row => ({
      bot_id: row.bot_id,
      bot_name: row.bot_name,
      total_users: parseInt(row.total_users) || 0,
      total_orders: parseInt(row.total_orders) || 0,
      active_users: parseInt(row.active_users) || 0,
      completed_orders: parseInt(row.completed_orders) || 0,
      total_revenue: parseFloat(row.total_revenue) || 0
    }));
    
    console.log(`✅ [BotStats] 获取到 ${botStatistics.length} 个机器人的统计信息`);
    
    res.status(200).json({
      success: true,
      message: '获取所有机器人统计信息成功',
      data: {
        statistics: botStatistics,
        total_bots: botStatistics.length
      }
    });
    
  } catch (error) {
    console.error('❌ [BotStats] 获取所有机器人统计信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取机器人的详细用户列表
 * GET /api/bots/:id/users
 * 权限：管理员
 */
export const getBotUsers: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, status = '' } = req.query;
    
    console.log(`🔍 [BotStats] 获取机器人用户列表，ID: ${id}, 页码: ${page}, 限制: ${limit}`);
    
    // 检查机器人是否存在
    const botResult = await query('SELECT id, name FROM telegram_bots WHERE id = $1', [id]);
    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 构建查询条件
    let whereClause = 'WHERE bot_id = $1';
    const queryParams = [id];
    let paramIndex = 2;
    
    if (status && status !== '') {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(status as string);
      paramIndex++;
    }
    
    // 获取用户总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);
    
    // 获取分页用户数据
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const usersResult = await query(
      `SELECT 
        id, telegram_id, username, email, status, 
        balance, usdt_balance, trx_balance, 
        total_orders, created_at, updated_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, parseInt(limit as string), offset]
    );
    
    console.log(`✅ [BotStats] 获取到机器人 ${id} 的 ${usersResult.rows.length} 个用户`);
    
    res.status(200).json({
      success: true,
      message: '获取机器人用户列表成功',
      data: {
        users: usersResult.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [BotStats] 获取机器人用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取机器人的详细订单列表
 * GET /api/bots/:id/orders
 * 权限：管理员
 */
export const getBotOrders: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, status = '' } = req.query;
    
    console.log(`🔍 [BotStats] 获取机器人订单列表，ID: ${id}, 页码: ${page}, 限制: ${limit}`);
    
    // 检查机器人是否存在
    const botResult = await query('SELECT id, name FROM telegram_bots WHERE id = $1', [id]);
    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 构建查询条件
    let whereClause = 'WHERE o.bot_id = $1';
    const queryParams = [id];
    let paramIndex = 2;
    
    if (status && status !== '') {
      whereClause += ` AND o.status = $${paramIndex}`;
      queryParams.push(status as string);
      paramIndex++;
    }
    
    // 获取订单总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);
    
    // 获取分页订单数据
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const ordersResult = await query(
      `SELECT 
        o.id, o.order_number, o.energy_amount, 
        o.price_usdt, o.price_trx, o.payment_method,
        o.payment_status, o.status, o.target_address,
        o.created_at, o.completed_at,
        u.username as user_username, u.telegram_id as user_telegram_id
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, parseInt(limit as string), offset]
    );
    
    console.log(`✅ [BotStats] 获取到机器人 ${id} 的 ${ordersResult.rows.length} 个订单`);
    
    res.status(200).json({
      success: true,
      message: '获取机器人订单列表成功',
      data: {
        orders: ordersResult.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [BotStats] 获取机器人订单列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
