/**
 * 订单计算服务
 * 负责所有订单相关的计算逻辑
 */
import { query } from '../../database/index.js';
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
  async calculateTotalEnergy(units: number, config: FlashRentConfig): Promise<number> {
    // 始终使用系统配置表的动态计算值，确保能量计算的准确性
    // 公式：能量 = 笔数 * (标准转账能量消耗 * (1 + 安全缓冲百分比))
    const energyPerUnit = await this.getDynamicEnergyPerUnit();
    
    return units * energyPerUnit;
  }

  /**
   * 从系统配置动态获取单笔能量消耗
   */
  private async getDynamicEnergyPerUnit(): Promise<number> {
    try {
      const energyConfigResult = await query(
        `SELECT config_key, config_value FROM system_configs 
         WHERE config_key IN (
           'resource_consumption.energy.usdt_standard_energy',
           'resource_consumption.energy.usdt_buffer_percentage'
         )`,
        []
      );

      if (energyConfigResult.rows.length >= 2) {
        const energyConfigs = energyConfigResult.rows.reduce((acc, row) => {
          acc[row.config_key] = parseFloat(row.config_value);
          return acc;
        }, {} as Record<string, number>);

        const standardEnergy = energyConfigs['resource_consumption.energy.usdt_standard_energy'] || 65000;
        const bufferPercentage = energyConfigs['resource_consumption.energy.usdt_buffer_percentage'] || 2;
        
        // 计算：单笔需要消耗的能量 = 标准转账能量消耗 * (1 + 安全缓冲百分比)
        return Math.round(standardEnergy * (1 + bufferPercentage / 100));
      }

      // 如果获取配置失败，使用系统默认值
      console.warn('未找到能量消耗配置，使用系统默认值');
      return Math.round(65000 * (1 + 2 / 100)); // 66300
    } catch (error) {
      console.error('获取能量消耗配置失败:', error);
      // 错误情况下使用系统默认值
      return Math.round(65000 * (1 + 2 / 100)); // 66300
    }
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
   * 获取闪租持续时间（分钟）
   */
  getFlashRentDuration(config: FlashRentConfig): number {
    return Math.round((config.expiry_hours || 6) * 60); // 转换为分钟保持一致性
  }

  /**
   * 执行完整的订单计算
   */
  async performFullCalculation(
    trxAmount: number,
    config: FlashRentConfig
  ): Promise<OrderCalculationResult & {
    orderPrice: number;
  }> {
    const calculatedUnits = this.calculateUnits(trxAmount, config);
    const totalEnergy = await this.calculateTotalEnergy(calculatedUnits, config);
    const validation = this.validateCalculationResult(trxAmount, calculatedUnits, totalEnergy);

    const orderPrice = this.calculateOrderPrice(calculatedUnits, config);

    return {
      ...validation,
      orderPrice
    };
  }
}
