/**
 * 机器人配置管理路由
 * 包含：更新机器人欢迎语和菜单配置
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import type { RouteHandler, BotConfigData } from './types.js';

const router: Router = Router();

/**
 * 更新机器人欢迎语和菜单配置
 * PUT /api/bots/:id/config
 * 权限：管理员
 */
const updateBotConfig: RouteHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { welcome_message, help_message, commands } = req.body as BotConfigData;
    
    // 检查机器人是否存在
    const existingBot = await query(
      'SELECT id FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (existingBot.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 构建更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (welcome_message !== undefined) {
      updateFields.push(`welcome_message = $${paramIndex}`);
      updateValues.push(welcome_message);
      paramIndex++;
    }
    
    if (help_message !== undefined) {
      updateFields.push(`help_message = $${paramIndex}`);
      updateValues.push(help_message);
      paramIndex++;
    }
    
    if (commands !== undefined) {
      updateFields.push(`allowed_updates = $${paramIndex}`);
      updateValues.push(JSON.stringify(commands));
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有提供要更新的配置字段'
      });
      return;
    }
    
    // 添加更新时间
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    
    // 执行更新
    const updateQuery = `
      UPDATE telegram_bots 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, welcome_message, help_message, allowed_updates as commands, updated_at
    `;
    
    const updatedBot = await query(updateQuery, updateValues);
    
    res.status(200).json({
      success: true,
      message: '机器人配置更新成功',
      data: {
        bot: updatedBot.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新机器人配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 注册路由
router.put('/:id/config', authenticateToken, requireAdmin, updateBotConfig);

export default router;
