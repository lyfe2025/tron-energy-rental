/**
 * 机器人状态管理路由
 * 包含：获取可用机器人列表、更新机器人状态
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import { isValidBotStatus } from './middleware.js';
import type { RouteHandler, BotStatusData } from './types.js';

const router: Router = Router();

/**
 * 获取可用的机器人列表（用于代理商关联）
 * GET /api/bots/available
 * 权限：已认证用户
 */
const getAvailableBots: RouteHandler = async (req: Request, res: Response) => {
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
};

/**
 * 更新机器人状态
 * PATCH /api/bots/:id/status
 * 权限：管理员
 */
const updateBotStatus: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as BotStatusData;
    
    // 验证状态值
    if (!isValidBotStatus(status)) {
      const validStatuses = ['active', 'inactive', 'maintenance'];
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
};

// 注册路由
router.get('/available', authenticateToken, getAvailableBots);
router.patch('/:id/status', authenticateToken, requireAdmin, updateBotStatus);

export default router;
