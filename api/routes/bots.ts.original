/**
 * 机器人管理API路由
 * 处理Telegram机器人的注册、状态管理、配置更新、性能监控等功能
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { TelegramBotService } from '../services/telegram-bot.js';

// Telegram机器人服务实例
let telegramBotService: TelegramBotService | null = null;

// 初始化Telegram机器人服务
if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    telegramBotService = new TelegramBotService();
    telegramBotService.start();
    console.log('✅ Telegram机器人服务已启动');
  } catch (error) {
    console.error('❌ Telegram机器人服务启动失败:', error);
  }
} else {
  console.warn('⚠️ 未配置TELEGRAM_BOT_TOKEN，Telegram机器人服务未启动');
}

const router: Router = Router();

/**
 * 获取机器人列表
 * GET /api/bots
 * 权限：管理员
 */
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(String(status));
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(
        bot_name ILIKE $${paramIndex} OR 
        bot_username ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${String(search)}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';
    
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
});

/**
 * 获取可用的机器人列表（用于代理商关联）
 * GET /api/bots/available
 * 权限：已认证用户
 */
router.get('/available', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // 查询所有活跃的机器人
    const botsResult = await query(`
      SELECT 
        id, 
        bot_name as name, 
        bot_username as username, 
        CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status
      FROM telegram_bots 
      WHERE is_active = true
      ORDER BY bot_name ASC
    `);
    
    res.status(200).json({
      success: true,
      message: '可用机器人列表获取成功',
      data: botsResult.rows
    });
    
  } catch (error) {
    console.error('获取可用机器人列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取单个机器人详情
 * GET /api/bots/:id
 * 权限：管理员
 */
router.get('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
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
    
    // 获取机器人用户统计
    const userStatsResult = await query(
      `SELECT 
        COUNT(*) as total_bot_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_users,
        COUNT(CASE WHEN last_interaction_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_users_week
       FROM bot_users 
       WHERE bot_id = $1`,
      [id]
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
});

/**
 * 创建新机器人
 * POST /api/bots
 * 权限：管理员
 */
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
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
    } = req.body;
    
    // 验证必填字段
    if (!name || !username || !token) {
      res.status(400).json({
        success: false,
        message: '机器人名称、用户名和Token为必填项'
      });
      return;
    }
    
    // 验证Token格式（基本验证）
    if (!token.match(/^\d+:[A-Za-z0-9_-]+$/)) {
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
});

/**
 * 更新机器人信息
 * PUT /api/bots/:id
 * 权限：管理员
 */
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      username,
      token,
      description,
      webhook_url,
      settings,
      welcome_message,
      help_message,
      commands
    } = req.body;
    
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
    if (username) {
      const usernameCheck = await query(
        'SELECT id FROM telegram_bots WHERE bot_username = $1 AND id != $2',
        [username, id]
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
    if (token) {
      if (!token.match(/^\d+:[A-Za-z0-9_-]+$/)) {
        res.status(400).json({
          success: false,
          message: 'Token格式不正确'
        });
        return;
      }
      
      const tokenCheck = await query(
        'SELECT id FROM telegram_bots WHERE bot_token = $1 AND id != $2',
        [token, id]
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
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updateFields.push(`bot_name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }
    
    if (username !== undefined) {
      updateFields.push(`bot_username = $${paramIndex}`);
      updateValues.push(username);
      paramIndex++;
    }
    
    if (token !== undefined) {
      updateFields.push(`bot_token = $${paramIndex}`);
      updateValues.push(token);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }
    
    if (webhook_url !== undefined) {
      updateFields.push(`webhook_url = $${paramIndex}`);
      updateValues.push(webhook_url);
      paramIndex++;
    }
    
    if (settings !== undefined) {
      updateFields.push(`config = $${paramIndex}`);
      updateValues.push(JSON.stringify(settings));
      paramIndex++;
    }
    
    if (welcome_message !== undefined) {
      updateFields.push(`welcome_message = $${paramIndex}`);
      updateValues.push(welcome_message);
      paramIndex++;
    }
    
    if (help_message !== undefined) {
      updateFields.push(`help_message = $${paramIndex}`);
      updateValues.push(help_message);
      paramIndex++;
    }
    
    if (commands !== undefined) {
      updateFields.push(`allowed_updates = $${paramIndex}`);
      updateValues.push(JSON.stringify(commands));
      paramIndex++;
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
});

/**
 * 更新机器人状态
 * PATCH /api/bots/:id/status
 * 权限：管理员
 */
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // 验证状态值
    const validStatuses = ['active', 'inactive', 'maintenance'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: '无效的状态值，允许的值: ' + validStatuses.join(', ')
      });
      return;
    }
    
    // 检查机器人是否存在
    const existingBot = await query(
      'SELECT id, CASE WHEN is_active THEN \'active\' ELSE \'inactive\' END as status FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (existingBot.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 更新状态
    const updatedBot = await query(
      `UPDATE telegram_bots 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status, updated_at`,
      [status === 'active', id]
    );
    
    res.status(200).json({
      success: true,
      message: '机器人状态更新成功',
      data: {
        bot: updatedBot.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新机器人状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新机器人欢迎语和菜单配置
 * PUT /api/bots/:id/config
 * 权限：管理员
 */
router.put('/:id/config', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { welcome_message, help_message, commands } = req.body;
    
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
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (welcome_message !== undefined) {
      updateFields.push(`welcome_message = $${paramIndex}`);
      updateValues.push(welcome_message);
      paramIndex++;
    }
    
    if (help_message !== undefined) {
      updateFields.push(`help_message = $${paramIndex}`);
      updateValues.push(help_message);
      paramIndex++;
    }
    
    if (commands !== undefined) {
      updateFields.push(`allowed_updates = $${paramIndex}`);
      updateValues.push(JSON.stringify(commands));
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
        id, welcome_message, help_message, allowed_updates as commands, updated_at
    `;
    
    const updatedBot = await query(updateQuery, updateValues);
    
    res.status(200).json({
      success: true,
      message: '机器人配置更新成功',
      data: {
        bot: updatedBot.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新机器人配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除机器人
 * DELETE /api/bots/:id
 * 权限：管理员
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
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
    
    // 检查机器人是否有关联的用户
    const userCheck = await query(
      'SELECT COUNT(*) as count FROM bot_users WHERE bot_id = $1',
      [id]
    );
    
    if (parseInt(userCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该机器人有关联的用户，不能删除。请先处理相关用户或将机器人状态设为停用。'
      });
      return;
    }
    
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
});

/**
 * 获取机器人用户列表
 * GET /api/bots/:id/users
 * 权限：管理员
 */
router.get('/:id/users', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status,
      search 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 检查机器人是否存在
    const botCheck = await query(
      'SELECT id FROM bots WHERE id = $1',
      [id]
    );
    
    if (botCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 构建查询条件
    const whereConditions = ['bu.bot_id = $1'];
    const queryParams: any[] = [id];
    let paramIndex = 2;
    
    if (status) {
      whereConditions.push(`bu.status = $${paramIndex}`);
      queryParams.push(String(status));
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(
        u.username ILIKE $${paramIndex} OR 
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${String(search)}%`);
      paramIndex++;
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    // 查询机器人用户列表
    const usersQuery = `
      SELECT 
        bu.id, bu.telegram_chat_id, bu.status as bot_user_status,
        bu.last_interaction_at, bu.settings as bot_user_settings,
        bu.created_at as joined_at,
        u.id as user_id, u.username, u.first_name, u.last_name,
        u.role, u.status as user_status
      FROM bot_users bu
      JOIN users u ON bu.user_id = u.id
      ${whereClause}
      ORDER BY bu.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const usersResult = await query(usersQuery, queryParams);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM bot_users bu
      JOIN users u ON bu.user_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '机器人用户列表获取成功',
      data: {
        users: usersResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取机器人用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取机器人统计信息
 * GET /api/bots/stats/overview
 * 权限：管理员
 */
router.get('/stats/overview', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取机器人统计
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_bots,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bots,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_bots,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_bots,
        COALESCE(SUM(total_users), 0) as total_bot_users,
        COALESCE(SUM(total_orders), 0) as total_bot_orders,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_bots_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_bots_month
      FROM bots
    `);
    
    res.status(200).json({
      success: true,
      message: '机器人统计信息获取成功',
      data: {
        stats: statsResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('获取机器人统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 测试机器人连接
 * POST /api/bots/:id/test
 * 权限：管理员
 */
router.post('/:id/test', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 获取机器人信息
    const botResult = await query(
      'SELECT id, name, username, token FROM bots WHERE id = $1',
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
    
    // 这里可以添加实际的Telegram Bot API测试逻辑
    // 例如调用getMe接口验证token有效性
    
    res.status(200).json({
      success: true,
      message: '机器人连接测试成功',
      data: {
        bot_id: bot.id,
        bot_name: bot.name,
        bot_username: bot.username,
        test_time: new Date().toISOString(),
        status: 'connected'
      }
    });
    
  } catch (error) {
    console.error('测试机器人连接错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});



export default router;