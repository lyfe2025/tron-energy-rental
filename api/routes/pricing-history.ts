import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router: Router = Router();

// 获取价格历史列表
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      start_date,
      end_date,
      type,
      strategy_id
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (start_date) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (strategy_id) {
      whereConditions.push(`strategy_id = $${paramIndex}`);
      queryParams.push(strategy_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        ph.*,
        ps.name as strategy_name,
        ps.type as strategy_type,
        COUNT(*) OVER() as total_count
      FROM pricing_history ph
      LEFT JOIN pricing_strategies ps ON ph.strategy_id = ps.id
      ${whereClause}
      ORDER BY ph.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(Number(limit), offset);

    const result = await pool.query(query, queryParams);
    const history = result.rows;
    const totalCount = history.length > 0 ? history[0].total_count : 0;

    // 移除total_count字段
    history.forEach(item => delete item.total_count);

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          pages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取价格历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取价格历史失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取单个价格历史记录
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        ph.*,
        ps.name as strategy_name,
        ps.type as strategy_type
      FROM pricing_history ph
      LEFT JOIN pricing_strategies ps ON ph.strategy_id = ps.id
      WHERE ph.id = $1
    `;
    
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '价格历史记录不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取价格历史记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取价格历史记录失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 创建价格历史记录（通常由系统自动创建）
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      strategy_id,
      type,
      old_price,
      new_price,
      change_reason,
      metadata
    } = req.body;

    // 验证必需字段
    if (!strategy_id || !type || old_price === undefined || new_price === undefined) {
      return res.status(400).json({
        success: false,
        message: '缺少必需字段'
      });
    }

    const insertQuery = `
      INSERT INTO pricing_history (strategy_id, type, old_price, new_price, change_reason, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      strategy_id,
      type,
      old_price,
      new_price,
      change_reason || '',
      metadata ? JSON.stringify(metadata) : null
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '价格历史记录创建成功'
    });
  } catch (error) {
    console.error('创建价格历史记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建价格历史记录失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取价格历史统计信息
router.get('/stats/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (start_date) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        COUNT(*) as total_changes,
        COUNT(DISTINCT strategy_id) as affected_strategies,
        COUNT(DISTINCT DATE(created_at)) as days_with_changes,
        AVG(new_price - old_price) as avg_price_change,
        MIN(created_at) as first_change,
        MAX(created_at) as last_change
      FROM pricing_history
      ${whereClause}
    `;

    const result = await pool.query(query, queryParams);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        total_changes: Number(stats.total_changes),
        affected_strategies: Number(stats.affected_strategies),
        days_with_changes: Number(stats.days_with_changes),
        avg_price_change: Number(stats.avg_price_change) || 0,
        first_change: stats.first_change,
        last_change: stats.last_change
      }
    });
  } catch (error) {
    console.error('获取价格历史统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取价格历史统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
