/**
 * 综合价格搜索模块
 * 支持多维度的价格数据查询
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import type { SearchFilters } from './utils.js';
import { 
  createApiResponse, 
  calculateOffset, 
  handleDatabaseError 
} from './utils.js';

const router: Router = Router();

/**
 * 综合价格搜索
 * GET /api/price-search/
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: SearchFilters = {
      search: req.query.search as string,
      entity_type: req.query.entity_type as string,
      min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
      min_discount: req.query.min_discount ? Number(req.query.min_discount) : undefined,
      max_discount: req.query.max_discount ? Number(req.query.max_discount) : undefined,
      status: req.query.status as string,
      sort_by: (req.query.sort_by as string) || 'created_at',
      sort_order: (req.query.sort_order as 'ASC' | 'DESC') || 'DESC',
      limit: req.query.limit ? Number(req.query.limit) : 20,
      offset: req.query.offset ? Number(req.query.offset) : 0
    };
    
    const offset = filters.offset || 0;
    
    // 构建搜索结果
    const searchResults = {
      bots: [],
      agents: [],
      packages: [],
      templates: [],
      configs: []
    };
    
    // 搜索机器人价格配置
    if (!filters.entity_type || filters.entity_type === 'bot') {
      const botResults = await searchBotPrices(filters);
      searchResults.bots = botResults;
    }
    
    // 搜索代理商价格配置
    if (!filters.entity_type || filters.entity_type === 'agent') {
      const agentResults = await searchAgentPrices(filters);
      searchResults.agents = agentResults;
    }
    
    // 搜索能量包
    if (!filters.entity_type || filters.entity_type === 'package') {
      const packageResults = await searchPackages(filters);
      searchResults.packages = packageResults;
    }
    
    // 搜索价格模板
    if (!filters.entity_type || filters.entity_type === 'template') {
      const templateResults = await searchTemplates(filters);
      searchResults.templates = templateResults;
    }
    
    // 搜索所有价格配置（通用搜索）
    const configResults = await searchConfigs(filters, offset);
    searchResults.configs = configResults;
    
    // 计算总数
    const totalCounts = {
      bots: searchResults.bots.length,
      agents: searchResults.agents.length,
      packages: searchResults.packages.length,
      templates: searchResults.templates.length,
      configs: searchResults.configs.length
    };
    
    const totalResults = Object.values(totalCounts).reduce((sum, count) => sum + count, 0);
    
    const responseData = {
      results: searchResults,
      counts: totalCounts,
      total: totalResults,
      filters: {
        search: filters.search,
        entity_type: filters.entity_type,
        price_range: { min: filters.min_price, max: filters.max_price },
        discount_range: { min: filters.min_discount, max: filters.max_discount },
        status: filters.status
      },
      pagination: {
        offset: filters.offset,
        limit: filters.limit,
        total: totalResults
      }
    };
    
    res.status(200).json(createApiResponse(true, '价格搜索完成', responseData));
    
  } catch (error) {
    handleDatabaseError(error, '价格搜索');
    res.status(500).json(createApiResponse(false, '服务器内部错误'));
  }
});

/**
 * 搜索机器人价格配置
 */
async function searchBotPrices(filters: SearchFilters): Promise<any[]> {
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
    ${filters.search ? "AND (b.bot_name ILIKE '%" + filters.search + "%' OR ep.package_name ILIKE '%" + filters.search + "%')" : ''}
    ${filters.min_price ? `AND pc.price >= ${filters.min_price}` : ''}
    ${filters.max_price ? `AND pc.price <= ${filters.max_price}` : ''}
    ${filters.min_discount ? `AND pc.discount_percentage >= ${filters.min_discount}` : ''}
    ${filters.max_discount ? `AND pc.discount_percentage <= ${filters.max_discount}` : ''}
    ${filters.status ? `AND pc.status = '${filters.status}'` : ''}

    ORDER BY pc.${filters.sort_by} ${filters.sort_order}
  `;
  
  const result = await query(botSearchQuery);
  return result.rows;
}

/**
 * 搜索代理商价格配置
 */
async function searchAgentPrices(filters: SearchFilters): Promise<any[]> {
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
    ${filters.search ? "AND (a.agent_name ILIKE '%" + filters.search + "%' OR ep.package_name ILIKE '%" + filters.search + "%')" : ''}
    ${filters.min_price ? `AND pc.price >= ${filters.min_price}` : ''}
    ${filters.max_price ? `AND pc.price <= ${filters.max_price}` : ''}
    ${filters.min_discount ? `AND pc.discount_percentage >= ${filters.min_discount}` : ''}
    ${filters.max_discount ? `AND pc.discount_percentage <= ${filters.max_discount}` : ''}
    ${filters.status ? `AND pc.status = '${filters.status}'` : ''}
    ORDER BY pc.${filters.sort_by} ${filters.sort_order}
  `;
  
  const result = await query(agentSearchQuery);
  return result.rows;
}

/**
 * 搜索能量包
 */
async function searchPackages(filters: SearchFilters): Promise<any[]> {
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
    ${filters.search ? "AND ep.package_name ILIKE '%" + filters.search + "%'" : ''}
    ${filters.price_min ? `AND ep.base_price >= ${Number(filters.price_min)}` : ''}
    ${filters.price_max ? `AND ep.base_price <= ${Number(filters.price_max)}` : ''}
    ${filters.status ? `AND ep.status = '${filters.status}'` : ''}
    ${filters.date_from ? `AND ep.created_at >= '${filters.date_from}'` : ''}
    ${filters.date_to ? `AND ep.created_at <= '${filters.date_to}'` : ''}
    GROUP BY ep.id, ep.package_name, ep.energy_amount, ep.duration_hours, ep.base_price, ep.status, ep.created_at, ep.updated_at
    ORDER BY ep.${filters.sort_by} ${filters.sort_order}
  `;
  
  const result = await query(packageSearchQuery);
  return result.rows;
}

/**
 * 搜索价格模板
 */
async function searchTemplates(filters: SearchFilters): Promise<any[]> {
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
    ${filters.search ? "AND (pt.template_name ILIKE '%" + filters.search + "%' OR pt.description ILIKE '%" + filters.search + "%')" : ''}
    ${filters.price_min ? `AND pt.base_price >= ${Number(filters.price_min)}` : ''}
    ${filters.price_max ? `AND pt.base_price <= ${Number(filters.price_max)}` : ''}
    ${filters.discount_min ? `AND pt.discount_percentage >= ${Number(filters.discount_min)}` : ''}
    ${filters.discount_max ? `AND pt.discount_percentage <= ${Number(filters.discount_max)}` : ''}
    ${filters.status ? `AND pt.status = '${filters.status}'` : ''}
    ${filters.date_from ? `AND pt.created_at >= '${filters.date_from}'` : ''}
    ${filters.date_to ? `AND pt.created_at <= '${filters.date_to}'` : ''}
    GROUP BY pt.id, pt.template_name, pt.base_price, pt.discount_percentage, pt.status, pt.created_at, pt.updated_at, pt.description
    ORDER BY pt.${filters.sort_by} ${filters.sort_order}
  `;
  
  const result = await query(templateSearchQuery);
  return result.rows;
}

/**
 * 搜索所有价格配置（通用搜索）
 */
async function searchConfigs(filters: SearchFilters, offset: number): Promise<any[]> {
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
    ${filters.search ? "AND (COALESCE(b.bot_name, a.agent_name, 'Default') ILIKE '%" + filters.search + "%' OR ep.package_name ILIKE '%" + filters.search + "%' OR pt.template_name ILIKE '%" + filters.search + "%')" : ''}
    ${filters.price_min ? `AND pc.price >= ${Number(filters.price_min)}` : ''}
    ${filters.price_max ? `AND pc.price <= ${Number(filters.price_max)}` : ''}
    ${filters.discount_min ? `AND pc.discount_percentage >= ${Number(filters.discount_min)}` : ''}
    ${filters.discount_max ? `AND pc.discount_percentage <= ${Number(filters.discount_max)}` : ''}
    ${filters.status ? `AND pc.status = '${filters.status}'` : ''}
    ${filters.date_from ? `AND pc.created_at >= '${filters.date_from}'` : ''}
    ${filters.date_to ? `AND pc.created_at <= '${filters.date_to}'` : ''}
    ORDER BY pc.${filters.sort_by} ${filters.sort_order}
    LIMIT ${Number(filters.limit)} OFFSET ${offset}
  `;
  
  const result = await query(configSearchQuery);
  return result.rows;
}

export default router;