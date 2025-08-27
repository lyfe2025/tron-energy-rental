/**
 * 价格验证器
 * 提供价格计算的验证功能
 */
import { query } from '../../../config/database.js';
import type {
    CalculationInput,
    PriceCalculationResult,
    PriceValidationResult,
    ValidationOptions
} from '../types/index.js';

export class PriceValidator {
  private readonly MIN_PRICE = 0.000001; // 最小价格
  private readonly MAX_PRICE = 1000000; // 最大价格
  private readonly MAX_QUANTITY = 1000000; // 最大数量
  private readonly MAX_AMOUNT = 1000000000; // 最大金额

  /**
   * 验证计算输入
   */
  async validateInput(
    input: CalculationInput,
    options: ValidationOptions = {}
  ): Promise<PriceValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 基础验证
    this.validateBasicInput(input, errors);

    // 数据范围验证
    this.validateDataRanges(input, errors, warnings);

    // 业务逻辑验证
    if (options.checkLimits) {
      await this.validateBusinessLimits(input, errors, warnings);
    }

    // 可用性验证
    if (options.checkAvailability) {
      await this.validateAvailability(input, errors, warnings);
    }

    // 生成建议
    this.generateSuggestions(input, suggestions, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 验证计算结果
   */
  async validateResult(
    result: PriceCalculationResult,
    input: CalculationInput
  ): Promise<PriceValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 价格合理性验证
    this.validatePriceReasonableness(result, errors, warnings);

    // 计算逻辑验证
    this.validateCalculationLogic(result, input, errors);

    // 折扣验证
    this.validateDiscounts(result, warnings);

    // 费用验证
    this.validateFees(result, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 基础输入验证
   */
  private validateBasicInput(input: CalculationInput, errors: string[]): void {
    if (!input) {
      errors.push('计算输入不能为空');
      return;
    }

    if (!input.type || !['energy', 'bandwidth'].includes(input.type)) {
      errors.push('资源类型必须是 energy 或 bandwidth');
    }

    if (!input.quantity || input.quantity <= 0) {
      errors.push('数量必须大于 0');
    }

    if (!input.amount || input.amount <= 0) {
      errors.push('金额必须大于 0');
    }

    if (input.quantity && !Number.isInteger(input.quantity)) {
      errors.push('数量必须是整数');
    }

    if (input.amount && input.amount < 0) {
      errors.push('金额不能为负数');
    }
  }

  /**
   * 数据范围验证
   */
  private validateDataRanges(
    input: CalculationInput,
    errors: string[],
    warnings: string[]
  ): void {
    // 数量范围验证
    if (input.quantity > this.MAX_QUANTITY) {
      errors.push(`数量不能超过 ${this.MAX_QUANTITY.toLocaleString()}`);
    }

    if (input.quantity > 100000) {
      warnings.push('数量较大，建议分批处理');
    }

    // 金额范围验证
    if (input.amount > this.MAX_AMOUNT) {
      errors.push(`金额不能超过 ${this.MAX_AMOUNT.toLocaleString()}`);
    }

    // 类型特定验证
    if (input.type === 'energy') {
      if (input.amount < 100) {
        warnings.push('能量数量少于100，可能不够完成一次交易');
      }
      if (input.amount > 10000000) {
        warnings.push('能量数量过大，请确认是否正确');
      }
    }

    if (input.type === 'bandwidth') {
      if (input.amount < 1024) {
        warnings.push('带宽少于1KB，可能不够传输基本数据');
      }
      if (input.amount > 100 * 1024 * 1024) {
        warnings.push('带宽超过100MB，建议考虑分批传输');
      }
    }
  }

  /**
   * 业务限制验证
   */
  private async validateBusinessLimits(
    input: CalculationInput,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    try {
      // 检查包限制
      if (input.packageId) {
        const packageLimits = await this.getPackageLimits(input.packageId);
        if (packageLimits) {
          if (input.quantity < packageLimits.minQuantity) {
            errors.push(`数量不能少于包的最小限制: ${packageLimits.minQuantity}`);
          }
          if (input.quantity > packageLimits.maxQuantity) {
            errors.push(`数量不能超过包的最大限制: ${packageLimits.maxQuantity}`);
          }
        }
      }

      // 检查用户限制
      if (input.userLevel) {
        const userLimits = await this.getUserLimits(input.userLevel);
        if (userLimits) {
          const totalValue = input.quantity * input.amount;
          if (totalValue > userLimits.maxOrderValue) {
            errors.push(`订单总价值不能超过用户等级限制: ${userLimits.maxOrderValue}`);
          }
          if (totalValue > userLimits.dailyLimit) {
            warnings.push('订单价值接近每日限额，请注意余额');
          }
        }
      }

      // 检查系统限制
      const systemLimits = await this.getSystemLimits();
      if (systemLimits) {
        const orderValue = input.quantity * input.amount * 0.1; // 假设单价
        if (orderValue < systemLimits.minOrderValue) {
          warnings.push(`订单价值低于系统建议的最小值: ${systemLimits.minOrderValue} TRX`);
        }
      }
    } catch (error) {
      console.error('验证业务限制时出错:', error);
      warnings.push('无法验证业务限制，请联系管理员');
    }
  }

  /**
   * 可用性验证
   */
  private async validateAvailability(
    input: CalculationInput,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    try {
      // 检查包可用性
      if (input.packageId) {
        const isPackageAvailable = await this.checkPackageAvailability(input.packageId);
        if (!isPackageAvailable) {
          errors.push('指定的能量包当前不可用');
        }
      }

      // 检查机器人可用性
      if (input.botId) {
        const isBotAvailable = await this.checkBotAvailability(input.botId);
        if (!isBotAvailable) {
          errors.push('指定的机器人当前不可用');
        }
      }

      // 检查代理商可用性
      if (input.agentId) {
        const isAgentAvailable = await this.checkAgentAvailability(input.agentId);
        if (!isAgentAvailable) {
          warnings.push('指定的代理商可能暂时不可用');
        }
      }

      // 检查系统维护状态
      const isSystemMaintenance = await this.checkSystemMaintenance();
      if (isSystemMaintenance) {
        warnings.push('系统正在维护中，服务可能受到影响');
      }
    } catch (error) {
      console.error('验证可用性时出错:', error);
      warnings.push('无法验证服务可用性，请稍后重试');
    }
  }

  /**
   * 价格合理性验证
   */
  private validatePriceReasonableness(
    result: PriceCalculationResult,
    errors: string[],
    warnings: string[]
  ): void {
    if (result.finalPrice < this.MIN_PRICE) {
      errors.push('计算出的价格过低，请检查输入参数');
    }

    if (result.finalPrice > this.MAX_PRICE) {
      errors.push('计算出的价格过高，请检查输入参数');
    }

    if (result.basePrice <= 0) {
      errors.push('基础价格不能为零或负数');
    }

    if (result.finalPrice < result.basePrice * 0.1) {
      warnings.push('最终价格相比基础价格折扣过大，请确认是否正确');
    }

    if (result.finalPrice > result.basePrice * 10) {
      warnings.push('最终价格相比基础价格上涨过多，请确认是否正确');
    }
  }

  /**
   * 计算逻辑验证
   */
  private validateCalculationLogic(
    result: PriceCalculationResult,
    input: CalculationInput,
    errors: string[]
  ): void {
    const breakdown = result.calculationDetails?.breakdown;
    if (!breakdown) {
      errors.push('缺少计算明细');
      return;
    }

    // 验证计算一致性
    const expectedSubtotal = breakdown.baseAmount * breakdown.quantity;
    if (Math.abs(breakdown.subtotal - expectedSubtotal) > 0.000001) {
      errors.push('小计计算不正确');
    }

    const expectedTotal = breakdown.subtotal - breakdown.discountAmount + breakdown.feeAmount;
    if (Math.abs(breakdown.total - expectedTotal) > 0.000001) {
      errors.push('总价计算不正确');
    }

    if (Math.abs(result.finalPrice - breakdown.total) > 0.000001) {
      errors.push('最终价格与计算明细不一致');
    }
  }

  /**
   * 折扣验证
   */
  private validateDiscounts(
    result: PriceCalculationResult,
    warnings: string[]
  ): void {
    const breakdown = result.calculationDetails?.breakdown;
    if (!breakdown) return;

    const discountPercentage = breakdown.discountAmount / breakdown.subtotal;
    
    if (discountPercentage > 0.5) {
      warnings.push('折扣超过50%，请确认是否合理');
    }

    if (discountPercentage > 0.9) {
      warnings.push('折扣超过90%，建议检查折扣规则');
    }

    if (result.appliedRules.length > 5) {
      warnings.push('应用的折扣规则较多，请确认是否正确');
    }
  }

  /**
   * 费用验证
   */
  private validateFees(
    result: PriceCalculationResult,
    warnings: string[]
  ): void {
    const breakdown = result.calculationDetails?.breakdown;
    if (!breakdown) return;

    const feePercentage = breakdown.feeAmount / breakdown.subtotal;
    
    if (feePercentage > 0.3) {
      warnings.push('附加费用超过30%，请确认是否合理');
    }

    const fees = result.calculationDetails?.fees || [];
    if (fees.length > 3) {
      warnings.push('附加费用项目较多，请检查是否必要');
    }
  }

  /**
   * 生成建议
   */
  private generateSuggestions(
    input: CalculationInput,
    suggestions: string[],
    warnings: string[]
  ): void {
    // 数量优化建议
    if (input.quantity < 100) {
      suggestions.push('考虑增加数量以享受批量折扣');
    }

    // 时间优化建议
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
      suggestions.push('在非高峰时段(晚上或凌晨)下单可能享受更优惠的价格');
    }

    // 类型优化建议
    if (input.type === 'energy' && input.amount > 1000000) {
      suggestions.push('大量能量需求建议联系客服获取企业级优惠');
    }

    if (input.type === 'bandwidth' && input.amount > 50 * 1024 * 1024) {
      suggestions.push('大文件传输建议分批进行，可提高成功率并降低成本');
    }

    // 紧急处理建议
    if (input.isEmergency) {
      suggestions.push('紧急处理会产生额外费用，请确认是否必要');
    }

    // 根据警告生成相应建议
    warnings.forEach(warning => {
      if (warning.includes('数量较大')) {
        suggestions.push('建议将大订单拆分为多个小订单');
      }
      if (warning.includes('接近限额')) {
        suggestions.push('建议联系客服提升账户等级以获得更高限额');
      }
    });
  }

  /**
   * 获取包限制信息
   */
  private async getPackageLimits(packageId: string): Promise<{
    minQuantity: number;
    maxQuantity: number;
  } | null> {
    try {
      const result = await query(
        'SELECT min_quantity, max_quantity FROM energy_packages WHERE id = ?',
        [packageId]
      );
      
      if (result.length === 0) return null;
      
      return {
        minQuantity: parseInt(result[0].min_quantity),
        maxQuantity: parseInt(result[0].max_quantity)
      };
    } catch (error) {
      console.error('获取包限制失败:', error);
      return null;
    }
  }

  /**
   * 获取用户限制信息
   */
  private async getUserLimits(userLevel: string): Promise<{
    maxOrderValue: number;
    dailyLimit: number;
  } | null> {
    // 模拟用户限制数据
    const limits = {
      regular: { maxOrderValue: 10000, dailyLimit: 50000 },
      premium: { maxOrderValue: 50000, dailyLimit: 200000 },
      vip: { maxOrderValue: 200000, dailyLimit: 1000000 }
    };
    
    return limits[userLevel as keyof typeof limits] || null;
  }

  /**
   * 获取系统限制信息
   */
  private async getSystemLimits(): Promise<{
    minOrderValue: number;
    maxOrderValue: number;
  }> {
    return {
      minOrderValue: 1,
      maxOrderValue: 1000000
    };
  }

  /**
   * 检查包可用性
   */
  private async checkPackageAvailability(packageId: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT status FROM energy_packages WHERE id = ?',
        [packageId]
      );
      
      return result.length > 0 && result[0].status === 'active';
    } catch (error) {
      console.error('检查包可用性失败:', error);
      return false;
    }
  }

  /**
   * 检查机器人可用性
   */
  private async checkBotAvailability(botId: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT status FROM bots WHERE id = ?',
        [botId]
      );
      
      return result.length > 0 && result[0].status === 'active';
    } catch (error) {
      console.error('检查机器人可用性失败:', error);
      return false;
    }
  }

  /**
   * 检查代理商可用性
   */
  private async checkAgentAvailability(agentId: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT status FROM agent_pricing WHERE id = ?',
        [agentId]
      );
      
      return result.length > 0 && result[0].status === 'active';
    } catch (error) {
      console.error('检查代理商可用性失败:', error);
      return false;
    }
  }

  /**
   * 检查系统维护状态
   */
  private async checkSystemMaintenance(): Promise<boolean> {
    try {
      const result = await query(
        'SELECT value FROM system_configs WHERE key = "maintenance_mode"'
      );
      
      return result.length > 0 && result[0].value === 'true';
    } catch (error) {
      console.error('检查系统维护状态失败:', error);
      return false;
    }
  }
}
