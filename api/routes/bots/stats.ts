/**
 * 机器人统计监控路由
 * 包含：获取统计概览信息
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.ts';
import { authenticateToken, requireAdmin } from '../../middleware/auth.ts';
import type { RouteHandler } from './types.ts';

const router: Router = Router();

/**
 * 获取机器人统计信息
 * GET /api/bots/stats/overview
 * 权限：管理员
 */
const getBotStatsOverview: RouteHandler = async (req: Request, res: Response) => {
  try {
    // 获取机器人统计
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_bots,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_bots,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_bots,
        0 as maintenance_bots,
        0 as total_bot_users,
        0 as total_bot_orders,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_bots_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_bots_month
      FROM telegram_bots
    `);
    
    // 获取机器人用户统计 - 从users表统计有telegram_id的用户
    const userStatsResult = await query(`
      SELECT 
        COUNT(*) as total_bot_users
      FROM users
      WHERE telegram_id IS NOT NULL
    `);
    
    // 获取机器人订单统计
    const orderStatsResult = await query(`
      SELECT 
        COUNT(*) as total_bot_orders
      FROM orders 
      WHERE bot_id IS NOT NULL
    `);
    
    const stats = statsResult.rows[0];
    const userStats = userStatsResult.rows[0];
    const orderStats = orderStatsResult.rows[0];
    
    // 合并统计数据
    const combinedStats = {
      ...stats,
      total_bot_users: parseInt(userStats.total_bot_users) || 0,
      total_bot_orders: parseInt(orderStats.total_bot_orders) || 0
    };
    
    res.status(200).json({
      success: true,
      message: '机器人统计信息获取成功',
      data: {
        stats: combinedStats
      }
    });
    
  } catch (error) {
    console.error('获取机器人统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 导入新的统计控制器
import {
    getAllBotStatistics,
    getBotOrders,
    getBotStatistics,
    getBotUsers
} from './statistics/BotStatisticsController.ts';

// 注册路由
router.get('/stats/overview', authenticateToken, requireAdmin, getBotStatsOverview);

// 新的统计路由
router.get('/statistics', authenticateToken, requireAdmin, getAllBotStatistics);
router.get('/:id/statistics', authenticateToken, requireAdmin, getBotStatistics);
router.get('/:id/users', authenticateToken, requireAdmin, getBotUsers);
router.get('/:id/orders', authenticateToken, requireAdmin, getBotOrders);

export default router;
