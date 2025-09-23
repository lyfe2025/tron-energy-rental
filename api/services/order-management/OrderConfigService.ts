/**
 * 订单配置服务
 * 负责获取和管理各种订单配置
 */
import { query } from '../../database/index.js';
import type { FlashRentConfig } from './types';

export class OrderConfigService {
  /**
   * 获取闪租配置
   */
  async getFlashRentConfig(networkId: string): Promise<FlashRentConfig | null> {
    try {
      const result = await query(
        `SELECT config FROM price_configs 
         WHERE mode_type = 'energy_flash' 
           AND network_id = $1 
           AND is_active = true`,
        [networkId]
      );

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      return result.rows[0].config;
    } catch (error) {
      console.error('Failed to get flash rent config:', error);
      return null;
    }
  }

  /**
   * 验证配置有效性
   * 注意：energy_per_unit 从系统配置动态计算，不需要在此验证
   */
  validateFlashRentConfig(config: FlashRentConfig | null): { isValid: boolean; reason?: string } {
    if (!config) {
      return { isValid: false, reason: 'Configuration not found' };
    }

    // 验证价格配置
    const pricePerUnit = config.single_price || config.price_per_unit || 0;
    if (pricePerUnit <= 0) {
      return { isValid: false, reason: 'Invalid price per unit' };
    }

    // 验证过期时间
    if (config.expiry_hours && config.expiry_hours <= 0) {
      return { isValid: false, reason: 'Invalid expiry hours' };
    }

    // 验证支付地址
    if (!config.payment_address || config.payment_address.trim() === '') {
      return { isValid: false, reason: 'Invalid payment address' };
    }

    // 注意：energy_per_unit 字段是可选的，系统会从 system_configs 动态计算 calculated_energy_per_unit
    // 不需要在此验证 energy_per_unit，避免与动态计算逻辑冲突

    return { isValid: true };
  }

  /**
   * 获取配置的价格单位
   */
  getPricePerUnit(config: FlashRentConfig): number {
    return config.single_price || config.price_per_unit || 0;
  }

  /**
   * 获取配置的最大单位数
   */
  getMaxUnits(config: FlashRentConfig): number {
    return config.max_amount || config.max_units || 999;
  }
}
