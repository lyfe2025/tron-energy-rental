/**
 * 价格统计管理器
 * 负责价格统计信息的计算和分析
 */
import { query } from '../../../config/database.js';

export class StatsManager {
  /**
   * 获取价格统计信息
   * @param entityType 实体类型
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 统计信息
   */
  static async getPriceStatistics(
    entityType?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalChanges: number;
    priceIncreases: number;
    priceDecreases: number;
    avgPriceChange: number;
    maxPriceChange: number;
    minPriceChange: number;
  }> {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_changes,
          SUM(CASE WHEN new_price > old_price THEN 1 ELSE 0 END) as price_increases,
          SUM(CASE WHEN new_price < old_price THEN 1 ELSE 0 END) as price_decreases,
          AVG(new_price - old_price) as avg_price_change,
          MAX(new_price - old_price) as max_price_change,
          MIN(new_price - old_price) as min_price_change
        FROM price_history
        WHERE 1=1
      `;
      const params: any[] = [];

      if (entityType) {
        sql += ' AND entity_type = ?';
        params.push(entityType);
      }

      if (startDate) {
        sql += ' AND changed_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        sql += ' AND changed_at <= ?';
        params.push(endDate);
      }

      const result = await query(sql, params);
      const row = result[0] || {};

      return {
        totalChanges: parseInt(row.total_changes) || 0,
        priceIncreases: parseInt(row.price_increases) || 0,
        priceDecreases: parseInt(row.price_decreases) || 0,
        avgPriceChange: parseFloat(row.avg_price_change) || 0,
        maxPriceChange: parseFloat(row.max_price_change) || 0,
        minPriceChange: parseFloat(row.min_price_change) || 0
      };
    } catch (error) {
      console.error('获取价格统计失败:', error);
      return {
        totalChanges: 0,
        priceIncreases: 0,
        priceDecreases: 0,
        avgPriceChange: 0,
        maxPriceChange: 0,
        minPriceChange: 0
      };
    }
  }

  /**
   * 获取计算统计信息
   * @param entityType 实体类型
   * @param days 统计天数
   * @returns 计算统计信息
   */
  static async getCalculationStatistics(
    entityType?: string,
    days: number = 30
  ): Promise<{
    totalCalculations: number;
    avgBasePrice: number;
    avgFinalPrice: number;
    avgDiscount: number;
    topRules: Array<{ rule: string; count: number }>;
  }> {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_calculations,
          AVG(base_price) as avg_base_price,
          AVG(final_price) as avg_final_price,
          AVG(final_price - base_price) as avg_discount
        FROM calculation_history
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `;
      const params: any[] = [days];

      if (entityType) {
        sql += ' AND entity_type = ?';
        params.push(entityType);
      }

      const result = await query(sql, params);
      const row = result[0] || {};

      // 获取最常用的规则
      let rulesQuery = `
        SELECT 
          applied_rule,
          COUNT(*) as rule_count
        FROM (
          SELECT 
            JSON_UNQUOTE(JSON_EXTRACT(applied_rules, CONCAT('$[', idx, ']'))) as applied_rule
          FROM calculation_history, 
               JSON_TABLE(JSON_ARRAY(0,1,2,3,4,5,6,7,8,9), '$[*]' COLUMNS (idx INT PATH '$')) as t
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND JSON_LENGTH(applied_rules) > idx
            ${entityType ? 'AND entity_type = ?' : ''}
        ) rules
        WHERE applied_rule IS NOT NULL AND applied_rule != 'null'
        GROUP BY applied_rule
        ORDER BY rule_count DESC
        LIMIT 5
      `;
      const rulesParams: any[] = [days];
      if (entityType) {
        rulesParams.push(entityType);
      }

      const rulesResult = await query(rulesQuery, rulesParams);
      const topRules = rulesResult.map(r => ({
        rule: r.applied_rule,
        count: parseInt(r.rule_count)
      }));

      return {
        totalCalculations: parseInt(row.total_calculations) || 0,
        avgBasePrice: parseFloat(row.avg_base_price) || 0,
        avgFinalPrice: parseFloat(row.avg_final_price) || 0,
        avgDiscount: parseFloat(row.avg_discount) || 0,
        topRules
      };
    } catch (error) {
      console.error('获取计算统计失败:', error);
      return {
        totalCalculations: 0,
        avgBasePrice: 0,
        avgFinalPrice: 0,
        avgDiscount: 0,
        topRules: []
      };
    }
  }
}
