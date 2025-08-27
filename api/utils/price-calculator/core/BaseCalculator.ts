/**
 * 基础价格计算器
 * 提供核心计算逻辑和通用方法
 */
import { query } from '../../../config/database.js';
import type {
    CalculationDetails,
    CalculationInput,
    CalculationOptions,
    DiscountRule,
    Fee,
    PriceCalculationResult
} from '../types/index.js';

export class BaseCalculator {
  protected precision: number = 6;
  protected defaultCurrency: string = 'TRX';

  /**
   * 执行基础价格计算
   */
  protected async performCalculation(
    input: CalculationInput,
    options: CalculationOptions = {}
  ): Promise<PriceCalculationResult> {
    const {
      quantity = 1,
      amount,
      type,
      options: calcOptions = {}
    } = input;

    // 获取基础价格
    const basePrice = await this.getBasePrice(input);
    
    // 计算小计
    const subtotal = basePrice * quantity * amount;
    
    // 应用折扣规则
    const discountResult = await this.applyDiscountRules(input, subtotal);
    
    // 计算费用
    const fees = await this.calculateFees(input, subtotal);
    const feeAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
    
    // 计算最终价格
    const finalPrice = this.roundPrice(
      subtotal - discountResult.totalDiscount + feeAmount,
      calcOptions.precision || this.precision,
      calcOptions.roundingMode || 'nearest'
    );

    // 构建计算详情
    const calculationDetails: CalculationDetails = {
      breakdown: {
        baseAmount: basePrice,
        quantity,
        subtotal,
        discountAmount: discountResult.totalDiscount,
        feeAmount,
        taxAmount: 0, // 暂不考虑税费
        total: finalPrice
      },
      discountRules: discountResult.appliedRules,
      fees
    };

    return {
      basePrice,
      finalPrice,
      discount: discountResult.totalDiscount,
      discountType: discountResult.type,
      appliedRules: discountResult.appliedRules.map(rule => rule.name),
      calculationDetails
    };
  }

  /**
   * 获取基础价格
   */
  protected async getBasePrice(input: CalculationInput): Promise<number> {
    const { packageId, type } = input;

    if (packageId) {
      const packageResult = await query(
        'SELECT base_price FROM energy_packages WHERE id = ? AND status = "active"',
        [packageId]
      );
      
      if (packageResult.length > 0) {
        return parseFloat(packageResult[0].base_price);
      }
    }

    // 回退到默认价格
    const defaultPrices = {
      energy: 0.1,
      bandwidth: 0.05
    };

    return defaultPrices[type] || 0.1;
  }

  /**
   * 应用折扣规则
   */
  protected async applyDiscountRules(
    input: CalculationInput,
    subtotal: number
  ): Promise<{
    totalDiscount: number;
    type: 'percentage' | 'fixed';
    appliedRules: DiscountRule[];
  }> {
    const appliedRules: DiscountRule[] = [];
    let totalDiscount = 0;
    let discountType: 'percentage' | 'fixed' = 'fixed';

    // 获取可用的折扣规则
    const availableRules = await this.getAvailableDiscountRules(input);
    
    // 按优先级排序并应用规则
    const sortedRules = availableRules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      if (this.evaluateRuleCondition(rule, input, subtotal)) {
        const discount = this.calculateRuleDiscount(rule, subtotal);
        
        if (discount > 0) {
          totalDiscount += discount;
          appliedRules.push(rule);
          
          if (rule.discount.type === 'percentage') {
            discountType = 'percentage';
          }
          
          // 如果是互斥规则，停止应用其他规则
          if (rule.type === 'promotional') {
            break;
          }
        }
      }
    }

    return {
      totalDiscount: Math.min(totalDiscount, subtotal * 0.9), // 最大折扣90%
      type: discountType,
      appliedRules
    };
  }

  /**
   * 获取可用的折扣规则
   */
  protected async getAvailableDiscountRules(input: CalculationInput): Promise<DiscountRule[]> {
    // 这里可以从数据库或配置中获取规则
    // 目前返回模拟数据
    const rules: DiscountRule[] = [];

    // 数量折扣
    if (input.quantity >= 1000) {
      rules.push({
        id: 'volume_1000',
        name: '大批量折扣',
        type: 'volume',
        condition: {
          field: 'quantity',
          operator: 'gte',
          value: 1000
        },
        discount: {
          type: 'percentage',
          value: 0.05 // 5%
        },
        priority: 10,
        isActive: true
      });
    }

    // 用户等级折扣
    if (input.userLevel === 'vip') {
      rules.push({
        id: 'vip_discount',
        name: 'VIP用户折扣',
        type: 'user_level',
        condition: {
          field: 'userLevel',
          operator: 'eq',
          value: 'vip'
        },
        discount: {
          type: 'percentage',
          value: 0.1 // 10%
        },
        priority: 20,
        isActive: true
      });
    }

    return rules;
  }

  /**
   * 评估规则条件
   */
  protected evaluateRuleCondition(
    rule: DiscountRule,
    input: CalculationInput,
    subtotal: number
  ): boolean {
    const { condition } = rule;
    const inputValue = this.getInputValue(input, condition.field);
    
    switch (condition.operator) {
      case 'gt':
        return inputValue > condition.value;
      case 'gte':
        return inputValue >= condition.value;
      case 'lt':
        return inputValue < condition.value;
      case 'lte':
        return inputValue <= condition.value;
      case 'eq':
        return inputValue === condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(inputValue);
      case 'between':
        return Array.isArray(condition.value) && 
               inputValue >= condition.value[0] && 
               inputValue <= condition.value[1];
      default:
        return false;
    }
  }

  /**
   * 获取输入值
   */
  protected getInputValue(input: CalculationInput, field: string): any {
    switch (field) {
      case 'quantity':
        return input.quantity;
      case 'amount':
        return input.amount;
      case 'userLevel':
        return input.userLevel;
      case 'type':
        return input.type;
      case 'isEmergency':
        return input.isEmergency;
      default:
        return null;
    }
  }

  /**
   * 计算规则折扣
   */
  protected calculateRuleDiscount(rule: DiscountRule, subtotal: number): number {
    const { discount } = rule;
    
    let discountAmount = 0;
    
    switch (discount.type) {
      case 'percentage':
        discountAmount = subtotal * discount.value;
        break;
      case 'fixed':
        discountAmount = discount.value;
        break;
      case 'multiplier':
        discountAmount = subtotal * (1 - discount.value);
        break;
    }
    
    // 应用最大折扣限制
    if (discount.maxAmount && discountAmount > discount.maxAmount) {
      discountAmount = discount.maxAmount;
    }
    
    return Math.max(0, discountAmount);
  }

  /**
   * 计算费用
   */
  protected async calculateFees(input: CalculationInput, subtotal: number): Promise<Fee[]> {
    const fees: Fee[] = [];
    
    // 紧急处理费
    if (input.isEmergency) {
      fees.push({
        id: 'emergency_fee',
        name: '紧急处理费',
        type: 'emergency',
        amount: subtotal * 0.2, // 20%加急费
        isPercentage: true
      });
    }
    
    // 平台服务费
    fees.push({
      id: 'platform_fee',
      name: '平台服务费',
      type: 'platform',
      amount: Math.max(subtotal * 0.01, 1), // 1%，最低1 TRX
      isPercentage: true
    });
    
    return fees;
  }

  /**
   * 价格舍入
   */
  protected roundPrice(
    price: number,
    precision: number = 6,
    mode: 'up' | 'down' | 'nearest' = 'nearest'
  ): number {
    const factor = Math.pow(10, precision);
    
    switch (mode) {
      case 'up':
        return Math.ceil(price * factor) / factor;
      case 'down':
        return Math.floor(price * factor) / factor;
      case 'nearest':
      default:
        return Math.round(price * factor) / factor;
    }
  }

  /**
   * 格式化价格
   */
  protected formatPrice(price: number, currency: string = 'TRX'): string {
    return `${price.toFixed(this.precision)} ${currency}`;
  }

  /**
   * 验证计算输入
   */
  protected validateInput(input: CalculationInput): string[] {
    const errors: string[] = [];
    
    if (!input.quantity || input.quantity <= 0) {
      errors.push('数量必须大于0');
    }
    
    if (!input.amount || input.amount <= 0) {
      errors.push('金额必须大于0');
    }
    
    if (!input.type || !['energy', 'bandwidth'].includes(input.type)) {
      errors.push('类型必须是energy或bandwidth');
    }
    
    return errors;
  }
}
