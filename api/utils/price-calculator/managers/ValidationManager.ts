/**
 * 价格验证管理器
 * 负责价格计算的输入和结果验证
 */
import type {
    CalculationInput,
    PriceCalculationResult,
    PriceValidationResult
} from '../types/index.js';
import { PriceValidator } from '../validators/PriceValidator.js';

export class ValidationManager {
  private static validator = new PriceValidator();

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
   * 验证价格范围
   * @param price 价格
   * @param min 最小值
   * @param max 最大值
   * @returns 是否有效
   */
  static validatePriceRange(price: number, min?: number, max?: number): boolean {
    if (min !== undefined && price < min) return false;
    if (max !== undefined && price > max) return false;
    return true;
  }

  /**
   * 验证折扣合理性
   * @param basePrice 基础价格
   * @param finalPrice 最终价格
   * @param maxDiscountPercent 最大折扣百分比
   * @returns 验证结果
   */
  static validateDiscount(
    basePrice: number,
    finalPrice: number,
    maxDiscountPercent: number = 50
  ): { isValid: boolean; discountPercent: number; message?: string } {
    if (basePrice <= 0) {
      return { isValid: false, discountPercent: 0, message: '基础价格必须大于0' };
    }

    const discountPercent = ((basePrice - finalPrice) / basePrice) * 100;

    if (discountPercent < 0) {
      return { 
        isValid: false, 
        discountPercent, 
        message: '最终价格不能高于基础价格' 
      };
    }

    if (discountPercent > maxDiscountPercent) {
      return { 
        isValid: false, 
        discountPercent, 
        message: `折扣不能超过${maxDiscountPercent}%` 
      };
    }

    return { isValid: true, discountPercent };
  }

  /**
   * 验证数量合理性
   * @param quantity 数量
   * @param min 最小值
   * @param max 最大值
   * @returns 验证结果
   */
  static validateQuantity(
    quantity: number,
    min: number = 1,
    max?: number
  ): { isValid: boolean; message?: string } {
    if (!Number.isInteger(quantity) || quantity < min) {
      return { 
        isValid: false, 
        message: `数量必须是大于等于${min}的整数` 
      };
    }

    if (max !== undefined && quantity > max) {
      return { 
        isValid: false, 
        message: `数量不能超过${max}` 
      };
    }

    return { isValid: true };
  }
}
