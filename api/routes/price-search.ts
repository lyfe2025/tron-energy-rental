/**
 * 价格搜索和筛选功能API路由
 * 支持多维度的价格数据查询
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import PriceCalculator from '../utils/price-calculator.js';

const router: Router = Router();

/**
 * 综合价格搜索
 * GET /api/price-search
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search, // 搜索关键词
      entity_type, // 实体类型：bot, agent, package, template
      price_min, // 最低价格
      price_max, // 最高价格
      discount_min, // 最低折扣
      discount_max, // 最高折扣
      status, // 状态
      date_from, // 开始日期
      date_to, // 结束日期
      sort_by = 'created_at', // 排序字段
      sort_order = 'desc', // 排序方向
      page = 1,
      limit = 20
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建搜索结果
    const searchResults = {
      bots: [],
      agents: [],
      packages: [],
      templates: [],
      configs: []
    };
    
    // 如果没有指定实体类型或包含机器人，搜索机器人价格配置
    if (!entity_type || entity_type === 'bot') {
      const botSearchQuery = `
        SELECT 
          'bot' as entity_type,
          b.id as entity_id,
          b.bot_name as entity_name,
          pc.id as config_id,
          pc.price,
          pc.discount_percentage,
          pc.status,
          pc.created_at,
          pc.updated_at,
          ep.package_name,
          ep.energy_amount,
          ep.duration_hours
        FROM bots b
        LEFT JOIN price_configs pc ON b.id = pc.bot_id
        LEFT JOIN energy_packages ep ON pc.package_id = ep.id
        WHERE 1=1
        ${search ? "AND (b.bot_name ILIKE '%" + search + "%' OR ep.package_name ILIKE '%" + search + "%')" : ''}
        ${price_min ? `AND pc.price >= ${Number(price_min)}` : ''}
        ${price_max ? `AND pc.price <= ${Number(price_max)}` : ''}
        ${discount_min ? `AND pc.discount_percentage >= ${Number(discount_min)}` : ''}
        ${discount_max ? `AND pc.discount_percentage <= ${Number(discount_max)}` : ''}
        ${status ? `AND pc.status = '${status}'` : ''}
        ${date_from ? `AND pc.created_at >= '${date_from}'` : ''}
        ${date_to ? `AND pc.created_at <= '${date_to}'` : ''}
        ORDER BY pc.${sort_by} ${sort_order}
      `;
      
      const botResult = await query(botSearchQuery);
      searchResults.bots = botResult.rows;
    }
    
    // 如果没有指定实体类型或包含代理商，搜索代理商价格配置
    if (!entity_type || entity_type === 'agent') {
      const agentSearchQuery = `
        SELECT 
          'agent' as entity_type,
          a.id as entity_id,
          a.agent_name as entity_name,
          pc.id as config_id,
          pc.price,
          pc.discount_percentage,
          pc.status,
          pc.created_at,
          pc.updated_at,
          a.level as agent_level,
          a.commission_rate,
          ep.package_name,
          ep.energy_amount,
          ep.duration_hours
        FROM agents a
        LEFT JOIN price_configs pc ON a.id = pc.agent_id
        LEFT JOIN energy_packages ep ON pc.package_id = ep.id
        WHERE 1=1
        ${search ? "AND (a.agent_name ILIKE '%" + search + "%' OR ep.package_name ILIKE '%" + search + "%')" : ''}
        ${price_min ? `AND pc.price >= ${Number(price_min)}` : ''}
        ${price_max ? `AND pc.price <= ${Number(price_max)}` : ''}
        ${discount_min ? `AND pc.discount_percentage >= ${Number(discount_min)}` : ''}
        ${discount_max ? `AND pc.discount_percentage <= ${Number(discount_max)}` : ''}
        ${status ? `AND pc.status = '${status}'` : ''}
        ${date_from ? `AND pc.created_at >= '${date_from}'` : ''}
        ${date_to ? `AND pc.created_at <= '${date_to}'` : ''}
        ORDER BY pc.${sort_by} ${sort_order}
      `;
      
      const agentResult = await query(agentSearchQuery);
      searchResults.agents = agentResult.rows;
    }
    
    // 如果没有指定实体类型或包含能量包，搜索能量包
    if (!entity_type || entity_type === 'package') {
      const packageSearchQuery = `
        SELECT 
          'package' as entity_type,
          ep.id as entity_id,
          ep.package_name as entity_name,
          ep.energy_amount,
          ep.duration_hours,
          ep.base_price,
          ep.status,
          ep.created_at,
          ep.updated_at,
          COUNT(pc.id) as config_count
        FROM energy_packages ep
        LEFT JOIN price_configs pc ON ep.id = pc.package_id
        WHERE 1=1
        ${search ? "AND ep.package_name ILIKE '%" + search + "%'" : ''}
        ${price_min ? `AND ep.base_price >= ${Number(price_min)}` : ''}
        ${price_max ? `AND ep.base_price <= ${Number(price_max)}` : ''}
        ${status ? `AND ep.status = '${status}'` : ''}
        ${date_from ? `AND ep.created_at >= '${date_from}'` : ''}
        ${date_to ? `AND ep.created_at <= '${date_to}'` : ''}
        GROUP BY ep.id, ep.package_name, ep.energy_amount, ep.duration_hours, ep.base_price, ep.status, ep.created_at, ep.updated_at
        ORDER BY ep.${sort_by} ${sort_order}
      `;
      
      const packageResult = await query(packageSearchQuery);
      searchResults.packages = packageResult.rows;
    }
    
    // 如果没有指定实体类型或包含模板，搜索价格模板
    if (!entity_type || entity_type === 'template') {
      const templateSearchQuery = `
        SELECT 
          'template' as entity_type,
          pt.id as entity_id,
          pt.template_name as entity_name,
          pt.base_price,
          pt.discount_percentage,
          pt.status,
          pt.created_at,
          pt.updated_at,
          pt.description,
          COUNT(pc.id) as usage_count
        FROM price_templates pt
        LEFT JOIN price_configs pc ON pt.id = pc.template_id
        WHERE 1=1
        ${search ? "AND (pt.template_name ILIKE '%" + search + "%' OR pt.description ILIKE '%" + search + "%')" : ''}
        ${price_min ? `AND pt.base_price >= ${Number(price_min)}` : ''}
        ${price_max ? `AND pt.base_price <= ${Number(price_max)}` : ''}
        ${discount_min ? `AND pt.discount_percentage >= ${Number(discount_min)}` : ''}
        ${discount_max ? `AND pt.discount_percentage <= ${Number(discount_max)}` : ''}
        ${status ? `AND pt.status = '${status}'` : ''}
        ${date_from ? `AND pt.created_at >= '${date_from}'` : ''}
        ${date_to ? `AND pt.created_at <= '${date_to}'` : ''}
        GROUP BY pt.id, pt.template_name, pt.base_price, pt.discount_percentage, pt.status, pt.created_at, pt.updated_at, pt.description
        ORDER BY pt.${sort_by} ${sort_order}
      `;
      
      const templateResult = await query(templateSearchQuery);
      searchResults.templates = templateResult.rows;
    }
    
    // 搜索所有价格配置（通用搜索）
    const configSearchQuery = `
      SELECT 
        pc.*,
        CASE 
          WHEN pc.bot_id IS NOT NULL THEN 'bot'
          WHEN pc.agent_id IS NOT NULL THEN 'agent'
          ELSE 'default'
        END as config_type,
        COALESCE(b.bot_name, a.agent_name, 'Default') as entity_name,
        ep.package_name,
        ep.energy_amount,
        ep.duration_hours,
        pt.template_name
      FROM price_configs pc
      LEFT JOIN bots b ON pc.bot_id = b.id
      LEFT JOIN agents a ON pc.agent_id = a.id
      LEFT JOIN energy_packages ep ON pc.package_id = ep.id
      LEFT JOIN price_templates pt ON pc.template_id = pt.id
      WHERE 1=1
      ${search ? "AND (COALESCE(b.bot_name, a.agent_name, 'Default') ILIKE '%" + search + "%' OR ep.package_name ILIKE '%" + search + "%' OR pt.template_name ILIKE '%" + search + "%')" : ''}
      ${price_min ? `AND pc.price >= ${Number(price_min)}` : ''}
      ${price_max ? `AND pc.price <= ${Number(price_max)}` : ''}
      ${discount_min ? `AND pc.discount_percentage >= ${Number(discount_min)}` : ''}
      ${discount_max ? `AND pc.discount_percentage <= ${Number(discount_max)}` : ''}
      ${status ? `AND pc.status = '${status}'` : ''}
      ${date_from ? `AND pc.created_at >= '${date_from}'` : ''}
      ${date_to ? `AND pc.created_at <= '${date_to}'` : ''}
      ORDER BY pc.${sort_by} ${sort_order}
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;
    
    const configResult = await query(configSearchQuery);
    searchResults.configs = configResult.rows;
    
    // 计算总数
    const totalCounts = {
      bots: searchResults.bots.length,
      agents: searchResults.agents.length,
      packages: searchResults.packages.length,
      templates: searchResults.templates.length,
      configs: searchResults.configs.length
    };
    
    const totalResults = Object.values(totalCounts).reduce((sum, count) => sum + count, 0);
    
    res.status(200).json({
      success: true,
      message: '价格搜索完成',
      data: {
        results: searchResults,
        counts: totalCounts,
        total: totalResults,
        filters: {
          search,
          entity_type,
          price_range: { min: price_min, max: price_max },
          discount_range: { min: discount_min, max: discount_max },
          status,
          date_range: { from: date_from, to: date_to }
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalResults
        }
      }
    });
    
  } catch (error) {
    console.error('价格搜索错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 价格比较分析
 * GET /api/price-search/compare
 */
router.get('/compare', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { package_id, bot_ids, agent_ids, quantity = 1 } = req.query;
    
    if (!package_id) {
      res.status(400).json({
        success: false,
        message: '缺少必填参数：package_id'
      });
      return;
    }
    
    // 验证能量包是否存在
    const packageResult = await query('SELECT * FROM energy_packages WHERE id = $1', [package_id]);
    if (packageResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量包不存在'
      });
      return;
    }
    
    const energyPackage = packageResult.rows[0];
    const comparisonResults = [];
    
    // 获取默认价格
    const defaultPrice = await PriceCalculator.calculatePrice(
      package_id as string,
      Number(quantity),
      null,
      null
    );
    
    comparisonResults.push({
      type: 'default',
      id: null,
      name: '默认价格',
      price: defaultPrice.finalPrice,
      breakdown: defaultPrice,
      savings: 0,
      savings_percentage: 0
    });
    
    // 比较机器人价格
    if (bot_ids) {
      const botIdArray = Array.isArray(bot_ids) ? bot_ids : [bot_ids];
      
      for (const botId of botIdArray) {
        try {
          // 获取机器人信息
          const botResult = await query('SELECT * FROM bots WHERE id = $1', [botId]);
          if (botResult.rows.length === 0) continue;
          
          const bot = botResult.rows[0];
          
          // 计算机器人价格
          const botPrice = await PriceCalculator.calculatePrice(
            package_id as string,
            Number(quantity),
            botId as string,
            null
          );
          
          const savings = defaultPrice.finalPrice - botPrice.finalPrice;
          const savingsPercentage = (savings / defaultPrice.finalPrice) * 100;
          
          comparisonResults.push({
            type: 'bot',
            id: botId,
            name: bot.bot_name,
            price: botPrice.finalPrice,
            breakdown: botPrice,
            savings,
            savings_percentage: savingsPercentage
          });
        } catch (error) {
          console.error(`计算机器人 ${botId} 价格失败:`, error);
        }
      }
    }
    
    // 比较代理商价格
    if (agent_ids) {
      const agentIdArray = Array.isArray(agent_ids) ? agent_ids : [agent_ids];
      
      for (const agentId of agentIdArray) {
        try {
          // 获取代理商信息
          const agentResult = await query('SELECT * FROM agents WHERE id = $1', [agentId]);
          if (agentResult.rows.length === 0) continue;
          
          const agent = agentResult.rows[0];
          
          // 计算代理商价格
          const agentPrice = await PriceCalculator.calculatePrice(
            package_id as string,
            Number(quantity),
            null,
            agentId as string
          );
          
          const savings = defaultPrice.finalPrice - agentPrice.finalPrice;
          const savingsPercentage = (savings / defaultPrice.finalPrice) * 100;
          
          // 计算代理商佣金
          const commission = agentPrice.finalPrice * (agent.commission_rate / 100);
          const agentNetPrice = agentPrice.finalPrice - commission;
          
          comparisonResults.push({
            type: 'agent',
            id: agentId,
            name: agent.agent_name,
            price: agentPrice.finalPrice,
            agent_net_price: agentNetPrice,
            commission,
            commission_rate: agent.commission_rate,
            breakdown: agentPrice,
            savings,
            savings_percentage: savingsPercentage
          });
        } catch (error) {
          console.error(`计算代理商 ${agentId} 价格失败:`, error);
        }
      }
    }
    
    // 排序结果（按价格从低到高）
    comparisonResults.sort((a, b) => a.price - b.price);
    
    // 计算统计信息
    const prices = comparisonResults.map(r => r.price);
    const statistics = {
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      avg_price: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      price_range: Math.max(...prices) - Math.min(...prices),
      best_deal: comparisonResults[0], // 最低价格
      worst_deal: comparisonResults[comparisonResults.length - 1] // 最高价格
    };
    
    res.status(200).json({
      success: true,
      message: '价格比较分析完成',
      data: {
        package: energyPackage,
        quantity: Number(quantity),
        comparison: comparisonResults,
        statistics,
        recommendations: {
          best_value: statistics.best_deal,
          potential_savings: statistics.max_price - statistics.min_price
        }
      }
    });
    
  } catch (error) {
    console.error('价格比较分析错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 价格趋势分析
 * GET /api/price-search/trends
 */
router.get('/trends', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      entity_type, // bot, agent, package
      entity_id,
      days = 30,
      group_by = 'day' // day, week, month
    } = req.query;
    
    if (!entity_type || !entity_id) {
      res.status(400).json({
        success: false,
        message: '缺少必填参数：entity_type, entity_id'
      });
      return;
    }
    
    // 构建时间分组格式
    let dateFormat = 'YYYY-MM-DD';
    let dateInterval = '1 day';
    
    switch (group_by) {
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
    
    // 查询价格历史记录
    const historyQuery = `
      SELECT 
        TO_CHAR(created_at, '${dateFormat}') as period,
        AVG(new_price) as avg_price,
        MIN(new_price) as min_price,
        MAX(new_price) as max_price,
        COUNT(*) as change_count,
        DATE_TRUNC('${group_by}', created_at) as period_start
      FROM price_history
      WHERE entity_type = $1 
        AND entity_id = $2 
        AND created_at >= NOW() - INTERVAL '${Number(days)} days'
      GROUP BY period, period_start
      ORDER BY period_start ASC
    `;
    
    const historyResult = await query(historyQuery, [entity_type, entity_id]);
    
    // 获取实体信息
    let entityInfo = null;
    let entityQuery = '';
    
    switch (entity_type) {
      case 'bot':
        entityQuery = 'SELECT id, bot_name as name FROM bots WHERE id = $1';
        break;
      case 'agent':
        entityQuery = 'SELECT id, agent_name as name FROM agents WHERE id = $1';
        break;
      case 'package':
        entityQuery = 'SELECT id, package_name as name FROM energy_packages WHERE id = $1';
        break;
      default:
        res.status(400).json({
          success: false,
          message: '不支持的实体类型'
        });
        return;
    }
    
    const entityResult = await query(entityQuery, [entity_id]);
    if (entityResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '实体不存在'
      });
      return;
    }
    
    entityInfo = entityResult.rows[0];
    
    // 计算趋势统计
    const trends = historyResult.rows;
    const prices = trends.map(t => parseFloat(t.avg_price));
    
    let trendDirection = 'stable';
    let trendPercentage = 0;
    
    if (prices.length >= 2) {
      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      trendPercentage = ((lastPrice - firstPrice) / firstPrice) * 100;
      
      if (trendPercentage > 5) {
        trendDirection = 'increasing';
      } else if (trendPercentage < -5) {
        trendDirection = 'decreasing';
      }
    }
    
    const statistics = {
      total_changes: trends.reduce((sum, t) => sum + parseInt(t.change_count), 0),
      avg_price: prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0,
      min_price: prices.length > 0 ? Math.min(...prices) : 0,
      max_price: prices.length > 0 ? Math.max(...prices) : 0,
      price_volatility: prices.length > 1 ? calculateStandardDeviation(prices) : 0,
      trend_direction: trendDirection,
      trend_percentage: trendPercentage
    };
    
    res.status(200).json({
      success: true,
      message: '价格趋势分析完成',
      data: {
        entity: entityInfo,
        entity_type,
        period: {
          days: Number(days),
          group_by,
          date_format: dateFormat
        },
        trends,
        statistics,
        insights: {
          is_volatile: statistics.price_volatility > 10,
          has_upward_trend: trendDirection === 'increasing',
          has_downward_trend: trendDirection === 'decreasing',
          change_frequency: statistics.total_changes / Number(days)
        }
      }
    });
    
  } catch (error) {
    console.error('价格趋势分析错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 高级筛选器选项
 * GET /api/price-search/filters
 */
router.get('/filters', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取所有可用的筛选器选项
    const filters = {
      entity_types: [
        { value: 'bot', label: '机器人', count: 0 },
        { value: 'agent', label: '代理商', count: 0 },
        { value: 'package', label: '能量包', count: 0 },
        { value: 'template', label: '价格模板', count: 0 }
      ],
      status_options: [
        { value: 'active', label: '活跃' },
        { value: 'inactive', label: '非活跃' },
        { value: 'pending', label: '待审核' }
      ],
      price_ranges: [],
      discount_ranges: [],
      agent_levels: [],
      package_types: []
    };
    
    // 获取实体数量统计
    const entityCounts = await Promise.all([
      query('SELECT COUNT(*) as count FROM bots'),
      query('SELECT COUNT(*) as count FROM agents'),
      query('SELECT COUNT(*) as count FROM energy_packages'),
      query('SELECT COUNT(*) as count FROM price_templates')
    ]);
    
    filters.entity_types[0].count = parseInt(entityCounts[0].rows[0].count);
    filters.entity_types[1].count = parseInt(entityCounts[1].rows[0].count);
    filters.entity_types[2].count = parseInt(entityCounts[2].rows[0].count);
    filters.entity_types[3].count = parseInt(entityCounts[3].rows[0].count);
    
    // 获取价格范围
    const priceRangeQuery = `
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price) as q1,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price) as q3
      FROM price_configs
      WHERE price IS NOT NULL
    `;
    
    const priceRangeResult = await query(priceRangeQuery);
    if (priceRangeResult.rows.length > 0) {
      const priceData = priceRangeResult.rows[0];
      filters.price_ranges = [
        { label: '低价区间', min: priceData.min_price, max: priceData.q1 },
        { label: '中低价区间', min: priceData.q1, max: priceData.median },
        { label: '中高价区间', min: priceData.median, max: priceData.q3 },
        { label: '高价区间', min: priceData.q3, max: priceData.max_price }
      ];
    }
    
    // 获取折扣范围
    const discountRangeQuery = `
      SELECT 
        MIN(discount_percentage) as min_discount,
        MAX(discount_percentage) as max_discount
      FROM price_configs
      WHERE discount_percentage IS NOT NULL
    `;
    
    const discountRangeResult = await query(discountRangeQuery);
    if (discountRangeResult.rows.length > 0) {
      const discountData = discountRangeResult.rows[0];
      filters.discount_ranges = [
        { label: '无折扣', min: 0, max: 0 },
        { label: '小幅折扣', min: 0, max: 10 },
        { label: '中等折扣', min: 10, max: 25 },
        { label: '大幅折扣', min: 25, max: discountData.max_discount }
      ];
    }
    
    // 获取代理商等级
    const agentLevelsQuery = `
      SELECT DISTINCT level, COUNT(*) as count
      FROM agents
      WHERE level IS NOT NULL
      GROUP BY level
      ORDER BY level DESC
    `;
    
    const agentLevelsResult = await query(agentLevelsQuery);
    filters.agent_levels = agentLevelsResult.rows.map(row => ({
      value: row.level,
      label: `等级 ${row.level}`,
      count: parseInt(row.count)
    }));
    
    // 获取能量包类型（按能量数量分组）
    const packageTypesQuery = `
      SELECT 
        CASE 
          WHEN energy_amount < 10000 THEN 'small'
          WHEN energy_amount < 100000 THEN 'medium'
          WHEN energy_amount < 1000000 THEN 'large'
          ELSE 'enterprise'
        END as package_type,
        COUNT(*) as count,
        MIN(energy_amount) as min_energy,
        MAX(energy_amount) as max_energy
      FROM energy_packages
      GROUP BY package_type
      ORDER BY min_energy ASC
    `;
    
    const packageTypesResult = await query(packageTypesQuery);
    filters.package_types = packageTypesResult.rows.map(row => {
      const typeLabels = {
        small: '小型包',
        medium: '中型包',
        large: '大型包',
        enterprise: '企业包'
      };
      
      return {
        value: row.package_type,
        label: typeLabels[row.package_type as keyof typeof typeLabels] || row.package_type,
        count: parseInt(row.count),
        energy_range: {
          min: parseInt(row.min_energy),
          max: parseInt(row.max_energy)
        }
      };
    });
    
    res.status(200).json({
      success: true,
      message: '获取筛选器选项成功',
      data: filters
    });
    
  } catch (error) {
    console.error('获取筛选器选项错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 辅助函数：计算标准差
function calculateStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length;
  
  return Math.sqrt(variance);
}

export default router;