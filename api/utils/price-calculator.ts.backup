/**
 * 价格计算和验证工具模块
 * 提供统一的价格计算、验证和历史记录功能
 */
import { query } from '../config/database.js';

// 价格计算结果接口
interface PriceCalculationResult {
  basePrice: number;
  finalPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  appliedRules: string[];
  calculationDetails: any;
}

// 价格验证结果接口
interface PriceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 价格历史记录接口
interface PriceHistoryRecord {
  id: string;
  entityType: 'bot' | 'agent' | 'package';
  entityId: string;
  oldPrice: number;
  newPrice: number;
  changeReason: string;
  changedBy: string;
  changedAt: Date;
}

/**
 * 价格计算器类
 */
export class PriceCalculator {
  /**
   * 计算价格（兼容性方法）
   * @param packageId 能量包ID
   * @param quantity 数量（默认为1）
   * @param botId 机器人ID（可选）
   * @param agentId 代理商ID（可选）
   * @returns 价格计算结果
   */
  static async calculatePrice(
    packageId: string,
    quantity: number = 1,
    botId?: string,
    agentId?: string
  ): Promise<PriceCalculationResult> {
    return this.calculatePackagePrice(packageId, botId, agentId, quantity);
  }

  /**
   * 计算能量包价格
   * @param packageId 能量包ID
   * @param botId 机器人ID（可选）
   * @param agentId 代理商ID（可选）
   * @param quantity 数量（默认为1）
   * @returns 价格计算结果
   */
  static async calculatePackagePrice(
    packageId: string,
    botId?: string,
    agentId?: string,
    quantity: number = 1
  ): Promise<PriceCalculationResult> {
    try {
      // 获取能量包基础信息
      const packageResult = await query(
        'SELECT * FROM energy_packages WHERE id = $1',
        [packageId]
      );
      
      if (packageResult.rows.length === 0) {
        throw new Error('能量包不存在');
      }
      
      const energyPackage = packageResult.rows[0];
      const basePrice = parseFloat(energyPackage.price_per_unit) * quantity;
      
      let finalPrice = basePrice;
      let discount = 0;
      let discountType: 'percentage' | 'fixed' = 'percentage';
      const appliedRules: string[] = [];
      const calculationDetails: any = {
        packageId,
        basePrice,
        quantity,
        pricePerUnit: energyPackage.price_per_unit
      };
      
      // 获取适用的价格配置
      let priceConfig = null;
      
      // 优先级：机器人配置 > 代理商配置 > 默认配置
      if (botId) {
        const botConfigResult = await query(
          `SELECT * FROM price_configs 
           WHERE config_type = 'bot' AND target_id = $1 AND is_active = true
           AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
           AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
           ORDER BY created_at DESC LIMIT 1`,
          [botId]
        );
        
        if (botConfigResult.rows.length > 0) {
          priceConfig = botConfigResult.rows[0];
          appliedRules.push(`机器人专用配置: ${priceConfig.config_name}`);
        }
      }
      
      if (!priceConfig && agentId) {
        const agentConfigResult = await query(
          `SELECT * FROM price_configs 
           WHERE config_type = 'agent' AND target_id = $1 AND is_active = true
           AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
           AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
           ORDER BY created_at DESC LIMIT 1`,
          [agentId]
        );
        
        if (agentConfigResult.rows.length > 0) {
          priceConfig = agentConfigResult.rows[0];
          appliedRules.push(`代理商专用配置: ${priceConfig.config_name}`);
        }
      }
      
      if (!priceConfig) {
        const defaultConfigResult = await query(
          `SELECT * FROM price_configs 
           WHERE config_type = 'default' AND is_active = true
           AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
           AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
           ORDER BY created_at DESC LIMIT 1`
        );
        
        if (defaultConfigResult.rows.length > 0) {
          priceConfig = defaultConfigResult.rows[0];
          appliedRules.push(`默认配置: ${priceConfig.config_name}`);
        }
      }
      
      // 应用价格配置
      if (priceConfig) {
        const priceData = JSON.parse(priceConfig.price_data);
        calculationDetails.appliedConfig = priceData;
        
        // 应用折扣规则
        if (priceData.discount) {
          if (priceData.discount.type === 'percentage') {
            discount = priceData.discount.value;
            discountType = 'percentage';
            finalPrice = basePrice * (1 - discount / 100);
            appliedRules.push(`百分比折扣: ${discount}%`);
          } else if (priceData.discount.type === 'fixed') {
            discount = priceData.discount.value;
            discountType = 'fixed';
            finalPrice = Math.max(0, basePrice - discount);
            appliedRules.push(`固定折扣: ${discount} TRX`);
          }
        }
        
        // 应用数量折扣
        if (priceData.quantityDiscount && quantity >= priceData.quantityDiscount.minQuantity) {
          const quantityDiscountRate = priceData.quantityDiscount.discountRate;
          finalPrice = finalPrice * (1 - quantityDiscountRate / 100);
          appliedRules.push(`数量折扣: ${quantityDiscountRate}% (数量 >= ${priceData.quantityDiscount.minQuantity})`);
        }
        
        // 应用最低价格限制
        if (priceData.minPrice && finalPrice < priceData.minPrice) {
          finalPrice = priceData.minPrice;
          appliedRules.push(`最低价格限制: ${priceData.minPrice} TRX`);
        }
        
        // 应用最高价格限制
        if (priceData.maxPrice && finalPrice > priceData.maxPrice) {
          finalPrice = priceData.maxPrice;
          appliedRules.push(`最高价格限制: ${priceData.maxPrice} TRX`);
        }
      }
      
      // 确保价格为正数
      finalPrice = Math.max(0, finalPrice);
      
      return {
        basePrice,
        finalPrice,
        discount,
        discountType,
        appliedRules,
        calculationDetails
      };
      
    } catch (error) {
      console.error('价格计算错误:', error);
      throw error;
    }
  }
  
  /**
   * 验证价格配置
   * @param priceData 价格配置数据
   * @returns 验证结果
   */
  static validatePriceConfig(priceData: any): PriceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 验证基本结构
    if (!priceData || typeof priceData !== 'object') {
      errors.push('价格配置数据必须是有效的对象');
      return { isValid: false, errors, warnings };
    }
    
    // 验证折扣配置
    if (priceData.discount) {
      const { type, value } = priceData.discount;
      
      if (!['percentage', 'fixed'].includes(type)) {
        errors.push('折扣类型必须是 percentage 或 fixed');
      }
      
      if (typeof value !== 'number' || value < 0) {
        errors.push('折扣值必须是非负数');
      }
      
      if (type === 'percentage' && value > 100) {
        warnings.push('百分比折扣超过100%，可能导致负价格');
      }
    }
    
    // 验证数量折扣
    if (priceData.quantityDiscount) {
      const { minQuantity, discountRate } = priceData.quantityDiscount;
      
      if (typeof minQuantity !== 'number' || minQuantity <= 0) {
        errors.push('最小数量必须是正数');
      }
      
      if (typeof discountRate !== 'number' || discountRate < 0 || discountRate > 100) {
        errors.push('数量折扣率必须在0-100之间');
      }
    }
    
    // 验证价格限制
    if (priceData.minPrice !== undefined) {
      if (typeof priceData.minPrice !== 'number' || priceData.minPrice < 0) {
        errors.push('最低价格必须是非负数');
      }
    }
    
    if (priceData.maxPrice !== undefined) {
      if (typeof priceData.maxPrice !== 'number' || priceData.maxPrice < 0) {
        errors.push('最高价格必须是非负数');
      }
      
      if (priceData.minPrice !== undefined && priceData.maxPrice < priceData.minPrice) {
        errors.push('最高价格不能低于最低价格');
      }
    }
    
    // 验证时间限制
    if (priceData.validFrom && priceData.validUntil) {
      const validFrom = new Date(priceData.validFrom);
      const validUntil = new Date(priceData.validUntil);
      
      if (validUntil <= validFrom) {
        errors.push('结束时间必须晚于开始时间');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * 记录价格变更历史
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param oldPrice 旧价格
   * @param newPrice 新价格
   * @param changeReason 变更原因
   * @param changedBy 变更人ID
   */
  static async recordPriceHistory(
    entityType: 'bot' | 'agent' | 'package',
    entityId: string,
    oldPrice: number,
    newPrice: number,
    changeReason: string,
    changedBy: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO price_history (
          entity_type, entity_id, old_price, new_price, 
          change_reason, changed_by, changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [entityType, entityId, oldPrice, newPrice, changeReason, changedBy]
      );
    } catch (error) {
      console.error('记录价格历史错误:', error);
      throw error;
    }
  }
  
  /**
   * 获取价格历史记录
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param limit 限制数量
   * @returns 价格历史记录列表
   */
  static async getPriceHistory(
    entityType?: 'bot' | 'agent' | 'package',
    entityId?: string,
    limit: number = 50
  ): Promise<PriceHistoryRecord[]> {
    try {
      const whereConditions = [];
      const queryParams = [];
      let paramIndex = 1;
      
      if (entityType) {
        whereConditions.push(`ph.entity_type = $${paramIndex}`);
        queryParams.push(entityType);
        paramIndex++;
      }
      
      if (entityId) {
        whereConditions.push(`ph.entity_id = $${paramIndex}`);
        queryParams.push(entityId);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      queryParams.push(limit);
      
      const historyResult = await query(
        `SELECT 
          ph.*,
          u.username as changed_by_name
        FROM price_history ph
        LEFT JOIN users u ON ph.changed_by = u.id
        ${whereClause}
        ORDER BY ph.changed_at DESC
        LIMIT $${paramIndex}`,
        queryParams
      );
      
      return historyResult.rows;
      
    } catch (error) {
      console.error('获取价格历史错误:', error);
      throw error;
    }
  }
  
  /**
   * 批量计算价格
   * @param calculations 计算请求列表
   * @returns 批量计算结果
   */
  static async batchCalculatePrice(
    calculations: Array<{
      packageId: string;
      botId?: string;
      agentId?: string;
      quantity?: number;
    }>
  ): Promise<PriceCalculationResult[]> {
    const results: PriceCalculationResult[] = [];
    
    for (const calc of calculations) {
      try {
        const result = await this.calculatePackagePrice(
          calc.packageId,
          calc.botId,
          calc.agentId,
          calc.quantity
        );
        results.push(result);
      } catch (error) {
        // 对于单个计算失败，记录错误但继续处理其他项
        console.error(`批量计算价格失败 - 包ID: ${calc.packageId}`, error);
        results.push({
          basePrice: 0,
          finalPrice: 0,
          discount: 0,
          discountType: 'percentage',
          appliedRules: [`计算失败: ${error.message}`],
          calculationDetails: { error: error.message }
        });
      }
    }
    
    return results;
  }
  
  /**
   * 获取价格统计信息
   * @param entityType 实体类型
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 价格统计信息
   */
  static async getPriceStatistics(
    entityType?: 'bot' | 'agent' | 'package',
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      const whereConditions = [];
      const queryParams = [];
      let paramIndex = 1;
      
      if (entityType) {
        whereConditions.push(`entity_type = $${paramIndex}`);
        queryParams.push(entityType);
        paramIndex++;
      }
      
      if (startDate) {
        whereConditions.push(`changed_at >= $${paramIndex}`);
        queryParams.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        whereConditions.push(`changed_at <= $${paramIndex}`);
        queryParams.push(endDate);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const statsResult = await query(
        `SELECT 
          entity_type,
          COUNT(*) as total_changes,
          AVG(new_price - old_price) as avg_price_change,
          MIN(new_price) as min_price,
          MAX(new_price) as max_price,
          SUM(CASE WHEN new_price > old_price THEN 1 ELSE 0 END) as price_increases,
          SUM(CASE WHEN new_price < old_price THEN 1 ELSE 0 END) as price_decreases
        FROM price_history
        ${whereClause}
        GROUP BY entity_type
        ORDER BY entity_type`,
        queryParams
      );
      
      return statsResult.rows;
      
    } catch (error) {
      console.error('获取价格统计错误:', error);
      throw error;
    }
  }
}

export default PriceCalculator;