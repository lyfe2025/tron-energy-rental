/**
 * 数据库连接测试路由
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';

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

export default router;