/**
 * 代理商价格配置验证逻辑
 */
import { query } from '../../../config/database.js';
import type {
    BatchConfigRequest,
    CreateAgentPricingRequest,
    UpdateAgentPricingRequest
} from '../types/agentPricing.types.js';

export class AgentPricingValidation {
  /**
   * 验证创建请求
   */
  static async validateCreateRequest(data: CreateAgentPricingRequest): Promise<{ valid: boolean; error?: string }> {
    // 验证必填字段
    if (!data.agent_id || !data.package_id) {
      return { valid: false, error: '缺少必填字段：agent_id, package_id' };
    }

    // 验证代理商
    const agentValidation = await this.validateAgent(data.agent_id);
    if (!agentValidation.valid) {
      return agentValidation;
    }

    // 验证能量包
    const packageValidation = await this.validatePackage(data.package_id);
    if (!packageValidation.valid) {
      return packageValidation;
    }

    // 验证模板（如果提供）
    if (data.template_id) {
      const templateValidation = await this.validateTemplate(data.template_id);
      if (!templateValidation.valid) {
        return templateValidation;
      }
    }

    // 验证价格数据
    const priceValidation = this.validatePriceData({
      price: data.price,
      discount_percentage: data.discount_percentage,
      min_price: data.min_price,
      max_price: data.max_price,
      quantity_discounts: data.quantity_discounts
    });
    if (!priceValidation.valid) {
      return priceValidation;
    }

    // 检查配置是否已存在
    const existsValidation = await this.validateConfigNotExists(data.agent_id, data.package_id);
    if (!existsValidation.valid) {
      return existsValidation;
    }

    return { valid: true };
  }

  /**
   * 验证更新请求
   */
  static async validateUpdateRequest(id: string, data: UpdateAgentPricingRequest): Promise<{ valid: boolean; error?: string; config?: any }> {
    // 验证配置是否存在
    const configValidation = await this.validateConfigExists(id);
    if (!configValidation.valid) {
      return configValidation;
    }

    // 验证模板（如果提供）
    if (data.template_id) {
      const templateValidation = await this.validateTemplate(data.template_id);
      if (!templateValidation.valid) {
        return templateValidation;
      }
    }

    // 验证价格数据
    const priceValidation = this.validatePriceData({
      price: data.price,
      discount_percentage: data.discount_percentage,
      min_price: data.min_price,
      max_price: data.max_price,
      quantity_discounts: data.quantity_discounts
    });
    if (!priceValidation.valid) {
      return priceValidation;
    }

    return { valid: true, config: configValidation.config };
  }

  /**
   * 验证批量操作请求
   */
  static validateBatchRequest(data: BatchConfigRequest): { valid: boolean; error?: string } {
    if (!Array.isArray(data.configs) || data.configs.length === 0) {
      return { valid: false, error: '配置数据必须是非空数组' };
    }

    if (data.configs.length > 100) {
      return { valid: false, error: '批量操作最多支持100个配置' };
    }

    return { valid: true };
  }

  /**
   * 验证代理商
   */
  private static async validateAgent(agentId: string): Promise<{ valid: boolean; error?: string; agent?: any }> {
    const agentResult = await query('SELECT id, status FROM agents WHERE id = $1', [agentId]);
    
    if (agentResult.rows.length === 0) {
      return { valid: false, error: '代理商不存在' };
    }

    const agent = agentResult.rows[0];
    if (agent.status !== 'active') {
      return { valid: false, error: '代理商状态不活跃，无法设置价格配置' };
    }

    return { valid: true, agent };
  }

  /**
   * 验证能量包
   */
  private static async validatePackage(packageId: string): Promise<{ valid: boolean; error?: string }> {
    const packageResult = await query('SELECT id FROM energy_packages WHERE id = $1', [packageId]);
    
    if (packageResult.rows.length === 0) {
      return { valid: false, error: '能量包不存在' };
    }

    return { valid: true };
  }

  /**
   * 验证模板
   */
  private static async validateTemplate(templateId: string): Promise<{ valid: boolean; error?: string }> {
    const templateResult = await query('SELECT id FROM price_templates WHERE id = $1', [templateId]);
    
    if (templateResult.rows.length === 0) {
      return { valid: false, error: '价格模板不存在' };
    }

    return { valid: true };
  }

  /**
   * 验证配置是否存在
   */
  private static async validateConfigExists(id: string): Promise<{ valid: boolean; error?: string; config?: any }> {
    const result = await query(
      'SELECT * FROM price_configs WHERE id = $1 AND agent_id IS NOT NULL',
      [id]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: '代理商价格配置不存在' };
    }

    return { valid: true, config: result.rows[0] };
  }

  /**
   * 验证配置不存在
   */
  private static async validateConfigNotExists(agentId: string, packageId: string): Promise<{ valid: boolean; error?: string }> {
    const result = await query(
      'SELECT id FROM price_configs WHERE agent_id = $1 AND package_id = $2',
      [agentId, packageId]
    );

    if (result.rows.length > 0) {
      return { valid: false, error: '该代理商和能量包的价格配置已存在' };
    }

    return { valid: true };
  }

  /**
   * 验证价格数据
   */
  private static validatePriceData(data: {
    price?: number;
    discount_percentage?: number;
    min_price?: number;
    max_price?: number;
    quantity_discounts?: any[];
  }): { valid: boolean; error?: string } {
    // 验证价格
    if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0)) {
      return { valid: false, error: '价格必须是非负数' };
    }

    // 验证折扣百分比
    if (data.discount_percentage !== undefined && 
        (typeof data.discount_percentage !== 'number' || 
         data.discount_percentage < 0 || 
         data.discount_percentage > 100)) {
      return { valid: false, error: '折扣百分比必须在0-100之间' };
    }

    // 验证最小价格
    if (data.min_price !== undefined && (typeof data.min_price !== 'number' || data.min_price < 0)) {
      return { valid: false, error: '最小价格必须是非负数' };
    }

    // 验证最大价格
    if (data.max_price !== undefined && (typeof data.max_price !== 'number' || data.max_price < 0)) {
      return { valid: false, error: '最大价格必须是非负数' };
    }

    // 验证价格范围
    if (data.min_price !== undefined && data.max_price !== undefined && data.min_price > data.max_price) {
      return { valid: false, error: '最小价格不能大于最大价格' };
    }

    // 验证数量折扣
    if (data.quantity_discounts !== undefined) {
      if (!Array.isArray(data.quantity_discounts)) {
        return { valid: false, error: '数量折扣必须是数组格式' };
      }

      for (const discount of data.quantity_discounts) {
        if (!discount.min_quantity || typeof discount.min_quantity !== 'number' || discount.min_quantity <= 0) {
          return { valid: false, error: '数量折扣的最小数量必须是正数' };
        }

        if (discount.max_quantity !== undefined && 
            (typeof discount.max_quantity !== 'number' || discount.max_quantity < discount.min_quantity)) {
          return { valid: false, error: '数量折扣的最大数量必须大于等于最小数量' };
        }

        if (!discount.discount_percentage || 
            typeof discount.discount_percentage !== 'number' || 
            discount.discount_percentage <= 0 || 
            discount.discount_percentage > 100) {
          return { valid: false, error: '数量折扣的折扣百分比必须在0-100之间' };
        }
      }
    }

    return { valid: true };
  }

  /**
   * 验证删除权限
   */
  static async validateDeleteRequest(id: string): Promise<{ valid: boolean; error?: string; config?: any }> {
    const configValidation = await this.validateConfigExists(id);
    if (!configValidation.valid) {
      return configValidation;
    }

    // 可以添加其他删除前的验证逻辑
    // 例如：检查是否有依赖的订单等

    return { valid: true, config: configValidation.config };
  }

  /**
   * 验证是否有更新字段
   */
  static validateHasUpdateFields(data: UpdateAgentPricingRequest): { valid: boolean; error?: string } {
    const hasFields = Object.keys(data).some(key => data[key as keyof UpdateAgentPricingRequest] !== undefined);
    
    if (!hasFields) {
      return { valid: false, error: '没有提供要更新的字段' };
    }

    return { valid: true };
  }
}

/**
 * 验证工具函数
 */
export class ValidationHelpers {
  /**
   * 验证数字范围
   */
  static validateNumberRange(value: number, min: number, max: number, fieldName: string): { valid: boolean; error?: string } {
    if (value < min || value > max) {
      return { valid: false, error: `${fieldName}必须在${min}-${max}之间` };
    }
    return { valid: true };
  }

  /**
   * 验证必填字段
   */
  static validateRequired(value: any, fieldName: string): { valid: boolean; error?: string } {
    if (value === undefined || value === null || value === '') {
      return { valid: false, error: `${fieldName}是必填字段` };
    }
    return { valid: true };
  }

  /**
   * 验证数字类型
   */
  static validateNumber(value: any, fieldName: string, allowNegative = false): { valid: boolean; error?: string } {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: `${fieldName}必须是有效数字` };
    }

    if (!allowNegative && value < 0) {
      return { valid: false, error: `${fieldName}不能为负数` };
    }

    return { valid: true };
  }

  /**
   * 验证字符串长度
   */
  static validateStringLength(value: string, min: number, max: number, fieldName: string): { valid: boolean; error?: string } {
    if (value.length < min || value.length > max) {
      return { valid: false, error: `${fieldName}长度必须在${min}-${max}字符之间` };
    }
    return { valid: true };
  }
}
