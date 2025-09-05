/**
 * 机器人用户管理路由
 * 包含：获取机器人用户列表
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import type { RouteHandler, PaginationParams } from './types.js';

const router: Router = Router();

/**
 * 获取机器人用户列表
 * GET /api/bots/:id/users
 * 权限：管理员
 */
const getBotUsers: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status,
      search 
    } = req.query as PaginationParams;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 检查机器人是否存在
    const botCheck = await query(
      'SELECT id FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (botCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 构建查询条件 - 直接从users表查询，不再使用bot_users表
    const whereConditions = ['u.telegram_id IS NOT NULL']; // 只查询有telegram_id的用户
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      whereConditions.push(`u.status = $${paramIndex}`);
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
    
    // 查询用户列表 - 直接从users表查询
    const usersQuery = `
      SELECT 
        u.id as user_id, u.username, u.first_name, u.last_name,
        u.telegram_id, u.role, u.status as user_status,
        u.created_at as joined_at, u.updated_at as last_interaction_at,
        '{}' as bot_user_settings, 'active' as bot_user_status
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const usersResult = await query(usersQuery, queryParams);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users u
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
};

// 注册路由
router.get('/:id/users', authenticateToken, requireAdmin, getBotUsers);

export default router;
