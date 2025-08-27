/**
 * 价格趋势分析模块
 * 提供价格历史数据分析和趋势预测
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import type { TrendStatistics } from './utils.js';
import { 
  createApiResponse, 
  handleDatabaseError,
  validateRequiredParams,
  calculateStandardDeviation,
  formatPrice,
  calculatePercentage
} from './utils.js';

const router: Router = Router();

/**
 * 价格趋势分析
 * GET /api/price-search/trends
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      entity_type,
      entity_id,
      days = 30,
      group_by = 'day'
    } = req.query;
    
    // 验证必需参数
    const validation = validateRequiredParams(
      { entity_type, entity_id }, 
      ['entity_type', 'entity_id']
    );
    if (!validation.isValid) {
      res.status(400).json(createApiResponse(false, `缺少必需参数: ${validation.missingFields.join(', ')}`));
      return;
    }
    
    if (!['bot', 'agent', 'package'].includes(entity_type as string)) {
      res.status(400).json(createApiResponse(false, 'entity_type必须是bot、agent或package'));
      return;
    }
    
    if (!['hour', 'day', 'week', 'month'].includes(group_by as string)) {
      res.status(400).json(createApiResponse(false, 'group_by必须是hour、day、week或month'));
      return;
    }
    
    // 获取价格历史数据
    const priceHistory = await getPriceHistory(
      entity_type as string,
      Number(entity_id),
      Number(days),
      group_by as string
    );
    
    if (priceHistory.length === 0) {
      res.status(404).json(createApiResponse(false, '未找到价格历史数据'));
      return;
    }
    
    // 计算趋势统计
    const trendStats = calculateTrendStatistics(priceHistory);
    
    // 获取实体信息
    const entityInfo = await getEntityInfo(entity_type as string, Number(entity_id));
    
    const responseData = {
      entity_info: entityInfo,
      price_history: priceHistory,
      trend_statistics: trendStats,
      analysis_period: {
        days: Number(days),
        group_by: group_by as string,
        data_points: priceHistory.length
      }
    };
    
    res.status(200).json(createApiResponse(true, '价格趋势分析完成', responseData));
    
  } catch (error) {
    handleDatabaseError(error, '价格趋势分析');
    res.status(500).json(createApiResponse(false, '服务器内部错误'));
  }
});

/**
 * 获取价格历史数据
 */
async function getPriceHistory(
  entityType: string,
  entityId: number,
  days: number,
  groupBy: string
): Promise<any[]> {
  let dateFormat: string;
  let dateInterval: string;
  
  switch (groupBy) {
    case 'hour':
      dateFormat = 'YYYY-MM-DD HH24:00:00';
      dateInterval = '1 hour';
      break;
    case 'day':
      dateFormat = 'YYYY-MM-DD';
      dateInterval = '1 day';
      break;
    case 'week':
      dateFormat = 'YYYY-"W"WW';
      dateInterval = '1 week';
      break;
    case 'month':
      dateFormat = 'YYYY-MM';
      dateInterval = '1 month';
      break;
    default:
      dateFormat = 'YYYY-MM-DD';
      dateInterval = '1 day';
  }
  
  let whereClause = '';
  let joinClause = '';
  
  switch (entityType) {
    case 'bot':
      whereClause = 'pc.bot_id = $2';
      joinClause = 'LEFT JOIN bots b ON pc.bot_id = b.id';
      break;
    case 'agent':
      whereClause = 'pc.agent_id = $2';
      joinClause = 'LEFT JOIN agents a ON pc.agent_id = a.id';
      break;
    case 'package':
      whereClause = 'pc.package_id = $2';
      joinClause = 'LEFT JOIN energy_packages ep ON pc.package_id = ep.id';
      break;
  }
  
  const historyQuery = `
    WITH date_series AS (
      SELECT generate_series(
        NOW() - INTERVAL '${days} days',
        NOW(),
        INTERVAL '${dateInterval}'
      ) AS period_start
    ),
    price_data AS (
      SELECT 
        TO_CHAR(pc.created_at, '${dateFormat}') as period,
        pc.created_at,
        pc.price,
        pc.discount_percentage,
        (pc.price * (1 - COALESCE(pc.discount_percentage, 0) / 100)) as final_price,
        pc.status
      FROM price_configs pc
      ${joinClause}
      WHERE ${whereClause}
        AND pc.created_at >= NOW() - INTERVAL '${days} days'
        AND pc.created_at <= NOW()
      ORDER BY pc.created_at
    )
    SELECT 
      period,
      COUNT(*) as price_changes,
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      AVG(discount_percentage) as avg_discount,
      AVG(final_price) as avg_final_price,
      MIN(final_price) as min_final_price,
      MAX(final_price) as max_final_price,
      STDDEV(final_price) as price_volatility,
      MIN(created_at) as period_start,
      MAX(created_at) as period_end
    FROM price_data
    GROUP BY period
    ORDER BY period
  `;
  
  const result = await query(historyQuery, [days, entityId]);
  return result.rows;
}

/**
 * 获取实体信息
 */
async function getEntityInfo(entityType: string, entityId: number): Promise<any> {
  let entityQuery = '';
  
  switch (entityType) {
    case 'bot':
      entityQuery = `
        SELECT 
          id,
          bot_name as name,
          'bot' as type,
          status,
          commission_rate,
          created_at
        FROM bots 
        WHERE id = $1
      `;
      break;
    case 'agent':
      entityQuery = `
        SELECT 
          id,
          agent_name as name,
          'agent' as type,
          status,
          level,
          commission_rate,
          created_at
        FROM agents 
        WHERE id = $1
      `;
      break;
    case 'package':
      entityQuery = `
        SELECT 
          id,
          package_name as name,
          'package' as type,
          status,
          energy_amount,
          duration_hours,
          base_price,
          created_at
        FROM energy_packages 
        WHERE id = $1
      `;
      break;
  }
  
  const result = await query(entityQuery, [entityId]);
  return result.rows[0] || null;
}

/**
 * 计算趋势统计
 */
function calculateTrendStatistics(priceHistory: any[]): TrendStatistics {
  if (priceHistory.length === 0) {
    return {
      total_periods: 0,
      avg_price: 0,
      min_price: 0,
      max_price: 0,
      price_volatility: 0,
      trend_direction: 'stable',
      price_change_percentage: 0,
      total_price_changes: 0
    };
  }
  
  const prices = priceHistory.map(h => parseFloat(h.avg_final_price) || 0);
  const totalChanges = priceHistory.reduce((sum, h) => sum + (parseInt(h.price_changes) || 0), 0);
  
  // 计算价格变化趋势
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const priceChangePercentage = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  if (priceChangePercentage > 5) {
    trendDirection = 'up';
  } else if (priceChangePercentage < -5) {
    trendDirection = 'down';
  }
  
  // 计算价格波动性
  const priceVolatility = calculateStandardDeviation(prices);
  
  return {
    total_periods: priceHistory.length,
    avg_price: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    min_price: Math.min(...prices),
    max_price: Math.max(...prices),
    price_volatility: priceVolatility,
    trend_direction: trendDirection,
    price_change_percentage: priceChangePercentage,
    total_price_changes: totalChanges
  };
}

/**
 * 多实体价格趋势对比
 * POST /api/price-search/trends/compare
 */
router.post('/compare', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      entities, // [{ entity_type, entity_id, name? }]
      days = 30,
      group_by = 'day'
    } = req.body;
    
    // 验证必需参数
    const validation = validateRequiredParams({ entities }, ['entities']);
    if (!validation.isValid) {
      res.status(400).json(createApiResponse(false, `缺少必需参数: ${validation.missingFields.join(', ')}`));
      return;
    }
    
    if (!Array.isArray(entities) || entities.length === 0) {
      res.status(400).json(createApiResponse(false, 'entities必须是非空数组'));
      return;
    }
    
    const comparisonResults = [];
    
    // 为每个实体获取趋势数据
    for (const entity of entities) {
      const { entity_type, entity_id } = entity;
      
      if (!['bot', 'agent', 'package'].includes(entity_type)) {
        continue;
      }
      
      const priceHistory = await getPriceHistory(
        entity_type,
        entity_id,
        Number(days),
        group_by as string
      );
      
      const trendStats = calculateTrendStatistics(priceHistory);
      const entityInfo = await getEntityInfo(entity_type, entity_id);
      
      comparisonResults.push({
        entity_info: entityInfo,
        price_history: priceHistory,
        trend_statistics: trendStats
      });
    }
    
    // 计算对比统计
    const comparisonStats = calculateComparisonTrendStats(comparisonResults);
    
    const responseData = {
      comparison_results: comparisonResults,
      comparison_statistics: comparisonStats,
      analysis_period: {
        days: Number(days),
        group_by: group_by as string,
        entities_count: comparisonResults.length
      }
    };
    
    res.status(200).json(createApiResponse(true, '多实体价格趋势对比完成', responseData));
    
  } catch (error) {
    handleDatabaseError(error, '多实体价格趋势对比');
    res.status(500).json(createApiResponse(false, '服务器内部错误'));
  }
});

/**
 * 计算对比趋势统计
 */
function calculateComparisonTrendStats(comparisonResults: any[]): any {
  if (comparisonResults.length === 0) {
    return {
      total_entities: 0,
      avg_price_change: 0,
      most_volatile: null,
      least_volatile: null,
      best_performer: null,
      worst_performer: null
    };
  }
  
  const trendStats = comparisonResults.map(r => r.trend_statistics);
  
  // 找出最佳和最差表现者
  const bestPerformer = comparisonResults.reduce((best, current) => 
    current.trend_statistics.price_change_percentage > best.trend_statistics.price_change_percentage ? current : best
  );
  
  const worstPerformer = comparisonResults.reduce((worst, current) => 
    current.trend_statistics.price_change_percentage < worst.trend_statistics.price_change_percentage ? current : worst
  );
  
  // 找出波动性最高和最低的
  const mostVolatile = comparisonResults.reduce((most, current) => 
    current.trend_statistics.price_volatility > most.trend_statistics.price_volatility ? current : most
  );
  
  const leastVolatile = comparisonResults.reduce((least, current) => 
    current.trend_statistics.price_volatility < least.trend_statistics.price_volatility ? current : least
  );
  
  return {
    total_entities: comparisonResults.length,
    avg_price_change: trendStats.reduce((sum, stats) => sum + stats.price_change_percentage, 0) / trendStats.length,
    avg_volatility: trendStats.reduce((sum, stats) => sum + stats.price_volatility, 0) / trendStats.length,
    most_volatile: {
      entity: mostVolatile.entity_info,
      volatility: mostVolatile.trend_statistics.price_volatility
    },
    least_volatile: {
      entity: leastVolatile.entity_info,
      volatility: leastVolatile.trend_statistics.price_volatility
    },
    best_performer: {
      entity: bestPerformer.entity_info,
      price_change: bestPerformer.trend_statistics.price_change_percentage
    },
    worst_performer: {
      entity: worstPerformer.entity_info,
      price_change: worstPerformer.trend_statistics.price_change_percentage
    }
  };
}

export default router;