/**
 * 价格历史记录API路由
 * 提供价格变更历史查询和统计功能
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import PriceCalculator from '../utils/price-calculator.js';

const router: Router = Router();

/**
 * 获取价格历史记录列表
 * GET /api/price-history
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      entity_type,
      entity_id,
      start_date,
      end_date,
      changed_by
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    if (entity_type) {
      whereConditions.push(`ph.entity_type = $${paramIndex}`);
      queryParams.push(entity_type);
      paramIndex++;
    }
    
    if (entity_id) {
      whereConditions.push(`ph.entity_id = $${paramIndex}`);
      queryParams.push(entity_id);
      paramIndex++;
    }
    
    if (start_date) {
      whereConditions.push(`ph.changed_at >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      whereConditions.push(`ph.changed_at <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }
    
    if (changed_by) {
      whereConditions.push(`ph.changed_by = $${paramIndex}`);
      queryParams.push(changed_by);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 查询价格历史记录
    const historyQuery = `
      SELECT 
        ph.*,
        u.username as changed_by_name,
        u.email as changed_by_email,
        CASE 
          WHEN ph.entity_type = 'bot' THEN b.bot_name
          WHEN ph.entity_type = 'agent' THEN a.agent_name
          WHEN ph.entity_type = 'package' THEN ep.package_name
          ELSE NULL
        END as entity_name
      FROM price_history ph
      LEFT JOIN users u ON ph.changed_by = u.id
      LEFT JOIN bots b ON ph.entity_type = 'bot' AND ph.entity_id = b.id
      LEFT JOIN agents a ON ph.entity_type = 'agent' AND ph.entity_id = a.id
      LEFT JOIN energy_packages ep ON ph.entity_type = 'package' AND ph.entity_id = ep.id
      ${whereClause}
      ORDER BY ph.changed_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const historyResult = await query(historyQuery, queryParams);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM price_history ph
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    // 计算价格变化百分比
    const historyWithChanges = historyResult.rows.map(record => {
      const priceChange = record.newPrice - record.oldPrice;
      const changePercentage = record.oldPrice > 0 
        ? ((priceChange / record.oldPrice) * 100).toFixed(2)
        : '0.00';
      
      return {
        ...record,
        price_change: priceChange,
        change_percentage: parseFloat(changePercentage)
      };
    });
    
    res.status(200).json({
      success: true,
      message: '获取价格历史记录成功',
      data: {
        history: historyWithChanges,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取价格历史记录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取特定实体的价格历史
 * GET /api/price-history/:entityType/:entityId
 */
router.get('/:entityType/:entityId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 50 } = req.query;
    
    // 验证实体类型
    const validTypes = ['bot', 'agent', 'package'];
    if (!validTypes.includes(entityType)) {
      res.status(400).json({
        success: false,
        message: '无效的实体类型，支持：bot, agent, package'
      });
      return;
    }
    
    // 获取价格历史记录
    const history = await PriceCalculator.getPriceHistory(
      entityType as 'bot' | 'agent' | 'package',
      entityId,
      Number(limit)
    );
    
    // 获取实体名称（使用UNION查询避免N+1问题）
    const entityNameQuery = `
      SELECT 
        CASE 
          WHEN $1 = 'bot' THEN (SELECT bot_name FROM bots WHERE id = $2)
          WHEN $1 = 'agent' THEN (SELECT agent_name FROM agents WHERE id = $2)
          WHEN $1 = 'package' THEN (SELECT package_name FROM energy_packages WHERE id = $2)
          ELSE '未知实体'
        END as entity_name
    `;
    
    const entityNameResult = await query(entityNameQuery, [entityType, entityId]);
    const entityName = entityNameResult.rows[0]?.entity_name || `未知${entityType === 'bot' ? '机器人' : entityType === 'agent' ? '代理商' : '能量包'}`;
    
    // 计算价格趋势
    const priceChanges = history.map(record => {
      const priceChange = record.newPrice - record.oldPrice;
      const changePercentage = record.oldPrice > 0 
        ? ((priceChange / record.oldPrice) * 100).toFixed(2)
        : '0.00';
      
      return {
        ...record,
        price_change: priceChange,
        change_percentage: parseFloat(changePercentage)
      };
    });
    
    // 计算统计信息
    const stats = {
      totalChanges: history.length,
      priceIncreases: history.filter(h => h.newPrice > h.oldPrice).length,
      priceDecreases: history.filter(h => h.newPrice < h.oldPrice).length,
      avgPriceChange: history.length > 0 
        ? (history.reduce((sum, h) => sum + (h.newPrice - h.oldPrice), 0) / history.length).toFixed(2)
        : '0',
      currentPrice: history.length > 0 ? history[0].newPrice : 0,
      highestPrice: history.length > 0 ? Math.max(...history.map(h => h.newPrice)) : 0,
      lowestPrice: history.length > 0 ? Math.min(...history.map(h => h.newPrice)) : 0
    };
    
    res.status(200).json({
      success: true,
      message: '获取实体价格历史成功',
      data: {
        entityType,
        entityId,
        entityName,
        history: priceChanges,
        statistics: stats
      }
    });
    
  } catch (error) {
    console.error('获取实体价格历史错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取价格统计信息
 * GET /api/price-history/stats
 * GET /api/price-history/statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      entity_type,
      start_date,
      end_date,
      group_by = 'day' // day, week, month
    } = req.query;
    
    // 获取基础统计信息
    const statistics = await PriceCalculator.getPriceStatistics(
      entity_type as 'bot' | 'agent' | 'package',
      start_date as string,
      end_date as string
    );
    
    // 获取时间序列数据
    let timeGrouping = '';
    switch (group_by) {
      case 'week':
        timeGrouping = "DATE_TRUNC('week', changed_at)";
        break;
      case 'month':
        timeGrouping = "DATE_TRUNC('month', changed_at)";
        break;
      default:
        timeGrouping = "DATE_TRUNC('day', changed_at)";
    }
    
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    if (entity_type) {
      whereConditions.push(`entity_type = $${paramIndex}`);
      queryParams.push(entity_type);
      paramIndex++;
    }
    
    if (start_date) {
      whereConditions.push(`changed_at >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      whereConditions.push(`changed_at <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const timeSeriesResult = await query(
      `SELECT 
        ${timeGrouping} as time_period,
        COUNT(*) as changes_count,
        AVG(new_price - old_price) as avg_change,
        SUM(CASE WHEN new_price > old_price THEN 1 ELSE 0 END) as increases,
        SUM(CASE WHEN new_price < old_price THEN 1 ELSE 0 END) as decreases
      FROM price_history
      ${whereClause}
      GROUP BY ${timeGrouping}
      ORDER BY time_period DESC
      LIMIT 30`,
      queryParams
    );
    
    // 获取最活跃的实体
    const mostActiveResult = await query(
      `SELECT 
        entity_type,
        entity_id,
        COUNT(*) as change_count,
        CASE 
          WHEN entity_type = 'bot' THEN b.bot_name
          WHEN entity_type = 'agent' THEN a.agent_name
          WHEN entity_type = 'package' THEN ep.package_name
          ELSE 'Unknown'
        END as entity_name
      FROM price_history ph
      LEFT JOIN bots b ON ph.entity_type = 'bot' AND ph.entity_id = b.id
      LEFT JOIN agents a ON ph.entity_type = 'agent' AND ph.entity_id = a.id
      LEFT JOIN energy_packages ep ON ph.entity_type = 'package' AND ph.entity_id = ep.id
      ${whereClause}
      GROUP BY entity_type, entity_id, entity_name
      ORDER BY change_count DESC
      LIMIT 10`,
      queryParams
    );
    
    res.status(200).json({
      success: true,
      message: '获取价格统计信息成功',
      data: {
        overview: statistics,
        timeSeries: timeSeriesResult.rows,
        mostActive: mostActiveResult.rows,
        groupBy: group_by
      }
    });
    
  } catch (error) {
    console.error('获取价格统计信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

router.get('/statistics', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      entity_type,
      start_date,
      end_date,
      group_by = 'day' // day, week, month
    } = req.query;
    
    // 获取基础统计信息
    const statistics = await PriceCalculator.getPriceStatistics(
      entity_type as 'bot' | 'agent' | 'package',
      start_date as string,
      end_date as string
    );
    
    // 获取时间序列数据
    let timeGrouping = '';
    switch (group_by) {
      case 'week':
        timeGrouping = "DATE_TRUNC('week', changed_at)";
        break;
      case 'month':
        timeGrouping = "DATE_TRUNC('month', changed_at)";
        break;
      default:
        timeGrouping = "DATE_TRUNC('day', changed_at)";
    }
    
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    if (entity_type) {
      whereConditions.push(`entity_type = $${paramIndex}`);
      queryParams.push(entity_type);
      paramIndex++;
    }
    
    if (start_date) {
      whereConditions.push(`changed_at >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      whereConditions.push(`changed_at <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const timeSeriesResult = await query(
      `SELECT 
        ${timeGrouping} as time_period,
        COUNT(*) as changes_count,
        AVG(new_price - old_price) as avg_change,
        SUM(CASE WHEN new_price > old_price THEN 1 ELSE 0 END) as increases,
        SUM(CASE WHEN new_price < old_price THEN 1 ELSE 0 END) as decreases
      FROM price_history
      ${whereClause}
      GROUP BY ${timeGrouping}
      ORDER BY time_period DESC
      LIMIT 30`,
      queryParams
    );
    
    // 获取最活跃的实体
    const mostActiveResult = await query(
      `SELECT 
        entity_type,
        entity_id,
        COUNT(*) as change_count,
        CASE 
          WHEN entity_type = 'bot' THEN b.bot_name
          WHEN entity_type = 'agent' THEN a.agent_name
          WHEN entity_type = 'package' THEN ep.package_name
          ELSE 'Unknown'
        END as entity_name
      FROM price_history ph
      LEFT JOIN bots b ON ph.entity_type = 'bot' AND ph.entity_id = b.id
      LEFT JOIN agents a ON ph.entity_type = 'agent' AND ph.entity_id = a.id
      LEFT JOIN energy_packages ep ON ph.entity_type = 'package' AND ph.entity_id = ep.id
      ${whereClause}
      GROUP BY entity_type, entity_id, entity_name
      ORDER BY change_count DESC
      LIMIT 10`,
      queryParams
    );
    
    res.status(200).json({
      success: true,
      message: '获取价格统计信息成功',
      data: {
        overview: statistics,
        timeSeries: timeSeriesResult.rows,
        mostActive: mostActiveResult.rows,
        groupBy: group_by
      }
    });
    
  } catch (error) {
    console.error('获取价格统计信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 记录价格变更
 * POST /api/price-history
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      entity_type,
      entity_id,
      old_price,
      new_price,
      change_reason
    } = req.body;
    
    // 验证必填字段
    if (!entity_type || !entity_id || old_price === undefined || new_price === undefined || !change_reason) {
      res.status(400).json({
        success: false,
        message: '缺少必填字段：entity_type, entity_id, old_price, new_price, change_reason'
      });
      return;
    }
    
    // 验证实体类型
    const validTypes = ['bot', 'agent', 'package'];
    if (!validTypes.includes(entity_type)) {
      res.status(400).json({
        success: false,
        message: '无效的实体类型，支持：bot, agent, package'
      });
      return;
    }
    
    // 验证价格值
    if (typeof old_price !== 'number' || typeof new_price !== 'number') {
      res.status(400).json({
        success: false,
        message: '价格必须是数字类型'
      });
      return;
    }
    
    if (old_price < 0 || new_price < 0) {
      res.status(400).json({
        success: false,
        message: '价格不能为负数'
      });
      return;
    }
    
    // 记录价格历史
    await PriceCalculator.recordPriceHistory(
      entity_type as 'bot' | 'agent' | 'package',
      entity_id,
      old_price,
      new_price,
      change_reason,
      String(req.user?.userId || '')
    );
    
    res.status(201).json({
      success: true,
      message: '价格变更记录成功'
    });
    
  } catch (error) {
    console.error('记录价格变更错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取价格趋势分析
 * GET /api/price-history/trends
 */
router.get('/trends', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      entity_type,
      days = 30
    } = req.query;
    
    const daysCount = Number(days);
    if (daysCount <= 0 || daysCount > 365) {
      res.status(400).json({
        success: false,
        message: '天数必须在1-365之间'
      });
      return;
    }
    
    const whereConditions = [`changed_at >= CURRENT_DATE - INTERVAL '${daysCount} days'`];
    const queryParams = [];
    let paramIndex = 1;
    
    if (entity_type) {
      whereConditions.push(`entity_type = $${paramIndex}`);
      queryParams.push(entity_type);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // 获取每日价格趋势
    const dailyTrendsResult = await query(
      `SELECT 
        DATE(changed_at) as date,
        entity_type,
        COUNT(*) as changes_count,
        AVG(new_price) as avg_price,
        MIN(new_price) as min_price,
        MAX(new_price) as max_price,
        SUM(CASE WHEN new_price > old_price THEN 1 ELSE 0 END) as price_increases,
        SUM(CASE WHEN new_price < old_price THEN 1 ELSE 0 END) as price_decreases
      FROM price_history
      ${whereClause}
      GROUP BY DATE(changed_at), entity_type
      ORDER BY date DESC, entity_type`,
      queryParams
    );
    
    // 获取价格波动最大的实体
    const volatilityResult = await query(
      `SELECT 
        ph.entity_type,
        ph.entity_id,
        STDDEV(ph.new_price) as price_volatility,
        COUNT(*) as change_count,
        CASE 
          WHEN ph.entity_type = 'bot' THEN b.bot_name
          WHEN ph.entity_type = 'agent' THEN a.agent_name
          WHEN ph.entity_type = 'package' THEN ep.package_name
          ELSE 'Unknown'
        END as entity_name
      FROM price_history ph
      LEFT JOIN bots b ON ph.entity_type = 'bot' AND ph.entity_id = b.id
      LEFT JOIN agents a ON ph.entity_type = 'agent' AND ph.entity_id = a.id
      LEFT JOIN energy_packages ep ON ph.entity_type = 'package' AND ph.entity_id = ep.id
      ${whereClause}
      GROUP BY ph.entity_type, ph.entity_id, entity_name
      HAVING COUNT(*) >= 3
      ORDER BY price_volatility DESC
      LIMIT 10`,
      queryParams
    );
    
    res.status(200).json({
      success: true,
      message: '获取价格趋势分析成功',
      data: {
        period: `${daysCount} 天`,
        dailyTrends: dailyTrendsResult.rows,
        mostVolatile: volatilityResult.rows
      }
    });
    
  } catch (error) {
    console.error('获取价格趋势分析错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;