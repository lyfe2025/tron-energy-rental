/**
 * 订单计算服务
 * 负责所有订单相关的计算逻辑
 */
import type { FlashRentConfig, OrderCalculationResult } from './types';

export class OrderCalculationService {
  /**
   * 计算可购买的笔数
   */
  calculateUnits(amount: number, config: FlashRentConfig): number {
    const pricePerUnit = config.single_price || config.price_per_unit || 0;
    const maxUnits = config.max_amount || config.max_units || 999;

    if (pricePerUnit <= 0) {
      return 0;
    }

    const calculatedUnits = Math.floor(amount / pricePerUnit);
    return Math.min(calculatedUnits, maxUnits);
  }

  /**
   * 计算总能量需求
   */
  calculateTotalEnergy(units: number, config: FlashRentConfig): number {
    // 从配置中获取单笔能量值，如果没有配置则使用默认值
    const energyPerUnit = config.energy_per_unit || 32000; // 默认32,000能量每笔
    return units * energyPerUnit;
  }

  /**
   * 验证计算结果
   */
  validateCalculationResult(
    trxAmount: number,
    calculatedUnits: number,
    totalEnergy: number
  ): OrderCalculationResult {
    if (calculatedUnits === 0) {
      return {
        calculatedUnits,
        totalEnergy,
        isValid: false,
        reason: `Insufficient payment amount: ${trxAmount} TRX`
      };
    }

    if (totalEnergy <= 0) {
      return {
        calculatedUnits,
        totalEnergy,
        isValid: false,
        reason: 'Invalid total energy calculated'
      };
    }

    return {
      calculatedUnits,
      totalEnergy,
      isValid: true
    };
  }

  /**
   * 计算订单价格
   */
  calculateOrderPrice(calculatedUnits: number, config: FlashRentConfig): number {
    const pricePerUnit = config.single_price || config.price_per_unit || 0;
    return calculatedUnits * pricePerUnit;
  }

  /**
   * 获取闪租持续时间（整数小时）
   */
  getFlashRentDuration(config: FlashRentConfig): number {
    return Math.round(config.expiry_hours || 6);
  }

  /**
   * 执行完整的订单计算
   */
  performFullCalculation(
    trxAmount: number,
    config: FlashRentConfig
  ): OrderCalculationResult & {
    orderPrice: number;
    duration: number;
  } {
    const calculatedUnits = this.calculateUnits(trxAmount, config);
    const totalEnergy = this.calculateTotalEnergy(calculatedUnits, config);
    const validation = this.validateCalculationResult(trxAmount, calculatedUnits, totalEnergy);

    const orderPrice = this.calculateOrderPrice(calculatedUnits, config);
    const duration = this.getFlashRentDuration(config);

    return {
      ...validation,
      orderPrice,
      duration
    };
  }
}
