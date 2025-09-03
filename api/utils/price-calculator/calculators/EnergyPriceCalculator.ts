/**
 * 能量价格计算器
 * 专门处理能量相关的价格计算和预测
 */
import { EnergyCalculator } from '../core/EnergyCalculator.js';
import type {
    CalculationInput,
    CalculationOptions,
    PriceCalculationResult
} from '../types/index.js';

export class EnergyPriceCalculator {
  private static energyCalculator = new EnergyCalculator();

  /**
   * 计算能量价格
   * @param input 计算输入参数
   * @param options 计算选项
   * @returns 价格计算结果
   */
  static async calculateEnergyPrice(
    input: CalculationInput,
    options: CalculationOptions = {}
  ): Promise<PriceCalculationResult> {
    return this.energyCalculator.calculateEnergyPrice(input, options);
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
   * 计算能量成本优化建议
   * @param plannedEnergyAmount 计划的能量数量
   * @param budget 预算
   * @param durationHours 持续时间（小时）
   * @returns 优化建议
   */
  static async getEnergyOptimizationSuggestions(
    plannedEnergyAmount: number,
    budget: number,
    durationHours: number = 24
  ): Promise<{
    suggestions: string[],
    alternativeOptions: Array<{
      energyAmount: number,
      duration: number,
      cost: number,
      savingsPercentage: number
    }>
  }> {
    const suggestions: string[] = [];
    const alternativeOptions: Array<{
      energyAmount: number,
      duration: number,
      cost: number,
      savingsPercentage: number
    }> = [];

    try {
      // 获取当前价格趋势
      const priceTrend = await this.predictEnergyPriceTrend(undefined, Math.max(durationHours, 24));
      
      // 计算基础成本
      const baseCost = await this.calculateBaseCost(plannedEnergyAmount, durationHours);
      
      if (baseCost > budget) {
        suggestions.push('当前预算不足，建议考虑以下方案：');
        
        // 推荐减少能量数量的方案
        const reducedEnergyAmount = Math.floor((plannedEnergyAmount * budget) / baseCost);
        if (reducedEnergyAmount > 0) {
          const reducedCost = await this.calculateBaseCost(reducedEnergyAmount, durationHours);
          alternativeOptions.push({
            energyAmount: reducedEnergyAmount,
            duration: durationHours,
            cost: reducedCost,
            savingsPercentage: ((baseCost - reducedCost) / baseCost) * 100
          });
          suggestions.push(`减少能量数量到 ${reducedEnergyAmount}，可以在预算内完成`);
        }
        
        // 推荐缩短持续时间的方案
        const reducedDuration = Math.floor((durationHours * budget) / baseCost);
        if (reducedDuration > 0) {
          const reducedCost = await this.calculateBaseCost(plannedEnergyAmount, reducedDuration);
          alternativeOptions.push({
            energyAmount: plannedEnergyAmount,
            duration: reducedDuration,
            cost: reducedCost,
            savingsPercentage: ((baseCost - reducedCost) / baseCost) * 100
          });
          suggestions.push(`缩短持续时间到 ${reducedDuration} 小时，可以在预算内完成`);
        }
      } else {
        suggestions.push('当前配置在预算范围内');
        
        // 寻找更优价格时段
        const lowPriceHours = priceTrend
          .filter(p => p.predictedPrice < priceTrend[0].predictedPrice * 0.9)
          .slice(0, 3);
          
        if (lowPriceHours.length > 0) {
          suggestions.push('建议在以下时段执行以获得更优价格：');
          lowPriceHours.forEach(hour => {
            suggestions.push(`第 ${hour.hour} 小时，预期价格降低 ${((priceTrend[0].predictedPrice - hour.predictedPrice) / priceTrend[0].predictedPrice * 100).toFixed(1)}%`);
          });
        }
      }
      
      // 批量购买建议
      if (budget > baseCost * 1.5) {
        const batchAmount = plannedEnergyAmount * 2;
        const batchCost = await this.calculateBaseCost(batchAmount, durationHours);
        if (batchCost <= budget) {
          alternativeOptions.push({
            energyAmount: batchAmount,
            duration: durationHours,
            cost: batchCost,
            savingsPercentage: ((batchCost / batchAmount - baseCost / plannedEnergyAmount) / (baseCost / plannedEnergyAmount)) * 100
          });
          suggestions.push('预算充足，建议批量购买以获得更优单价');
        }
      }
      
    } catch (error) {
      console.error('生成能量优化建议失败:', error);
      suggestions.push('暂时无法生成优化建议，请稍后重试');
    }

    return { suggestions, alternativeOptions };
  }

  /**
   * 计算基础成本（辅助方法）
   * @param energyAmount 能量数量
   * @param durationHours 持续时间
   * @returns 基础成本
   */
  private static async calculateBaseCost(energyAmount: number, durationHours: number): Promise<number> {
    try {
      const input: CalculationInput = {
        packageId: 'default',
        quantity: 1,
        type: 'energy',
        amount: energyAmount
      };
      
      const result = await this.calculateEnergyPrice(input);
      return result.finalPrice * (durationHours / 24); // 按天计算转换为按小时
    } catch (error) {
      console.error('计算基础成本失败:', error);
      return energyAmount * 0.001; // 默认估算
    }
  }
}
