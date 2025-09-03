/**
 * 主价格计算器类
 * 整合所有计算器模块，提供统一的API接口
 */
import type {
    CalculationInput,
    CalculationOptions,
    HistoryQueryOptions,
    PriceCalculationResult,
    PriceHistoryRecord,
    PriceValidationResult
} from './types/index.js';

// 导入管理器
import { HistoryManager } from './managers/HistoryManager.js';
import { StatsManager } from './managers/StatsManager.js';
import { ValidationManager } from './managers/ValidationManager.js';

// 导入计算器
import { BandwidthPriceCalculator } from './calculators/BandwidthPriceCalculator.js';
import { EnergyPriceCalculator } from './calculators/EnergyPriceCalculator.js';

// 导入工具类
import { ConfigHelper } from './utils/ConfigHelper.js';
import { FormatHelper } from './utils/FormatHelper.js';

/**
 * 主价格计算器类
 * 提供统一的价格计算、验证和历史记录功能
 */
export class PriceCalculator {
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
    const packageInfo = await ConfigHelper.getPackageInfo(packageId);
    
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
    // 合并默认选项
    const mergedOptions = {
      ...ConfigHelper.getDefaultCalculationOptions(),
      ...options
    };

    // 输入验证
    if (mergedOptions.validateInput !== false) {
      const validation = await ValidationManager.validateInput(input);
      if (!validation.isValid) {
        throw new Error(`输入验证失败: ${validation.errors.join(', ')}`);
      }
    }

    let result: PriceCalculationResult;

    // 根据类型选择计算器
    switch (input.type) {
      case 'energy':
        result = await EnergyPriceCalculator.calculateEnergyPrice(input, mergedOptions);
        break;
      case 'bandwidth':
        result = await BandwidthPriceCalculator.calculateBandwidthPrice(input, mergedOptions);
        break;
      default:
        throw new Error(`不支持的资源类型: ${input.type}`);
    }

    // 结果验证
    const resultValidation = await ValidationManager.validateResult(result, input);
    if (!resultValidation.isValid) {
      console.warn('价格计算结果验证失败:', resultValidation.errors);
    }

    // 保存计算历史
    if (mergedOptions.includeHistory !== false) {
      await HistoryManager.saveCalculationHistory(input, result);
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
    return ValidationManager.validateInput(input, options);
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
    return ValidationManager.validateResult(result, input);
  }

  /**
   * 获取价格历史记录
   * @param entityTypeOrOptions 实体类型或查询选项
   * @param entityId 实体ID（可选）
   * @param limit 限制数量（可选）
   * @returns 历史记录数组
   */
  static async getPriceHistory(
    entityTypeOrOptions?: string | HistoryQueryOptions,
    entityId?: string,
    limit?: number
  ): Promise<PriceHistoryRecord[]> {
    return HistoryManager.getPriceHistory(entityTypeOrOptions, entityId, limit);
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
    return HistoryManager.savePriceHistory(oldPrice, newPrice, entityType, entityId, changeReason, changedBy, metadata);
  }

  /**
   * 记录价格历史（兼容性方法）
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param oldPrice 旧价格
   * @param newPrice 新价格
   * @param reason 变更原因
   * @param userId 用户ID
   */
  static async recordPriceHistory(
    entityType: string,
    entityId: string,
    oldPrice: number,
    newPrice: number,
    reason: string,
    userId: string
  ): Promise<void> {
    return HistoryManager.recordPriceHistory(entityType, entityId, oldPrice, newPrice, reason, userId);
  }

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
    return StatsManager.getPriceStatistics(entityType, startDate, endDate);
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

  // 能量相关的便捷方法
  
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
    return EnergyPriceCalculator.getEnergyPriceHistory(packageId, days);
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
    return EnergyPriceCalculator.predictEnergyPriceTrend(packageId, hours);
  }

  // 带宽相关的便捷方法

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
    return BandwidthPriceCalculator.getBandwidthPriceHistory(packageId, days);
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
    return BandwidthPriceCalculator.calculateDataTransferCost(dataSize, transferType, priority);
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
    return BandwidthPriceCalculator.getBandwidthOptimizationSuggestions(plannedDataSize, budget);
  }

  // 工具方法

  /**
   * 格式化价格
   * @param price 价格
   * @param currency 货币
   * @param decimals 小数位数
   * @returns 格式化后的价格字符串
   */
  static formatPrice(price: number, currency: string = 'TRX', decimals: number = 6): string {
    return FormatHelper.formatPrice(price, currency, decimals);
  }

  /**
   * 格式化计算摘要
   * @param basePrice 基础价格
   * @param finalPrice 最终价格
   * @param appliedRules 应用的规则
   * @param currency 货币
   * @returns 格式化后的计算摘要
   */
  static formatCalculationSummary(
    basePrice: number,
    finalPrice: number,
    appliedRules: string[],
    currency: string = 'TRX'
  ): string {
    return FormatHelper.formatCalculationSummary(basePrice, finalPrice, appliedRules, currency);
  }
}
