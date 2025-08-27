/**
 * 价格比较分析模块
 * 提供多维度的价格对比功能
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import type { ComparisonResult } from './utils.js';
import { 
  createApiResponse, 
  handleDatabaseError,
  validateRequiredParams,
  formatPrice,
  calculatePercentage
} from './utils.js';

const router: Router = Router();

/**
 * 价格比较分析
 * POST /api/price-search/compare
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { package_id, bot_ids, agent_ids } = req.body;
    
    // 验证必需参数
    const validation = validateRequiredParams({ package_id }, ['package_id']);
    if (!validation.isValid) {
      res.status(400).json(createApiResponse(false, `缺少必需参数: ${validation.missingFields.join(', ')}`));
      return;
    }
    
    if (!bot_ids && !agent_ids) {
      res.status(400).json(createApiResponse(false, '必须提供bot_ids或agent_ids中的至少一个'));
      return;
    }
    
    // 获取能量包信息
    const packageInfo = await getPackageInfo(package_id);
    if (!packageInfo) {
      res.status(404).json(createApiResponse(false, '能量包不存在'));
      return;
    }
    
    const comparisonResults: ComparisonResult[] = [];
    
    // 比较机器人价格
    if (bot_ids && Array.isArray(bot_ids) && bot_ids.length > 0) {
      const botComparisons = await compareBotPrices(package_id, bot_ids);
      comparisonResults.push(...botComparisons);
    }
    
    // 比较代理商价格
    if (agent_ids && Array.isArray(agent_ids) && agent_ids.length > 0) {
      const agentComparisons = await compareAgentPrices(package_id, agent_ids);
      comparisonResults.push(...agentComparisons);
    }
    
    // 计算比较统计
    const statistics = calculateComparisonStatistics(comparisonResults);
    
    // 排序结果（按最终价格从低到高）
    comparisonResults.sort((a, b) => a.final_price - b.final_price);
    
    const responseData = {
      package_info: packageInfo,
      comparisons: comparisonResults,
      statistics,
      best_deal: comparisonResults[0] || null,
      worst_deal: comparisonResults[comparisonResults.length - 1] || null
    };
    
    res.status(200).json(createApiResponse(true, '价格比较完成', responseData));
    
  } catch (error) {
    handleDatabaseError(error, '价格比较');
    res.status(500).json(createApiResponse(false, '服务器内部错误'));
  }
});

/**
 * 获取能量包信息
 */
async function getPackageInfo(packageId: number): Promise<any> {
  const packageQuery = `
    SELECT 
      id,
      package_name,
      energy_amount,
      duration_hours,
      base_price,
      status
    FROM energy_packages 
    WHERE id = $1 AND status = 'active'
  `;
  
  const result = await query(packageQuery, [packageId]);
  return result.rows[0] || null;
}

/**
 * 比较机器人价格
 */
async function compareBotPrices(packageId: number, botIds: number[]): Promise<ComparisonResult[]> {
  const botQuery = `
    SELECT 
      b.id as entity_id,
      b.bot_name as entity_name,
      'bot' as entity_type,
      pc.price as base_price,
      pc.discount_percentage,
      pc.status,
      b.commission_rate,
      ep.base_price as package_base_price
    FROM bots b
    LEFT JOIN price_configs pc ON b.id = pc.bot_id AND pc.package_id = $1
    LEFT JOIN energy_packages ep ON ep.id = $1
    WHERE b.id = ANY($2) AND b.status = 'active'
  `;
  
  const result = await query(botQuery, [packageId, botIds]);
  
  return result.rows.map(row => {
    const basePrice = row.base_price || row.package_base_price || 0;
    const discountAmount = basePrice * (row.discount_percentage || 0) / 100;
    const finalPrice = basePrice - discountAmount;
    const commissionAmount = finalPrice * (row.commission_rate || 0) / 100;
    
    return {
      entity_id: row.entity_id,
      entity_name: row.entity_name,
      entity_type: row.entity_type,
      base_price: basePrice,
      discount_percentage: row.discount_percentage || 0,
      discount_amount: discountAmount,
      final_price: finalPrice,
      commission_rate: row.commission_rate || 0,
      commission_amount: commissionAmount,
      total_cost: finalPrice + commissionAmount,
      status: row.status || 'inactive',
      savings_vs_base: row.package_base_price ? row.package_base_price - finalPrice : 0
    };
  });
}

/**
 * 比较代理商价格
 */
async function compareAgentPrices(packageId: number, agentIds: number[]): Promise<ComparisonResult[]> {
  const agentQuery = `
    SELECT 
      a.id as entity_id,
      a.agent_name as entity_name,
      'agent' as entity_type,
      pc.price as base_price,
      pc.discount_percentage,
      pc.status,
      a.commission_rate,
      a.level as agent_level,
      ep.base_price as package_base_price
    FROM agents a
    LEFT JOIN price_configs pc ON a.id = pc.agent_id AND pc.package_id = $1
    LEFT JOIN energy_packages ep ON ep.id = $1
    WHERE a.id = ANY($2) AND a.status = 'active'
  `;
  
  const result = await query(agentQuery, [packageId, agentIds]);
  
  return result.rows.map(row => {
    const basePrice = row.base_price || row.package_base_price || 0;
    const discountAmount = basePrice * (row.discount_percentage || 0) / 100;
    const finalPrice = basePrice - discountAmount;
    const commissionAmount = finalPrice * (row.commission_rate || 0) / 100;
    
    return {
      entity_id: row.entity_id,
      entity_name: row.entity_name,
      entity_type: row.entity_type,
      base_price: basePrice,
      discount_percentage: row.discount_percentage || 0,
      discount_amount: discountAmount,
      final_price: finalPrice,
      commission_rate: row.commission_rate || 0,
      commission_amount: commissionAmount,
      total_cost: finalPrice + commissionAmount,
      status: row.status || 'inactive',
      savings_vs_base: row.package_base_price ? row.package_base_price - finalPrice : 0,
      agent_level: row.agent_level
    };
  });
}

/**
 * 计算比较统计信息
 */
function calculateComparisonStatistics(comparisons: ComparisonResult[]): any {
  if (comparisons.length === 0) {
    return {
      total_comparisons: 0,
      avg_final_price: 0,
      min_final_price: 0,
      max_final_price: 0,
      avg_discount: 0,
      total_savings: 0
    };
  }
  
  const finalPrices = comparisons.map(c => c.final_price);
  const discounts = comparisons.map(c => c.discount_percentage);
  const savings = comparisons.map(c => c.savings_vs_base);
  
  return {
    total_comparisons: comparisons.length,
    avg_final_price: finalPrices.reduce((sum, price) => sum + price, 0) / finalPrices.length,
    min_final_price: Math.min(...finalPrices),
    max_final_price: Math.max(...finalPrices),
    avg_discount: discounts.reduce((sum, discount) => sum + discount, 0) / discounts.length,
    total_savings: savings.reduce((sum, saving) => sum + saving, 0),
    price_range: Math.max(...finalPrices) - Math.min(...finalPrices),
    entities_by_type: {
      bots: comparisons.filter(c => c.entity_type === 'bot').length,
      agents: comparisons.filter(c => c.entity_type === 'agent').length
    }
  };
}

/**
 * 批量价格比较
 * POST /api/price-search/compare/batch
 */
router.post('/batch', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { package_ids, entity_type, entity_ids } = req.body;
    
    // 验证必需参数
    const validation = validateRequiredParams(
      { package_ids, entity_type, entity_ids }, 
      ['package_ids', 'entity_type', 'entity_ids']
    );
    if (!validation.isValid) {
      res.status(400).json(createApiResponse(false, `缺少必需参数: ${validation.missingFields.join(', ')}`));
      return;
    }
    
    if (!['bot', 'agent'].includes(entity_type)) {
      res.status(400).json(createApiResponse(false, 'entity_type必须是bot或agent'));
      return;
    }
    
    const batchResults = [];
    
    // 为每个能量包进行比较
    for (const packageId of package_ids) {
      const packageInfo = await getPackageInfo(packageId);
      if (!packageInfo) continue;
      
      let comparisons: ComparisonResult[] = [];
      
      if (entity_type === 'bot') {
        comparisons = await compareBotPrices(packageId, entity_ids);
      } else if (entity_type === 'agent') {
        comparisons = await compareAgentPrices(packageId, entity_ids);
      }
      
      const statistics = calculateComparisonStatistics(comparisons);
      comparisons.sort((a, b) => a.final_price - b.final_price);
      
      batchResults.push({
        package_info: packageInfo,
        comparisons,
        statistics,
        best_deal: comparisons[0] || null
      });
    }
    
    const responseData = {
      batch_results: batchResults,
      summary: {
        total_packages: package_ids.length,
        processed_packages: batchResults.length,
        entity_type,
        total_entities: entity_ids.length
      }
    };
    
    res.status(200).json(createApiResponse(true, '批量价格比较完成', responseData));
    
  } catch (error) {
    handleDatabaseError(error, '批量价格比较');
    res.status(500).json(createApiResponse(false, '服务器内部错误'));
  }
});

export default router;