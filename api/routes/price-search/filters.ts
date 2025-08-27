/**
 * 高级筛选器模块
 * 提供价格搜索的筛选选项和统计信息
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import type { FilterOption, PriceRange } from './utils.js';
import { 
  createApiResponse, 
  handleDatabaseError 
} from './utils.js';

const router: Router = Router();

/**
 * 获取高级筛选器选项
 * GET /api/price-search/filters
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // 并行获取所有筛选器选项
    const [entityTypes, statusOptions, priceRanges, discountRanges, agentLevels, packageTypes] = await Promise.all([
      getEntityTypes(),
      getStatusOptions(),
      getPriceRanges(),
      getDiscountRanges(),
      getAgentLevels(),
      getPackageTypes()
    ]);
    
    const filterOptions = {
      entity_types: entityTypes,
      status_options: statusOptions,
      price_ranges: priceRanges,
      discount_ranges: discountRanges,
      agent_levels: agentLevels,
      package_types: packageTypes,
      sort_options: [
        { value: 'created_at', label: '创建时间', type: 'date' },
        { value: 'updated_at', label: '更新时间', type: 'date' },
        { value: 'price', label: '价格', type: 'number' },
        { value: 'discount_percentage', label: '折扣百分比', type: 'number' },
        { value: 'entity_name', label: '实体名称', type: 'string' }
      ],
      sort_orders: [
        { value: 'asc', label: '升序' },
        { value: 'desc', label: '降序' }
      ]
    };
    
    res.status(200).json(createApiResponse(true, '筛选器选项获取成功', filterOptions));
    
  } catch (error) {
    handleDatabaseError(error, '获取筛选器选项');
    res.status(500).json(createApiResponse(false, '服务器内部错误'));
  }
});

/**
 * 获取实体类型统计
 */
async function getEntityTypes(): Promise<FilterOption[]> {
  const entityTypesQuery = `
    SELECT 
      'bot' as value,
      '机器人' as label,
      COUNT(DISTINCT b.id) as count
    FROM bots b
    LEFT JOIN price_configs pc ON b.id = pc.bot_id
    WHERE b.status = 'active'
    
    UNION ALL
    
    SELECT 
      'agent' as value,
      '代理商' as label,
      COUNT(DISTINCT a.id) as count
    FROM agents a
    LEFT JOIN price_configs pc ON a.id = pc.agent_id
    WHERE a.status = 'active'
    
    UNION ALL
    
    SELECT 
      'package' as value,
      '能量包' as label,
      COUNT(DISTINCT ep.id) as count
    FROM energy_packages ep
    WHERE ep.status = 'active'
    
    UNION ALL
    
    SELECT 
      'template' as value,
      '价格模板' as label,
      COUNT(DISTINCT pt.id) as count
    FROM price_templates pt
    WHERE pt.status = 'active'
  `;
  
  const result = await query(entityTypesQuery);
  return result.rows;
}

/**
 * 获取状态选项
 */
async function getStatusOptions(): Promise<FilterOption[]> {
  const statusQuery = `
    SELECT 
      status as value,
      CASE 
        WHEN status = 'active' THEN '活跃'
        WHEN status = 'inactive' THEN '非活跃'
        WHEN status = 'pending' THEN '待审核'
        WHEN status = 'suspended' THEN '暂停'
        ELSE status
      END as label,
      COUNT(*) as count
    FROM (
      SELECT status FROM bots WHERE status IS NOT NULL
      UNION ALL
      SELECT status FROM agents WHERE status IS NOT NULL
      UNION ALL
      SELECT status FROM energy_packages WHERE status IS NOT NULL
      UNION ALL
      SELECT status FROM price_configs WHERE status IS NOT NULL
    ) combined_status
    GROUP BY status
    ORDER BY count DESC
  `;
  
  const result = await query(statusQuery);
  return result.rows;
}

/**
 * 获取价格范围统计
 */
async function getPriceRanges(): Promise<PriceRange[]> {
  const priceRangeQuery = `
    WITH price_stats AS (
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price) as q1,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price) as q3
      FROM price_configs
      WHERE price > 0
    )
    SELECT 
      min_price,
      max_price,
      avg_price,
      q1,
      median,
      q3
    FROM price_stats
  `;
  
  const result = await query(priceRangeQuery);
  const stats = result.rows[0];
  
  if (!stats) {
    return [];
  }
  
  // 基于统计数据生成价格范围选项
  return [
    {
      label: '低价区间',
      min_value: 0,
      max_value: parseFloat(stats.q1),
      count: await getPriceRangeCount(0, parseFloat(stats.q1))
    },
    {
      label: '中低价区间',
      min_value: parseFloat(stats.q1),
      max_value: parseFloat(stats.median),
      count: await getPriceRangeCount(parseFloat(stats.q1), parseFloat(stats.median))
    },
    {
      label: '中高价区间',
      min_value: parseFloat(stats.median),
      max_value: parseFloat(stats.q3),
      count: await getPriceRangeCount(parseFloat(stats.median), parseFloat(stats.q3))
    },
    {
      label: '高价区间',
      min_value: parseFloat(stats.q3),
      max_value: parseFloat(stats.max_price),
      count: await getPriceRangeCount(parseFloat(stats.q3), parseFloat(stats.max_price))
    }
  ];
}

/**
 * 获取指定价格范围内的记录数量
 */
async function getPriceRangeCount(minPrice: number, maxPrice: number): Promise<number> {
  const countQuery = `
    SELECT COUNT(*) as count
    FROM price_configs
    WHERE price >= $1 AND price <= $2
  `;
  
  const result = await query(countQuery, [minPrice, maxPrice]);
  return parseInt(result.rows[0]?.count || '0');
}

/**
 * 获取折扣范围统计
 */
async function getDiscountRanges(): Promise<PriceRange[]> {
  const discountRangeQuery = `
    WITH discount_stats AS (
      SELECT 
        MIN(discount_percentage) as min_discount,
        MAX(discount_percentage) as max_discount,
        AVG(discount_percentage) as avg_discount,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY discount_percentage) as q1,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY discount_percentage) as median,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY discount_percentage) as q3
      FROM price_configs
      WHERE discount_percentage > 0
    )
    SELECT 
      min_discount,
      max_discount,
      avg_discount,
      q1,
      median,
      q3
    FROM discount_stats
  `;
  
  const result = await query(discountRangeQuery);
  const stats = result.rows[0];
  
  if (!stats) {
    return [];
  }
  
  return [
    {
      label: '低折扣 (0-5%)',
      min_value: 0,
      max_value: 5,
      count: await getDiscountRangeCount(0, 5)
    },
    {
      label: '中等折扣 (5-15%)',
      min_value: 5,
      max_value: 15,
      count: await getDiscountRangeCount(5, 15)
    },
    {
      label: '高折扣 (15-30%)',
      min_value: 15,
      max_value: 30,
      count: await getDiscountRangeCount(15, 30)
    },
    {
      label: '超高折扣 (30%+)',
      min_value: 30,
      max_value: 100,
      count: await getDiscountRangeCount(30, 100)
    }
  ];
}

/**
 * 获取指定折扣范围内的记录数量
 */
async function getDiscountRangeCount(minDiscount: number, maxDiscount: number): Promise<number> {
  const countQuery = `
    SELECT COUNT(*) as count
    FROM price_configs
    WHERE discount_percentage >= $1 AND discount_percentage <= $2
  `;
  
  const result = await query(countQuery, [minDiscount, maxDiscount]);
  return parseInt(result.rows[0]?.count || '0');
}

/**
 * 获取代理商等级选项
 */
async function getAgentLevels(): Promise<FilterOption[]> {
  const agentLevelsQuery = `
    SELECT 
      level as value,
      CASE 
        WHEN level = 'bronze' THEN '青铜级'
        WHEN level = 'silver' THEN '白银级'
        WHEN level = 'gold' THEN '黄金级'
        WHEN level = 'platinum' THEN '铂金级'
        WHEN level = 'diamond' THEN '钻石级'
        ELSE level
      END as label,
      COUNT(*) as count
    FROM agents
    WHERE status = 'active' AND level IS NOT NULL
    GROUP BY level
    ORDER BY 
      CASE level
        WHEN 'bronze' THEN 1
        WHEN 'silver' THEN 2
        WHEN 'gold' THEN 3
        WHEN 'platinum' THEN 4
        WHEN 'diamond' THEN 5
        ELSE 6
      END
  `;
  
  const result = await query(agentLevelsQuery);
  return result.rows;
}

/**
 * 获取能量包类型选项
 */
async function getPackageTypes(): Promise<FilterOption[]> {
  const packageTypesQuery = `
    SELECT 
      CASE 
        WHEN energy_amount <= 1000 THEN 'small'
        WHEN energy_amount <= 10000 THEN 'medium'
        WHEN energy_amount <= 100000 THEN 'large'
        ELSE 'enterprise'
      END as value,
      CASE 
        WHEN energy_amount <= 1000 THEN '小型包 (≤1K)'
        WHEN energy_amount <= 10000 THEN '中型包 (1K-10K)'
        WHEN energy_amount <= 100000 THEN '大型包 (10K-100K)'
        ELSE '企业包 (>100K)'
      END as label,
      COUNT(*) as count
    FROM energy_packages
    WHERE status = 'active'
    GROUP BY 
      CASE 
        WHEN energy_amount <= 1000 THEN 'small'
        WHEN energy_amount <= 10000 THEN 'medium'
        WHEN energy_amount <= 100000 THEN 'large'
        ELSE 'enterprise'
      END,
      CASE 
        WHEN energy_amount <= 1000 THEN '小型包 (≤1K)'
        WHEN energy_amount <= 10000 THEN '中型包 (1K-10K)'
        WHEN energy_amount <= 100000 THEN '大型包 (10K-100K)'
        ELSE '企业包 (>100K)'
      END
    ORDER BY 
      CASE 
        WHEN energy_amount <= 1000 THEN 1
        WHEN energy_amount <= 10000 THEN 2
        WHEN energy_amount <= 100000 THEN 3
        ELSE 4
      END
  `;
  
  const result = await query(packageTypesQuery);
  return result.rows;
}

/**
 * 获取筛选器统计信息
 * GET /api/price-search/filters/stats
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT pc.id) as total_price_configs,
        COUNT(DISTINCT b.id) as total_bots,
        COUNT(DISTINCT a.id) as total_agents,
        COUNT(DISTINCT ep.id) as total_packages,
        COUNT(DISTINCT pt.id) as total_templates,
        AVG(pc.price) as avg_price,
        MIN(pc.price) as min_price,
        MAX(pc.price) as max_price,
        AVG(pc.discount_percentage) as avg_discount,
        COUNT(CASE WHEN pc.status = 'active' THEN 1 END) as active_configs,
        COUNT(CASE WHEN pc.status = 'inactive' THEN 1 END) as inactive_configs
      FROM price_configs pc
      LEFT JOIN bots b ON pc.bot_id = b.id
      LEFT JOIN agents a ON pc.agent_id = a.id
      LEFT JOIN energy_packages ep ON pc.package_id = ep.id
      LEFT JOIN price_templates pt ON pc.template_id = pt.id
    `;
    
    const result = await query(statsQuery);
    const stats = result.rows[0];
    
    const responseData = {
      overview: {
        total_price_configs: parseInt(stats.total_price_configs || '0'),
        total_bots: parseInt(stats.total_bots || '0'),
        total_agents: parseInt(stats.total_agents || '0'),
        total_packages: parseInt(stats.total_packages || '0'),
        total_templates: parseInt(stats.total_templates || '0')
      },
      price_statistics: {
        avg_price: parseFloat(stats.avg_price || '0'),
        min_price: parseFloat(stats.min_price || '0'),
        max_price: parseFloat(stats.max_price || '0'),
        avg_discount: parseFloat(stats.avg_discount || '0')
      },
      status_distribution: {
        active_configs: parseInt(stats.active_configs || '0'),
        inactive_configs: parseInt(stats.inactive_configs || '0')
      }
    };
    
    res.status(200).json(createApiResponse(true, '筛选器统计信息获取成功', responseData));
    
  } catch (error) {
    handleDatabaseError(error, '获取筛选器统计信息');
    res.status(500).json(createApiResponse(false, '服务器内部错误'));
  }
});

export default router;