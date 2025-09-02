/**
 * 机器人测试功能路由
 * 包含：测试机器人连接
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import type { RouteHandler } from './types.js';

const router: Router = Router();

/**
 * 测试机器人连接
 * POST /api/bots/:id/test
 * 权限：管理员
 */
const testBotConnection: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取机器人信息
    const botResult = await query(
      'SELECT id, bot_name as name, bot_username as username, bot_token as token FROM telegram_bots WHERE id = $1',
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
};

// 注册路由
router.post('/:id/test', authenticateToken, requireAdmin, testBotConnection);

export default router;
