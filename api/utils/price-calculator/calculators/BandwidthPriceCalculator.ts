/**
 * 带宽价格计算器
 * 专门处理带宽相关的价格计算和优化
 */
import { BandwidthCalculator } from '../core/BandwidthCalculator.js';
import type {
    CalculationInput,
    CalculationOptions,
    PriceCalculationResult
} from '../types/index.js';

export class BandwidthPriceCalculator {
  private static bandwidthCalculator = new BandwidthCalculator();

  /**
   * 计算带宽价格
   * @param input 计算输入参数
   * @param options 计算选项
   * @returns 价格计算结果
   */
  static async calculateBandwidthPrice(
    input: CalculationInput,
    options: CalculationOptions = {}
  ): Promise<PriceCalculationResult> {
    return this.bandwidthCalculator.calculateBandwidthPrice(input, options);
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

  /**
   * 计算带宽成本效益分析
   * @param dataSize 数据大小（字节）
   * @param timeRequirement 时间要求（小时）
   * @param qualityRequirement 质量要求（1-5）
   * @returns 成本效益分析
   */
  static async analyzeBandwidthCostEffectiveness(
    dataSize: number,
    timeRequirement: number,
    qualityRequirement: number = 3
  ): Promise<{
    recommendedPlan: string,
    estimatedCost: number,
    estimatedTime: number,
    alternatives: Array<{
      plan: string,
      cost: number,
      time: number,
      quality: number
    }>
  }> {
    const suggestions: string[] = [];
    const alternatives: Array<{
      plan: string,
      cost: number,
      time: number,
      quality: number
    }> = [];

    try {
      // 基础方案计算
      const baseTransferCost = await this.calculateDataTransferCost(dataSize, 'bidirectional', 'normal');
      
      // 高优先级方案
      const highPriorityTransferCost = await this.calculateDataTransferCost(dataSize, 'bidirectional', 'high');
      
      // 紧急方案
      const urgentTransferCost = await this.calculateDataTransferCost(dataSize, 'bidirectional', 'urgent');

      alternatives.push(
        {
          plan: '标准方案',
          cost: baseTransferCost.cost,
          time: baseTransferCost.estimatedTime,
          quality: 3
        },
        {
          plan: '高优先级方案',
          cost: highPriorityTransferCost.cost,
          time: highPriorityTransferCost.estimatedTime,
          quality: 4
        },
        {
          plan: '紧急方案',
          cost: urgentTransferCost.cost,
          time: urgentTransferCost.estimatedTime,
          quality: 5
        }
      );

      // 根据要求推荐方案
      let recommendedPlan = '标准方案';
      let estimatedCost = baseTransferCost.cost;
      let estimatedTime = baseTransferCost.estimatedTime;

      if (timeRequirement <= estimatedTime * 0.5) {
        recommendedPlan = '紧急方案';
        estimatedCost = urgentTransferCost.cost;
        estimatedTime = urgentTransferCost.estimatedTime;
      } else if (timeRequirement <= estimatedTime * 0.8 || qualityRequirement >= 4) {
        recommendedPlan = '高优先级方案';
        estimatedCost = highPriorityTransferCost.cost;
        estimatedTime = highPriorityTransferCost.estimatedTime;
      }

      return {
        recommendedPlan,
        estimatedCost,
        estimatedTime,
        alternatives
      };
    } catch (error) {
      console.error('带宽成本效益分析失败:', error);
      return {
        recommendedPlan: '标准方案',
        estimatedCost: dataSize * 0.0001, // 默认估算
        estimatedTime: Math.ceil(dataSize / (1024 * 1024)), // 默认估算（分钟）
        alternatives: []
      };
    }
  }

  /**
   * 预测带宽价格趋势
   * @param packageId 包ID（可选）
   * @param hours 预测小时数
   * @returns 价格预测数组
   */
  static async predictBandwidthPriceTrend(
    packageId?: string,
    hours: number = 24
  ): Promise<Array<{hour: number, predictedPrice: number, confidence: number}>> {
    // 简单的价格趋势预测（可以根据实际需求实现更复杂的算法）
    const predictions: Array<{hour: number, predictedPrice: number, confidence: number}> = [];
    
    try {
      // 获取历史价格作为基础
      const history = await this.getBandwidthPriceHistory(packageId, 7);
      const basePrice = history.length > 0 ? 
        history.reduce((sum, h) => sum + h.price, 0) / history.length : 
        0.001;

      // 生成预测数据
      for (let i = 0; i < hours; i++) {
        // 简单的周期性变化模拟
        const hourOfDay = (new Date().getHours() + i) % 24;
        const cycleFactor = 1 + 0.1 * Math.sin((hourOfDay / 24) * 2 * Math.PI);
        const randomFactor = 1 + (Math.random() - 0.5) * 0.1;
        
        predictions.push({
          hour: i,
          predictedPrice: basePrice * cycleFactor * randomFactor,
          confidence: Math.max(0.6, 1 - (i / hours) * 0.4) // 预测置信度随时间递减
        });
      }
    } catch (error) {
      console.error('预测带宽价格趋势失败:', error);
    }

    return predictions;
  }
}
