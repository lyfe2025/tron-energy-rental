/**
 * 配置助手类
 * 负责价格计算器的配置管理和包信息获取
 */
import { query } from '../../../config/database.js';

export class ConfigHelper {
  /**
   * 获取包信息
   * @param packageId 包ID
   * @returns 包信息
   */
  static async getPackageInfo(packageId: string): Promise<{
    type: 'energy' | 'bandwidth',
    baseAmount: number
  } | null> {
    try {
      const result = await query(
        'SELECT type, min_quantity FROM energy_packages WHERE id = ?',
        [packageId]
      );
      
      if (result.length === 0) return null;
      
      return {
        type: result[0].type,
        baseAmount: parseInt(result[0].min_quantity) || 1000
      };
    } catch (error) {
      console.error('获取包信息失败:', error);
      return null;
    }
  }

  /**
   * 获取价格配置
   * @param configType 配置类型
   * @returns 价格配置
   */
  static async getPriceConfig(configType: string): Promise<any> {
    try {
      const result = await query(
        'SELECT config_value FROM price_configs WHERE config_type = ? AND is_active = 1',
        [configType]
      );
      
      if (result.length === 0) return null;
      
      return JSON.parse(result[0].config_value);
    } catch (error) {
      console.error('获取价格配置失败:', error);
      return null;
    }
  }

  /**
   * 获取默认计算选项
   * @returns 默认选项
   */
  static getDefaultCalculationOptions(): any {
    return {
      validateInput: true,
      includeHistory: true,
      enableCache: true,
      applyDiscounts: true,
      calculateTax: false
    };
  }

  /**
   * 获取折扣规则
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @returns 折扣规则数组
   */
  static async getDiscountRules(entityType?: string, entityId?: string): Promise<any[]> {
    try {
      let sql = 'SELECT * FROM discount_rules WHERE is_active = 1';
      const params: any[] = [];

      if (entityType) {
        sql += ' AND (entity_type = ? OR entity_type IS NULL)';
        params.push(entityType);
      }

      if (entityId) {
        sql += ' AND (entity_id = ? OR entity_id IS NULL)';
        params.push(entityId);
      }

      sql += ' ORDER BY priority DESC';

      const result = await query(sql, params);
      
      return result.map(rule => ({
        id: rule.id,
        name: rule.rule_name,
        type: rule.rule_type,
        value: parseFloat(rule.discount_value),
        condition: rule.condition_json ? JSON.parse(rule.condition_json) : null,
        priority: rule.priority,
        startDate: rule.start_date,
        endDate: rule.end_date
      }));
    } catch (error) {
      console.error('获取折扣规则失败:', error);
      return [];
    }
  }

  /**
   * 获取汇率信息
   * @param fromCurrency 源货币
   * @param toCurrency 目标货币
   * @returns 汇率
   */
  static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      const result = await query(
        'SELECT exchange_rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ? AND is_active = 1',
        [fromCurrency, toCurrency]
      );
      
      if (result.length === 0) return 1;
      
      return parseFloat(result[0].exchange_rate);
    } catch (error) {
      console.error('获取汇率失败:', error);
      return 1;
    }
  }

  /**
   * 获取费用配置
   * @param feeType 费用类型
   * @returns 费用配置
   */
  static async getFeeConfig(feeType: string): Promise<{
    type: 'fixed' | 'percentage',
    value: number,
    minAmount?: number,
    maxAmount?: number
  } | null> {
    try {
      const result = await query(
        'SELECT fee_type, fee_value, min_amount, max_amount FROM fee_configs WHERE fee_name = ? AND is_active = 1',
        [feeType]
      );
      
      if (result.length === 0) return null;
      
      const row = result[0];
      return {
        type: row.fee_type,
        value: parseFloat(row.fee_value),
        minAmount: row.min_amount ? parseFloat(row.min_amount) : undefined,
        maxAmount: row.max_amount ? parseFloat(row.max_amount) : undefined
      };
    } catch (error) {
      console.error('获取费用配置失败:', error);
      return null;
    }
  }

  /**
   * 检查是否启用缓存
   * @returns 是否启用缓存
   */
  static async isCacheEnabled(): Promise<boolean> {
    try {
      const config = await this.getPriceConfig('cache_settings');
      return config?.enabled === true;
    } catch (error) {
      console.error('检查缓存设置失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存TTL（秒）
   * @returns 缓存过期时间
   */
  static async getCacheTTL(): Promise<number> {
    try {
      const config = await this.getPriceConfig('cache_settings');
      return config?.ttl || 300; // 默认5分钟
    } catch (error) {
      console.error('获取缓存TTL失败:', error);
      return 300;
    }
  }
}
