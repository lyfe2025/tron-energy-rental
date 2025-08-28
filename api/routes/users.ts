/**
 * 用户管理API路由
 * 处理用户的增删改查、状态管理等功能
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
      role, 
      status, 
      search,
      login_type 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    if (role) {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
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
        id, telegram_id, username, first_name, last_name, email, phone,
        role, status, login_type, tron_address, balance, usdt_balance, trx_balance, total_orders,
        total_energy_used, referral_code, referred_by, last_login_at,
        created_at, updated_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const usersResult = await query(usersQuery, queryParams);
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
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
 * GET /api/users/:id
 * 权限：管理员或用户本人
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    
    // 检查权限：管理员或用户本人
    if (currentUser?.role !== 'admin' && currentUser?.userId !== id) {
      res.status(403).json({
        success: false,
        message: '权限不足，只能查看自己的信息'
      });
      return;
    }
    
    const userResult = await query(
      `SELECT 
        id, telegram_id, username, first_name, last_name, email, phone,
        role, status, login_type, tron_address, balance, usdt_balance, trx_balance, total_orders,
        total_energy_used, referral_code, referred_by, last_login_at,
        created_at, updated_at
       FROM users 
       WHERE id = $1`,
      [id]
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
      email,
      phone,
      password,
      role = 'user',
      login_type = 'telegram',
      tron_address,
      referral_code
    } = req.body;
    
    // 验证必填字段
    if (login_type === 'admin' && (!email || !password)) {
      res.status(400).json({
        success: false,
        message: '管理员用户必须提供邮箱和密码'
      });
      return;
    }
    
    if (login_type === 'telegram' && !telegram_id) {
      res.status(400).json({
        success: false,
        message: 'Telegram用户必须提供telegram_id'
      });
      return;
    }
    
    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (existingEmail.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该邮箱已被注册'
        });
        return;
      }
    }
    
    // 检查telegram_id是否已存在
    if (telegram_id) {
      const existingTelegram = await query(
        'SELECT id FROM users WHERE telegram_id = $1',
        [telegram_id]
      );
      
      if (existingTelegram.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该Telegram ID已被注册'
        });
        return;
      }
    }
    
    // 检查推荐码是否已存在
    if (referral_code) {
      const existingReferral = await query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referral_code]
      );
      
      if (existingReferral.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该推荐码已被使用'
        });
        return;
      }
    }
    
    // 加密密码（如果提供）
    let passwordHash = null;
    if (password) {
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: '密码长度至少6位'
        });
        return;
      }
      passwordHash = await bcrypt.hash(password, 10);
    }
    
    // 创建用户
    const newUser = await query(
      `INSERT INTO users (
        telegram_id, username, first_name, last_name, email, phone,
        password_hash, role, login_type, status, tron_address, referral_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id, telegram_id, username, first_name, last_name, email, phone,
        role, status, login_type, tron_address, usdt_balance, trx_balance, referral_code, created_at`,
      [
        telegram_id, username, first_name, last_name, email, phone,
        passwordHash, role, login_type, 'active', tron_address, referral_code
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
 * PUT /api/users/:id
 * 权限：管理员或用户本人
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    
    // 检查权限：管理员或用户本人
    if (currentUser?.role !== 'admin' && currentUser?.userId !== id) {
      res.status(403).json({
        success: false,
        message: '权限不足，只能修改自己的信息'
      });
      return;
    }
    
    const {
      username,
      first_name,
      last_name,
      email,
      phone,
      tron_address,
      password
    } = req.body;
    
    // 检查用户是否存在
    const existingUser = await query(
      'SELECT id, role, login_type FROM users WHERE id = $1',
      [id]
    );
    
    if (existingUser.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }
    
    const user = existingUser.rows[0];
    
    // 检查邮箱是否被其他用户使用
    if (email) {
      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      
      if (emailCheck.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该邮箱已被其他用户使用'
        });
        return;
      }
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
    
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(email);
      paramIndex++;
    }
    
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      updateValues.push(phone);
      paramIndex++;
    }
    
    if (tron_address !== undefined) {
      updateFields.push(`tron_address = $${paramIndex}`);
      updateValues.push(tron_address);
      paramIndex++;
    }
    
    // 处理密码更新
    if (password) {
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: '密码长度至少6位'
        });
        return;
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      updateFields.push(`password_hash = $${paramIndex}`);
      updateValues.push(passwordHash);
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
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, telegram_id, username, first_name, last_name, email, phone,
        role, status, login_type, tron_address, updated_at
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
 * PATCH /api/users/:id/status
 * 权限：管理员
 */
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
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
      'SELECT id, status FROM users WHERE id = $1',
      [id]
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
      `UPDATE users 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, status, updated_at`,
      [status, id]
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
 * DELETE /api/users/:id
 * 权限：管理员
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 检查用户是否存在
    const existingUser = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
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
      'SELECT COUNT(*) as count FROM orders WHERE user_id = $1',
      [id]
    );
    
    if (parseInt(orderCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该用户有关联的订单，不能删除。请先处理相关订单或将用户状态设为禁用。'
      });
      return;
    }
    
    // 删除用户
    await query('DELETE FROM users WHERE id = $1', [id]);
    
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
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN role = 'agent' THEN 1 END) as agent_users,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
        COUNT(CASE WHEN login_type = 'telegram' THEN 1 END) as telegram_users,
        COUNT(CASE WHEN login_type = 'admin' THEN 1 END) as admin_login_users,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_month
      FROM users
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