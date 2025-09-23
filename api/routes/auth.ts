/**
 * 用户认证API路由
 * 处理用户注册、登录、token管理等功能
 */
import bcrypt from 'bcryptjs';
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { AdminServiceMain as AdminService } from '../services/admin.js';
import { generateToken, refreshToken } from '../utils/jwt.js';

const router: Router = Router();

/**
 * 管理员登录
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // 验证输入
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: '邮箱和密码不能为空'
      });
      return;
    }
    
    // 查询管理员用户
    const userResult = await query(
      'SELECT id, username, email, password_hash, role, status, department_id, position_id FROM admins WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      // 记录登录失败日志
      await query(
        `INSERT INTO login_logs (username, login_time, ip_address, user_agent, status, login_type, failure_reason)
         VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6)`,
        [email, req.ip || 'unknown', req.get('User-Agent') || 'unknown', 0, 'admin', '用户不存在']
      );
      
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
      return;
    }
    
    const user = userResult.rows[0];
    
    // 检查用户状态
    if (user.status !== 'active') {
      // 记录登录失败日志
      await query(
        `INSERT INTO login_logs (user_id, username, login_time, ip_address, user_agent, status, login_type, failure_reason)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7)`,
        [user.id, user.username, req.ip || 'unknown', req.get('User-Agent') || 'unknown', 0, 'admin', '账户已被禁用']
      );
      
      res.status(401).json({
        success: false,
        message: '账户已被禁用'
      });
      return;
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // 记录登录失败日志
      await query(
        `INSERT INTO login_logs (user_id, username, login_time, ip_address, user_agent, status, login_type, failure_reason)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7)`,
        [user.id, user.username, req.ip || 'unknown', req.get('User-Agent') || 'unknown', 0, 'admin', '密码错误']
      );
      
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
      return;
    }
    
    // 更新最后登录时间
    await query(
      'UPDATE admins SET last_login = CURRENT_TIMESTAMP, last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // 获取用户权限信息
    const userPermissions = await AdminService.getUserRolesAndPermissions(user.id);

    // 记录登录日志
    await query(
      `INSERT INTO login_logs (user_id, username, login_time, ip_address, user_agent, status)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)`,
      [user.id, user.username, req.ip || 'unknown', req.get('User-Agent') || 'unknown', 1]
    );
    
    // 生成JWT token - 使用admins表的ID作为主要标识
    const token = generateToken({
      id: user.id, // 使用admins表的ID
      userId: user.id, // 保持一致性
      username: user.username,
      email: user.email,
      role: user.role,
      loginType: 'admin',
      permissions: userPermissions.permissions,
      department_id: user.department_id,
      position_id: user.position_id
    });

    // 创建会话记录
    try {
      console.log('开始创建会话记录:', {
        admin_id: user.id,
        token_length: token.length,
        ip: req.ip || 'unknown',
        user_agent: req.get('User-Agent') || 'unknown'
      });
      
      const sessionResult = await query(
        `INSERT INTO admin_sessions (admin_id, session_token, ip_address, user_agent, login_at, last_activity, is_active)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true)
         RETURNING id`,
        [user.id, token, req.ip || 'unknown', req.get('User-Agent') || 'unknown']
      );
      
      console.log('会话记录创建成功:', sessionResult.rows[0]);
    } catch (sessionError) {
      console.error('创建会话记录失败:', sessionError);
      // 不阻塞登录流程，继续执行
    }
    
    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id, // 使用admins表的ID
          username: user.username,
          email: user.email,
          role: user.role,
          loginType: 'admin',
          permissions: userPermissions.permissions,
          roles: userPermissions.roles,
          department_id: user.department_id,
          position_id: user.position_id
        }
      }
    });
    
  } catch (error) {
    // 记录详细错误信息到服务器日志
    console.error('登录错误:', error);
    
    // 返回详细错误信息方便排查问题
    let errorMessage = '服务器内部错误';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
      
      // 提供更具体的错误信息
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        errorMessage = `数据库约束错误: ${error.message}`;
      }
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      details: errorDetails,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * 管理员注册（仅限超级管理员）
 * POST /api/auth/register
 */
router.post('/register', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 只有管理员可以创建新的管理员账户
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以创建新账户'
      });
      return;
    }
    
    const { email, password, role = 'admin' } = req.body;
    
    // 验证输入
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: '邮箱和密码不能为空'
      });
      return;
    }
    
    // 验证密码强度
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: '密码长度至少6位'
      });
      return;
    }
    
    // 检查邮箱是否已存在
    const existingUser = await query(
      'SELECT id FROM admins WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '该邮箱已被注册'
      });
      return;
    }
    
    // 加密密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 创建管理员用户
    const newUser = await query(
      `INSERT INTO admins (username, email, password_hash, role, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, username, email, role, created_at`,
      [email.split('@')[0], email, passwordHash, role, 'active']
    );
    
    res.status(201).json({
      success: true,
      message: '管理员账户创建成功',
      data: {
        user: newUser.rows[0]
      }
    });
    
  } catch (error) {
    // 记录详细错误信息到服务器日志
    console.error('注册错误:', error);
    
    // 返回详细错误信息
    let errorMessage = '服务器内部错误';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      details: errorDetails,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * 验证token
 * GET /api/auth/verify
 */
router.get('/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 如果中间件通过，说明token有效
    res.status(200).json({
      success: true,
      message: 'Token有效',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    // 记录详细错误信息到服务器日志
    console.error('Token验证错误:', error);
    
    // 返回详细错误信息
    let errorMessage = '服务器内部错误';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      details: errorDetails,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * 刷新token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({
        success: false,
        message: '需要提供token'
      });
      return;
    }
    
    const newToken = refreshToken(token);
    
    if (!newToken) {
      res.status(401).json({
        success: false,
        message: 'Token无效或已过期'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Token刷新成功',
      data: {
        token: newToken
      }
    });
    
  } catch (error) {
    // 记录详细错误信息到服务器日志，但不暴露给客户端
    console.error('Token刷新错误:', error);
    
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    
    if (userId) {
      // 将用户的所有活跃会话设为非活跃
      await query(
        'UPDATE admin_sessions SET is_active = false WHERE admin_id = $1 AND is_active = true',
        [userId]
      );
    }
    
    res.status(200).json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    // 记录详细错误信息到服务器日志，但不暴露给客户端
    console.error('登出错误:', error);
    
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

/**
 * 修改密码
 * POST /api/auth/change-password
 */
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;
    
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: '当前密码和新密码不能为空'
      });
      return;
    }
    
    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: '新密码长度至少6位'
      });
      return;
    }
    
    // 获取当前用户信息
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }
    
    const user = userResult.rows[0];
    
    // 验证当前密码
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
      return;
    }
    
    // 加密新密码
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // 更新密码
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );
    
    res.status(200).json({
      success: true,
      message: '密码修改成功'
    });
    
  } catch (error) {
    // 记录详细错误信息到服务器日志，但不暴露给客户端
    console.error('修改密码错误:', error);
    
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

export default router;