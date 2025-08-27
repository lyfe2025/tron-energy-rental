/**
 * 价格计算器主入口文件
 * 整合所有计算器模块，提供统一的API接口
 */
import { query } from '../../config/database.js';
import { BandwidthCalculator } from './core/BandwidthCalculator.js';
import { BaseCalculator } from './core/BaseCalculator.js';
import { EnergyCalculator } from './core/EnergyCalculator.js';
import type {
    CalculationInput,
    CalculationOptions,
    HistoryQueryOptions,
    PriceCalculationResult,
    PriceHistoryRecord,
    PriceValidationResult
} from './types/index.js';
import { PriceValidator } from './validators/PriceValidator.js';

/**
 * 主价格计算器类
 * 提供统一的价格计算、验证和历史记录功能
 */
export class PriceCalculator {
  private static energyCalculator = new EnergyCalculator();
  private static bandwidthCalculator = new BandwidthCalculator();
  private static validator = new PriceValidator();

  /**
   * 计算价格（主要API，兼容原有接口）
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
    // 获取包信息以确定类型
    const packageInfo = await this.getPackageInfo(packageId);
    
    const input: CalculationInput = {
      packageId,
      quantity,
      botId,
      agentId,
      type: packageInfo?.type || 'energy',
      amount: packageInfo?.baseAmount || 1000
    };

    return this.calculatePriceAdvanced(input);
  }

  /**
   * 高级价格计算（新API）
   * @param input 计算输入参数
   * @param options 计算选项
   * @returns 价格计算结果
   */
  static async calculatePriceAdvanced(
    input: CalculationInput,
    options: CalculationOptions = {}
  ): Promise<PriceCalculationResult> {
    // 输入验证
    if (options.validateInput !== false) {
      const validation = await this.validator.validateInput(input);
      if (!validation.isValid) {
        throw new Error(`输入验证失败: ${validation.errors.join(', ')}`);
      }
    }

    let result: PriceCalculationResult;

    // 根据类型选择计算器
    switch (input.type) {
      case 'energy':
        result = await this.energyCalculator.calculateEnergyPrice(input, options);
        break;
      case 'bandwidth':
        result = await this.bandwidthCalculator.calculateBandwidthPrice(input, options);
        break;
      default:
        throw new Error(`不支持的资源类型: ${input.type}`);
    }

    // 结果验证
    const resultValidation = await this.validator.validateResult(result, input);
    if (!resultValidation.isValid) {
      console.warn('价格计算结果验证失败:', resultValidation.errors);
    }

    // 保存计算历史
    if (options.includeHistory !== false) {
      await this.saveCalculationHistory(input, result);
    }

    return result;
  }

  /**
   * 验证价格计算输入
   * @param input 计算输入
   * @param options 验证选项
   * @returns 验证结果
   */
  static async validateInput(
    input: CalculationInput,
    options = {}
  ): Promise<PriceValidationResult> {
    return this.validator.validateInput(input, options);
  }

  /**
   * 验证价格计算结果
   * @param result 计算结果
   * @param input 计算输入
   * @returns 验证结果
   */
  static async validateResult(
    result: PriceCalculationResult,
    input: CalculationInput
  ): Promise<PriceValidationResult> {
    return this.validator.validateResult(result, input);
  }

  /**
   * 获取价格历史记录
   * @param options 查询选项
   * @returns 历史记录数组
   */
  static async getPriceHistory(
    options: HistoryQueryOptions = {}
  ): Promise<PriceHistoryRecord[]> {
    try {
      let sql = `
        SELECT 
          id,
          entity_type,
          entity_id,
          old_price,
          new_price,
          change_reason,
          changed_by,
          changed_at,
          metadata
        FROM price_history
        WHERE 1=1
      `;
      const params: any[] = [];

      // 添加筛选条件
      if (options.entityType) {
        sql += ' AND entity_type = ?';
        params.push(options.entityType);
      }

      if (options.entityId) {
        sql += ' AND entity_id = ?';
        params.push(options.entityId);
      }

      if (options.dateRange) {
        sql += ' AND changed_at BETWEEN ? AND ?';
        params.push(options.dateRange.start, options.dateRange.end);
      }

      // 排序
      const orderBy = options.orderBy || 'changed_at';
      const orderDirection = options.orderDirection || 'desc';
      sql += ` ORDER BY ${orderBy} ${orderDirection}`;

      // 分页
      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
        
        if (options.offset) {
          sql += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const result = await query(sql, params);
      
      return result.map(row => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        oldPrice: parseFloat(row.old_price),
        newPrice: parseFloat(row.new_price),
        changeReason: row.change_reason,
        changedBy: row.changed_by,
        changedAt: new Date(row.changed_at),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      console.error('获取价格历史失败:', error);
      return [];
    }
  }

  /**
   * 保存价格历史记录
   * @param oldPrice 旧价格
   * @param newPrice 新价格
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param changeReason 变更原因
   * @param changedBy 操作人
   * @param metadata 元数据
   */
  static async savePriceHistory(
    oldPrice: number,
    newPrice: number,
    entityType: string,
    entityId: string,
    changeReason: string,
    changedBy: string,
    metadata?: any
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO price_history (
          entity_type,
          entity_id,
          old_price,
          new_price,
          change_reason,
          changed_by,
          changed_at,
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
      `, [
        entityType,
        entityId,
        oldPrice,
        newPrice,
        changeReason,
        changedBy,
        metadata ? JSON.stringify(metadata) : null
      ]);
    } catch (error) {
      console.error('保存价格历史失败:', error);
    }
  }

  /**
   * 批量价格计算
   * @param inputs 输入数组
   * @param options 计算选项
   * @returns 计算结果数组
   */
  static async batchCalculate(
    inputs: CalculationInput[],
    options: CalculationOptions = {}
  ): Promise<PriceCalculationResult[]> {
    const results: PriceCalculationResult[] = [];
    
    for (const input of inputs) {
      try {
        const result = await this.calculatePriceAdvanced(input, {
          ...options,
          includeHistory: false // 批量计算时不保存历史
        });
        results.push(result);
      } catch (error) {
        console.error('批量计算中的单个计算失败:', error);
        // 创建错误结果
        results.push({
          basePrice: 0,
          finalPrice: 0,
          discount: 0,
          discountType: 'fixed',
          appliedRules: [`计算失败: ${error}`],
          calculationDetails: {
            breakdown: {
              baseAmount: 0,
              quantity: input.quantity,
              subtotal: 0,
              discountAmount: 0,
              feeAmount: 0,
              taxAmount: 0,
              total: 0
            }
          }
        });
      }
    }
    
    return results;
  }

  /**
   * 获取能量价格历史和趋势
   * @param packageId 包ID（可选）
   * @param days 天数
   * @returns 价格历史数组
   */
  static async getEnergyPriceHistory(
    packageId?: string,
    days: number = 30
  ): Promise<Array<{date: string, price: number}>> {
    return this.energyCalculator.getEnergyPriceHistory(packageId, days);
  }

  /**
   * 预测能量价格趋势
   * @param packageId 包ID（可选）
   * @param hours 预测小时数
   * @returns 价格预测数组
   */
  static async predictEnergyPriceTrend(
    packageId?: string,
    hours: number = 24
  ): Promise<Array<{hour: number, predictedPrice: number, confidence: number}>> {
    return this.energyCalculator.predictEnergyPriceTrend(packageId, hours);
  }

  /**
   * 获取带宽价格历史
   * @param packageId 包ID（可选）
   * @param days 天数
   * @returns 价格历史数组
   */
  static async getBandwidthPriceHistory(
    packageId?: string,
    days: number = 30
  ): Promise<Array<{date: string, price: number}>> {
    return this.bandwidthCalculator.getBandwidthPriceHistory(packageId, days);
  }

  /**
   * 计算数据传输成本
   * @param dataSize 数据大小（字节）
   * @param transferType 传输类型
   * @param priority 优先级
   * @returns 传输成本分析
   */
  static async calculateDataTransferCost(
    dataSize: number,
    transferType: 'upload' | 'download' | 'bidirectional' = 'bidirectional',
    priority: 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<{
    cost: number,
    estimatedTime: number,
    recommendations: string[]
  }> {
    return this.bandwidthCalculator.calculateDataTransferCost(dataSize, transferType, priority);
  }

  /**
   * 获取带宽使用优化建议
   * @param plannedDataSize 计划数据大小
   * @param budget 预算
   * @returns 优化建议
   */
  static async getBandwidthOptimizationSuggestions(
    plannedDataSize: number,
    budget: number
  ): Promise<{
    suggestions: string[],
    alternativeOptions: Array<{
      dataSize: number,
      cost: number,
      savingsPercentage: number
    }>
  }> {
    return this.bandwidthCalculator.getOptimizationSuggestions(plannedDataSize, budget);
  }

  // 私有辅助方法

  /**
   * 获取包信息
   */
  private static async getPackageInfo(packageId: string): Promise<{
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
   * 保存计算历史
   */
  private static async saveCalculationHistory(
    input: CalculationInput,
    result: PriceCalculationResult
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO calculation_history (
          entity_type,
          entity_id,
          input_data,
          base_price,
          final_price,
          applied_rules,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        input.type,
        input.packageId || 'default',
        JSON.stringify(input),
        result.basePrice,
        result.finalPrice,
        JSON.stringify(result.appliedRules)
      ]);
    } catch (error) {
      console.error('保存计算历史失败:', error);
    }
  }
}

// 导出类型定义
export type {
    CalculationInput,
    CalculationOptions, HistoryQueryOptions, PriceCalculationResult, PriceHistoryRecord, PriceValidationResult
} from './types/index.js';

// 导出子模块（供高级用户使用）
export {
    BandwidthCalculator, BaseCalculator,
    EnergyCalculator, PriceValidator
};

// 兼容性导出（保持与原有代码的兼容性）
export default PriceCalculator;
