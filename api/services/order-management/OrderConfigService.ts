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
   */
  validateFlashRentConfig(config: FlashRentConfig | null): { isValid: boolean; reason?: string } {
    if (!config) {
      return { isValid: false, reason: 'Configuration not found' };
    }

    const pricePerUnit = config.single_price || config.price_per_unit || 0;
    if (pricePerUnit <= 0) {
      return { isValid: false, reason: 'Invalid price per unit' };
    }

    const energyPerUnit = config.energy_per_unit || 0;
    if (energyPerUnit <= 0) {
      return { isValid: false, reason: 'Invalid energy per unit' };
    }

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
