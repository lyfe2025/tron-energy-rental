/**
 * 用户等级管理API路由
 * 处理用户等级变更、等级历史记录等功能
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.ts';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth.ts';

const router: Router = Router();

/**
 * 获取用户等级变更历史
 * GET /api/user-levels/:user_id/history
 * 权限：管理员
 */
router.get('/:user_id/history', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 查询用户等级变更历史
    const historyQuery = `
      SELECT 
        ulc.id,
        ulc.old_level,
        ulc.new_level,
        ulc.change_reason,
        ulc.change_type,
        ulc.effective_date,
        ulc.created_at,
        a.username as changed_by_username
      FROM user_level_changes ulc
      LEFT JOIN admins a ON ulc.changed_by = a.id
      WHERE ulc.user_id = $1
      ORDER BY ulc.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const historyResult = await query(historyQuery, [user_id, Number(limit), offset]);
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM user_level_changes WHERE user_id = $1`;
    const countResult = await query(countQuery, [user_id]);
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '用户等级变更历史获取成功',
      data: {
        history: historyResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取用户等级变更历史错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 变更用户等级
 * POST /api/user-levels/:user_id/change
 * 权限：管理员
 */
router.post('/:user_id/change', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { new_level, change_reason, effective_date } = req.body;
    const admin_id = req.user?.id;
    
    // 验证必填字段
    if (!new_level) {
      res.status(400).json({
        success: false,
        message: '新等级是必填字段'
      });
      return;
    }
    
    // 验证等级值
    const validLevels = ['normal', 'vip', 'premium'];
    if (!validLevels.includes(new_level)) {
      res.status(400).json({
        success: false,
        message: '无效的等级值，允许的值: ' + validLevels.join(', ')
      });
      return;
    }
    
    // 检查用户是否存在并获取当前等级
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }
    
    const currentLevel = userResult.rows[0].user_type;
    
    // 如果等级没有变化，直接返回
    if (currentLevel === new_level) {
      res.status(400).json({
        success: false,
        message: '用户等级没有变化'
      });
      return;
    }
    
    // 开始事务
    await query('BEGIN');
    
    try {
      // 更新用户等级
      await query(
        'UPDATE users SET user_type = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [new_level, user_id]
      );
      
      // 记录等级变更历史
      const changeRecord = await query(
        `INSERT INTO user_level_changes (
          user_id, old_level, new_level, change_reason, 
          changed_by, change_type, effective_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          user_id, currentLevel, new_level, change_reason,
          admin_id, 'manual', effective_date || new Date()
        ]
      );
      
      // 提交事务
      await query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: '用户等级变更成功',
        data: {
          change_record: changeRecord.rows[0]
        }
      });
      
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('变更用户等级错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 批量变更用户等级
 * POST /api/user-levels/batch-change
 * 权限：管理员
 */
router.post('/batch-change', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { user_ids, new_level, change_reason } = req.body;
    const admin_id = req.user?.id;
    
    // 验证必填字段
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      res.status(400).json({
        success: false,
        message: '用户ID列表是必填字段且不能为空'
      });
      return;
    }
    
    if (!new_level) {
      res.status(400).json({
        success: false,
        message: '新等级是必填字段'
      });
      return;
    }
    
    // 验证等级值
    const validLevels = ['normal', 'vip', 'premium'];
    if (!validLevels.includes(new_level)) {
      res.status(400).json({
        success: false,
        message: '无效的等级值，允许的值: ' + validLevels.join(', ')
      });
      return;
    }
    
    // 获取用户当前等级
    const usersResult = await query(
      `SELECT id, user_type FROM users WHERE id = ANY($1)`,
      [user_ids]
    );
    
    if (usersResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '没有找到有效的用户'
      });
      return;
    }
    
    // 开始事务
    await query('BEGIN');
    
    try {
      const changeRecords = [];
      
      for (const user of usersResult.rows) {
        const currentLevel = user.user_type;
        
        // 跳过等级没有变化的用户
        if (currentLevel === new_level) {
          continue;
        }
        
        // 更新用户等级
        await query(
          'UPDATE users SET user_type = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [new_level, user.id]
        );
        
        // 记录等级变更历史
        const changeRecord = await query(
          `INSERT INTO user_level_changes (
            user_id, old_level, new_level, change_reason, 
            changed_by, change_type, effective_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            user.id, currentLevel, new_level, change_reason,
            admin_id, 'manual', new Date()
          ]
        );
        
        changeRecords.push(changeRecord.rows[0]);
      }
      
      // 提交事务
      await query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: `成功变更 ${changeRecords.length} 个用户的等级`,
        data: {
          change_records: changeRecords,
          total_changed: changeRecords.length
        }
      });
      
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('批量变更用户等级错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取等级变更统计
 * GET /api/user-levels/stats
 * 权限：管理员
 */
router.get('/stats', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const queryParams = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
      queryParams.push(start_date, end_date);
    } else if (start_date) {
      dateFilter = 'WHERE created_at >= $1';
      queryParams.push(start_date);
    } else if (end_date) {
      dateFilter = 'WHERE created_at <= $1';
      queryParams.push(end_date);
    }
    
    // 获取等级变更统计
    const statsQuery = `
      SELECT 
        COUNT(*) as total_changes,
        COUNT(CASE WHEN change_type = 'manual' THEN 1 END) as manual_changes,
        COUNT(CASE WHEN change_type = 'automatic' THEN 1 END) as automatic_changes,
        COUNT(CASE WHEN change_type = 'system' THEN 1 END) as system_changes,
        COUNT(CASE WHEN new_level = 'vip' THEN 1 END) as upgrades_to_vip,
        COUNT(CASE WHEN new_level = 'premium' THEN 1 END) as upgrades_to_premium,
        COUNT(CASE WHEN new_level = 'normal' THEN 1 END) as downgrades_to_normal
      FROM user_level_changes
      ${dateFilter}
    `;
    
    const statsResult = await query(statsQuery, queryParams);
    
    // 获取每日变更趋势（最近30天）
    const trendQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as changes_count
      FROM user_level_changes
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const trendResult = await query(trendQuery);
    
    res.status(200).json({
      success: true,
      message: '等级变更统计获取成功',
      data: {
        stats: statsResult.rows[0],
        trend: trendResult.rows
      }
    });
    
  } catch (error) {
    console.error('获取等级变更统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;