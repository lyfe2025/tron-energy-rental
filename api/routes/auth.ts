/**
 * 用户认证API路由
 * 处理用户注册、登录、token管理等功能
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { generateToken, verifyToken, refreshToken } from '../utils/jwt.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * 管理员登录
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
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
    
    // 查询用户
    const userResult = await query(
      'SELECT id, email, password_hash, role, login_type, status FROM users WHERE email = $1 AND login_type IN ($2, $3)',
      [email, 'admin', 'both']
    );
    
    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
      return;
    }
    
    const user = userResult.rows[0];
    
    // 检查用户状态
    if (user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: '账户已被禁用'
      });
      return;
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
      return;
    }
    
    // 更新最后登录时间
    await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // 生成JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      loginType: user.login_type
    });
    
    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          loginType: user.login_type
        }
      }
    });
    
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 管理员注册（仅限超级管理员）
 * POST /api/auth/register
 */
router.post('/register', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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
      'SELECT id FROM users WHERE email = $1',
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
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 创建用户
    const newUser = await query(
      `INSERT INTO users (email, password_hash, role, login_type, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, role, login_type, created_at`,
      [email, passwordHash, role, 'admin', 'active']
    );
    
    res.status(201).json({
      success: true,
      message: '管理员账户创建成功',
      data: {
        user: newUser.rows[0]
      }
    });
    
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 验证token
 * GET /api/auth/verify
 */
router.get('/verify', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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
    console.error('Token验证错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 刷新token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
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
    console.error('Token刷新错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // 在实际应用中，可以将token加入黑名单
    // 这里简单返回成功，客户端删除本地token即可
    res.status(200).json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 修改密码
 * POST /api/auth/change-password
 */
router.post('/change-password', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;