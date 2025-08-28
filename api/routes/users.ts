/**
 * 用户管理API路由
 * 处理Telegram用户的增删改查、状态管理等功能
 * 基于新的telegram_users表结构
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth.js';

const router: Router = Router();

/**
 * 获取用户列表
 * GET /api/users
 * 权限：管理员
 */
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status, 
      search,
      login_type 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    if (type) {
      whereConditions.push(`user_type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (login_type) {
      whereConditions.push(`login_type = $${paramIndex}`);
      queryParams.push(login_type);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(
        username ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR 
        first_name ILIKE $${paramIndex} OR 
        last_name ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';
    
    // 查询用户列表
    const usersQuery = `
      SELECT 
        telegram_id, username, first_name, last_name, 
        user_type as role, status, tron_address, balance, usdt_balance, trx_balance, 
        total_orders, total_energy_used, referral_code, referred_by, 
        last_login_at, created_at, updated_at
      FROM telegram_users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const usersResult = await query(usersQuery, queryParams);
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM telegram_users ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '用户列表获取成功',
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
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取单个用户详情
 * GET /api/users/:telegram_id
 * 权限：管理员或用户本人
 */
router.get('/:telegram_id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegram_id } = req.params;
    const currentUser = req.user;
    
    // 检查权限：仅管理员可以查看用户信息
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: '权限不足，仅管理员可以查看用户信息'
      });
      return;
    }
    
    const userResult = await query(
      `SELECT 
        telegram_id, username, first_name, last_name, 
        user_type as role, status, tron_address, balance, usdt_balance, trx_balance, 
        total_orders, total_energy_used, referral_code, referred_by, 
        last_login_at, created_at, updated_at
       FROM telegram_users 
       WHERE telegram_id = $1`,
      [telegram_id]
    );
    
    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: '用户信息获取成功',
      data: {
        user: userResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 创建新用户
 * POST /api/users
 * 权限：管理员
 */
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      telegram_id,
      username,
      first_name,
      last_name,
      type = 'normal',
      status = 'active',
      tron_address,
      referral_code
    } = req.body;
    
    // 验证必填字段
    if (!telegram_id) {
      res.status(400).json({
        success: false,
        message: 'telegram_id是必填字段'
      });
      return;
    }
    
    // 检查telegram_id是否已存在
    const existingTelegram = await query(
      'SELECT telegram_id FROM telegram_users WHERE telegram_id = $1',
      [telegram_id]
    );
    
    if (existingTelegram.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Telegram ID已存在'
      });
      return;
    }
    
    // 检查推荐码是否已存在
    if (referral_code) {
      const existingReferral = await query(
        'SELECT referral_code FROM telegram_users WHERE referral_code = $1',
        [referral_code]
      );
      
      if (existingReferral.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '推荐码已存在'
        });
        return;
      }
    }
    
    // 创建用户
    const newUser = await query(
      `INSERT INTO telegram_users (
        telegram_id, username, first_name, last_name,
        user_type, status, tron_address, referral_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        telegram_id, username, first_name, last_name,
        user_type as role, status, tron_address, referral_code, created_at`,
      [
        telegram_id, username, first_name, last_name,
        type, status, tron_address, referral_code
      ]
    );
    
    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: {
        user: newUser.rows[0]
      }
    });
    
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新用户信息
 * PUT /api/users/:telegram_id
 * 权限：管理员或用户本人
 */
router.put('/:telegram_id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegram_id } = req.params;
    const currentUser = req.user;
    
    // 检查权限：仅管理员可以修改用户信息
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: '权限不足，仅管理员可以修改用户信息'
      });
      return;
    }
    
    const {
      username,
      first_name,
      last_name,
      type,
      status,
      tron_address,
      referral_code
    } = req.body;
    
    // 检查用户是否存在
    const existingUser = await query(
      'SELECT telegram_id, user_type as role FROM telegram_users WHERE telegram_id = $1',
      [telegram_id]
    );
    
    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }
    
    const user = existingUser.rows[0];
    
    // 非管理员不能修改类型和状态
    if (!isAdmin && (type || status)) {
      res.status(403).json({
        success: false,
        message: '权限不足，无法修改用户类型或状态'
      });
      return;
    }
    
    // 构建更新字段
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (username !== undefined) {
      updateFields.push(`username = $${paramIndex}`);
      updateValues.push(username);
      paramIndex++;
    }
    
    if (first_name !== undefined) {
      updateFields.push(`first_name = $${paramIndex}`);
      updateValues.push(first_name);
      paramIndex++;
    }
    
    if (last_name !== undefined) {
      updateFields.push(`last_name = $${paramIndex}`);
      updateValues.push(last_name);
      paramIndex++;
    }
    
    if (type !== undefined && isAdmin) {
      updateFields.push(`user_type = $${paramIndex}`);
      updateValues.push(type);
      paramIndex++;
    }

    if (status !== undefined && isAdmin) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }
    
    if (tron_address !== undefined) {
      updateFields.push(`tron_address = $${paramIndex}`);
      updateValues.push(tron_address);
      paramIndex++;
    }
    
    if (referral_code !== undefined) {
      updateFields.push(`referral_code = $${paramIndex}`);
      updateValues.push(referral_code);
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
    updateValues.push(telegram_id);
    
    // 执行更新
    const updateQuery = `
      UPDATE telegram_users 
      SET ${updateFields.join(', ')}
      WHERE telegram_id = $${paramIndex}
      RETURNING 
        telegram_id, username, first_name, last_name,
        user_type as role, status, tron_address, referral_code, updated_at
    `;
    
    const updatedUser = await query(updateQuery, updateValues);
    
    res.status(200).json({
      success: true,
      message: '用户信息更新成功',
      data: {
        user: updatedUser.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新用户状态
 * PATCH /api/users/:telegram_id/status
 * 权限：管理员
 */
router.patch('/:telegram_id/status', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegram_id } = req.params;
    const { status } = req.body;
    
    // 验证状态值
    const validStatuses = ['active', 'inactive', 'banned'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: '无效的状态值，允许的值: ' + validStatuses.join(', ')
      });
      return;
    }
    
    // 检查用户是否存在
    const existingUser = await query(
      'SELECT telegram_id, status FROM telegram_users WHERE telegram_id = $1',
      [telegram_id]
    );
    
    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }
    
    // 更新状态
    const updatedUser = await query(
      `UPDATE telegram_users 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE telegram_id = $2 
       RETURNING telegram_id, status, updated_at`,
      [status, telegram_id]
    );
    
    res.status(200).json({
      success: true,
      message: '用户状态更新成功',
      data: {
        user: updatedUser.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新用户状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除用户
 * DELETE /api/users/:telegram_id
 * 权限：管理员
 */
router.delete('/:telegram_id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegram_id } = req.params;
    
    // 检查用户是否存在
    const existingUser = await query(
      'SELECT telegram_id, user_type as role FROM telegram_users WHERE telegram_id = $1',
      [telegram_id]
    );
    
    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }
    
    // 防止删除管理员账户（可选的安全措施）
    if (existingUser.rows[0].role === 'admin') {
      res.status(400).json({
        success: false,
        message: '不能删除管理员账户'
      });
      return;
    }
    
    // 检查用户是否有关联的订单
    const orderCheck = await query(
      'SELECT COUNT(*) as count FROM orders WHERE telegram_id = $1',
      [telegram_id]
    );
    
    if (parseInt(orderCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该用户有关联的订单，不能删除。请先处理相关订单或将用户状态设为禁用。'
      });
      return;
    }
    
    // 删除用户
    await query('DELETE FROM telegram_users WHERE telegram_id = $1', [telegram_id]);
    
    res.status(200).json({
      success: true,
      message: '用户删除成功'
    });
    
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取用户统计信息
 * GET /api/users/stats
 * 权限：管理员
 */
router.get('/stats/overview', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取用户统计
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
        COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned_users,
        COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN user_type = 'agent' THEN 1 END) as agent_users,
        COUNT(CASE WHEN user_type = 'normal' THEN 1 END) as regular_users,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_month
      FROM telegram_users
    `);
    
    res.status(200).json({
      success: true,
      message: '用户统计信息获取成功',
      data: {
        stats: statsResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('获取用户统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;