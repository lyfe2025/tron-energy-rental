/**
 * 能量价格计算器
 * 专门处理TRON能量相关的价格计算
 */
import { query } from '../../../config/database.js';
import type {
    BotInfo,
    CalculationInput,
    CalculationOptions,
    PackageInfo,
    PriceCalculationResult
} from '../types/index.js';
import { BaseCalculator } from './BaseCalculator.js';

export class EnergyCalculator extends BaseCalculator {
  
  /**
   * 计算能量价格
   */
  async calculateEnergyPrice(
    input: CalculationInput,
    options: CalculationOptions = {}
  ): Promise<PriceCalculationResult> {
    // 验证输入
    const validationErrors = this.validateEnergyInput(input);
    if (validationErrors.length > 0) {
      throw new Error(`输入验证失败: ${validationErrors.join(', ')}`);
    }

    // 获取能量包信息
    const packageInfo = await this.getEnergyPackageInfo(input.packageId);
    
    // 获取机器人信息（如果指定）
    const botInfo = input.botId ? await this.getBotInfo(input.botId) : null;
    
    // 执行基础计算
    const result = await this.performCalculation(input, options);
    
    // 添加能量特定的计算详情
    result.calculationDetails.packageInfo = packageInfo;
    result.calculationDetails.botInfo = botInfo;
    
    // 应用能量特定的调整
    return this.applyEnergySpecificAdjustments(result, input, packageInfo, botInfo);
  }

  /**
   * 验证能量计算输入
   */
  private validateEnergyInput(input: CalculationInput): string[] {
    const errors = this.validateInput(input);
    
    if (input.type !== 'energy') {
      errors.push('计算类型必须是energy');
    }
    
    if (input.amount < 100) {
      errors.push('能量数量不能少于100');
    }
    
    if (input.amount > 1000000) {
      errors.push('能量数量不能超过1,000,000');
    }
    
    return errors;
  }

  /**
   * 获取能量包信息
   */
  private async getEnergyPackageInfo(packageId?: string): Promise<PackageInfo | null> {
    if (!packageId) return null;
    
    try {
      const result = await query(`
        SELECT 
          id,
          name,
          type,
          base_price,
          min_quantity,
          max_quantity,
          currency,
          description
        FROM energy_packages 
        WHERE id = ? AND status = 'active' AND type = 'energy'
      `, [packageId]);
      
      if (result.length === 0) return null;
      
      const pkg = result[0];
      return {
        id: pkg.id,
        name: pkg.name,
        type: pkg.type,
        basePrice: parseFloat(pkg.base_price),
        minQuantity: parseInt(pkg.min_quantity),
        maxQuantity: parseInt(pkg.max_quantity),
        currency: pkg.currency
      };
    } catch (error) {
      console.error('获取能量包信息失败:', error);
      return null;
    }
  }

  /**
   * 获取机器人信息
   */
  private async getBotInfo(botId: string): Promise<BotInfo | null> {
    try {
      const result = await query(`
        SELECT 
          id,
          name,
          type,
          price_multiplier,
          status
        FROM bots 
        WHERE id = ? AND status = 'active'
      `, [botId]);
      
      if (result.length === 0) return null;
      
      const bot = result[0];
      return {
        id: bot.id,
        name: bot.name,
        type: bot.type,
        multiplier: parseFloat(bot.price_multiplier) || 1.0,
        isActive: bot.status === 'active'
      };
    } catch (error) {
      console.error('获取机器人信息失败:', error);
      return null;
    }
  }

  /**
   * 应用能量特定的价格调整
   */
  private async applyEnergySpecificAdjustments(
    result: PriceCalculationResult,
    input: CalculationInput,
    packageInfo: PackageInfo | null,
    botInfo: BotInfo | null
  ): Promise<PriceCalculationResult> {
    let adjustedPrice = result.finalPrice;
    const adjustments: string[] = [];

    // 机器人价格倍数调整
    if (botInfo && botInfo.multiplier !== 1.0) {
      const adjustment = adjustedPrice * (botInfo.multiplier - 1);
      adjustedPrice += adjustment;
      adjustments.push(`机器人${botInfo.name}价格调整: ${botInfo.multiplier}x`);
    }

    // 能量网络拥堵调整
    const congestionMultiplier = await this.getNetworkCongestionMultiplier();
    if (congestionMultiplier !== 1.0) {
      const adjustment = adjustedPrice * (congestionMultiplier - 1);
      adjustedPrice += adjustment;
      adjustments.push(`网络拥堵调整: ${congestionMultiplier}x`);
    }

    // 时间段价格调整
    const timeMultiplier = this.getTimeBasedMultiplier();
    if (timeMultiplier !== 1.0) {
      const adjustment = adjustedPrice * (timeMultiplier - 1);
      adjustedPrice += adjustment;
      adjustments.push(`时间段调整: ${timeMultiplier}x`);
    }

    // 更新结果
    if (adjustments.length > 0) {
      result.finalPrice = this.roundPrice(adjustedPrice);
      result.appliedRules.push(...adjustments);
      
      // 更新计算详情
      if (result.calculationDetails.breakdown) {
        result.calculationDetails.breakdown.total = result.finalPrice;
      }
    }

    return result;
  }

  /**
   * 获取网络拥堵倍数
   */
  private async getNetworkCongestionMultiplier(): Promise<number> {
    try {
      // 这里可以调用TRON网络API获取实时拥堵情况
      // 目前返回模拟数据
      const currentHour = new Date().getHours();
      
      // 高峰时段（9-12, 14-18）价格上浮
      if ((currentHour >= 9 && currentHour <= 12) || 
          (currentHour >= 14 && currentHour <= 18)) {
        return 1.1; // 上浮10%
      }
      
      // 深夜时段（23-6）价格下浮
      if (currentHour >= 23 || currentHour <= 6) {
        return 0.9; // 下浮10%
      }
      
      return 1.0; // 正常价格
    } catch (error) {
      console.error('获取网络拥堵情况失败:', error);
      return 1.0;
    }
  }

  /**
   * 获取基于时间的价格倍数
   */
  private getTimeBasedMultiplier(): number {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // 周末价格调整
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 0.95; // 周末优惠5%
    }
    
    // 深夜优惠
    if (hour >= 2 && hour <= 6) {
      return 0.9; // 深夜优惠10%
    }
    
    // 高峰时段
    if (hour >= 9 && hour <= 11) {
      return 1.05; // 上午高峰加价5%
    }
    
    if (hour >= 14 && hour <= 16) {
      return 1.05; // 下午高峰加价5%
    }
    
    return 1.0;
  }

  /**
   * 获取能量价格历史
   */
  async getEnergyPriceHistory(
    packageId?: string,
    days: number = 30
  ): Promise<Array<{date: string, price: number}>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      let sql = `
        SELECT 
          DATE(created_at) as date,
          AVG(final_price / quantity) as avg_price
        FROM price_history 
        WHERE entity_type = 'energy'
          AND created_at >= ?
      `;
      const params: any[] = [startDate];
      
      if (packageId) {
        sql += ' AND entity_id = ?';
        params.push(packageId);
      }
      
      sql += `
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      
      const result = await query(sql, params);
      
      return result.map(row => ({
        date: row.date,
        price: parseFloat(row.avg_price)
      }));
    } catch (error) {
      console.error('获取能量价格历史失败:', error);
      return [];
    }
  }

  /**
   * 预测能量价格趋势
   */
  async predictEnergyPriceTrend(
    packageId?: string,
    hours: number = 24
  ): Promise<Array<{hour: number, predictedPrice: number, confidence: number}>> {
    try {
      // 获取历史数据
      const history = await this.getEnergyPriceHistory(packageId, 7);
      
      if (history.length === 0) {
        return [];
      }
      
      // 简单的价格预测算法（移动平均）
      const predictions: Array<{hour: number, predictedPrice: number, confidence: number}> = [];
      const avgPrice = history.reduce((sum, h) => sum + h.price, 0) / history.length;
      
      for (let i = 0; i < hours; i++) {
        const hour = (new Date().getHours() + i) % 24;
        const timeMultiplier = this.getTimeBasedMultiplierForHour(hour);
        const congestionMultiplier = this.getCongestionMultiplierForHour(hour);
        
        const predictedPrice = avgPrice * timeMultiplier * congestionMultiplier;
        const confidence = Math.max(0.6, 1 - (i * 0.02)); // 置信度随时间递减
        
        predictions.push({
          hour,
          predictedPrice: this.roundPrice(predictedPrice),
          confidence: Math.round(confidence * 100) / 100
        });
      }
      
      return predictions;
    } catch (error) {
      console.error('预测能量价格趋势失败:', error);
      return [];
    }
  }

  /**
   * 获取特定小时的时间倍数
   */
  private getTimeBasedMultiplierForHour(hour: number): number {
    if (hour >= 2 && hour <= 6) return 0.9;
    if (hour >= 9 && hour <= 11) return 1.05;
    if (hour >= 14 && hour <= 16) return 1.05;
    return 1.0;
  }

  /**
   * 获取特定小时的拥堵倍数
   */
  private getCongestionMultiplierForHour(hour: number): number {
    if ((hour >= 9 && hour <= 12) || (hour >= 14 && hour <= 18)) return 1.1;
    if (hour >= 23 || hour <= 6) return 0.9;
    return 1.0;
  }
}
