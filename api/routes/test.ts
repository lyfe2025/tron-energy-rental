/**
 * 数据库连接测试路由
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { UserAuthService } from '../services/user/modules/UserAuthService.js';

const router: Router = Router();

/**
 * 测试数据库连接
 * GET /api/test/db
 */
router.get('/db', async (req: Request, res: Response) => {
  try {
    // 测试查询用户表
    const result = await query('SELECT COUNT(*) as user_count FROM users');
    
    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      data: {
        userCount: result.rows[0].user_count,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 获取用户列表
 * GET /api/test/users
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT id, email, username, role, status, created_at FROM users LIMIT 10');
    
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 测试Telegram用户注册和语言检测
 * POST /api/test/register-telegram-user
 */
router.post('/register-telegram-user', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        success: false, 
        error: '测试端点仅在开发环境可用' 
      });
    }

    const { telegram_id, username, first_name, last_name, language_code, is_premium, bot_id } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'telegram_id是必需的' 
      });
    }

    console.log(`🧪 测试端点: 注册Telegram用户`, {
      telegram_id,
      username,
      first_name,
      last_name,
      language_code,
      is_premium,
      bot_id
    });

    const user = await UserAuthService.registerTelegramUser({
      telegram_id,
      username,
      first_name,
      last_name,
      language_code,
      is_premium: is_premium || false,
      bot_id: bot_id || 'test-bot'
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        language_code: (user as any).language_code,
        is_premium: (user as any).is_premium,
        bot_id: (user as any).bot_id,
        login_type: user.login_type,
        user_type: (user as any).user_type
      }
    });

  } catch (error) {
    console.error('测试注册失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '注册失败'
    });
  }
});

export default router;