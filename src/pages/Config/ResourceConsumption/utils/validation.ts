/**
 * 资源消耗配置表单验证工具
 * 
 * 提供完整的表单验证规则、错误处理和数据校验功能
 * 确保用户输入的配置数据符合业务规则和系统要求
 */

import type {
  BandwidthConfig,
  EnergyConfig
} from '../types/resource-consumption.types.js'

/**
 * 验证错误类型
 */
export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

/**
 * 验证规则类型
 */
export interface ValidationRule {
  min?: number
  max?: number
  step?: number
  precision?: number
  required?: boolean
  message?: string
}

/**
 * 验证结果类型
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
}

/**
 * 验证结果接口
 */
export interface FormValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
}

/**
 * 数值范围验证规则
 */
interface NumericRange {
  min?: number
  max?: number
  step?: number
  precision?: number
}

/**
 * 默认验证规则配置（作为后备选项）
 */
const DEFAULT_VALIDATION_RULES = {
  // 能量配置默认验证规则
  energy: {
    usdt_standard_energy: { min: 1000, max: 100000, required: true },
    usdt_max_energy: { min: 5000, max: 200000, required: true },
    usdt_buffer_percentage: { min: 5, max: 50, required: true },
  },
  // 带宽配置默认验证规则
  bandwidth: {
    trx_transfer_bandwidth: { min: 200, max: 500, required: true },
    trc20_transfer_bandwidth: { min: 300, max: 600, required: true },
    account_create_bandwidth: { min: 500, max: 5000, required: true },
    buffer_percentage: { min: 5, max: 30, required: true },
    max_bandwidth_limit: { min: 1000, max: 10000, required: true }
  }
} as const

/**
 * 资源消耗配置验证器类
 */
export class ResourceConsumptionValidator {
  /**
   * 验证数值是否在指定范围内
   */
  private static validateNumericRange(
    value: number,
    range: NumericRange,
    fieldName: string
  ): ValidationError | null {
    // 检查是否为有效数字
    if (isNaN(value) || !isFinite(value)) {
      return {
        field: fieldName,
        message: `${fieldName}必须是有效数字`,
        code: 'INVALID_NUMBER',
        value
      }
    }

    // 检查最小值
    if (range.min !== undefined && value < range.min) {
      return {
        field: fieldName,
        message: `${fieldName}不能小于${range.min}`,
        code: 'MIN_VALUE_ERROR',
        value
      }
    }

    // 检查最大值
    if (range.max !== undefined && value > range.max) {
      return {
        field: fieldName,
        message: `${fieldName}不能大于${range.max}`,
        code: 'MAX_VALUE_ERROR',
        value
      }
    }

    // 检查步长
    if (range.step !== undefined && range.min !== undefined) {
      const remainder = (value - range.min) % range.step
      if (Math.abs(remainder) > 0.0001) {
        return {
          field: fieldName,
          message: `${fieldName}必须是${range.step}的倍数`,
          code: 'STEP_ERROR',
          value
        }
      }
    }

    // 检查精度
    if (range.precision !== undefined) {
      const decimalPlaces = (value.toString().split('.')[1] || '').length
      if (decimalPlaces > range.precision) {
        return {
          field: fieldName,
          message: `${fieldName}小数位数不能超过${range.precision}位`,
          code: 'PRECISION_ERROR',
          value
        }
      }
    }

    return null
  }

  /**
   * 验证能量配置
   */
  static validateEnergyConfig(
    config: Partial<EnergyConfig>, 
    dynamicRules?: Record<string, { min?: number; max?: number }>
  ): FormValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []

    // 验证各个字段
    Object.entries(config).forEach(([key, value]) => {
      const rule = this.getFieldRule('energy', key, dynamicRules)
      if (rule && value !== undefined) {
        const error = this.validateNumericRange(
          Number(value),
          rule,
          this.getFieldDisplayName(key)
        )
        if (error) {
          errors.push(error)
        }
      }
    })

    // 业务逻辑验证
    if (config.usdt_standard_energy && config.usdt_max_energy) {
      if (config.usdt_standard_energy >= config.usdt_max_energy) {
        errors.push({
          field: 'usdt_max_energy',
          message: 'USDT最大能量消耗必须大于标准能量消耗',
          code: 'LOGICAL_ERROR',
          value: config.usdt_max_energy
        })
      }

      // 添加警告
      const ratio = config.usdt_max_energy / config.usdt_standard_energy
      if (ratio < 1.5) {
        warnings.push('建议最大能量消耗至少是标准能量消耗的1.5倍，以确保足够的缓冲空间')
      }
    }

    // 缓冲百分比警告
    if (config.usdt_buffer_percentage && config.usdt_buffer_percentage < 10) {
      warnings.push('缓冲百分比较低，可能导致能量不足的风险')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 验证带宽配置
   */
  static validateBandwidthConfig(
    config: Partial<BandwidthConfig>, 
    dynamicRules?: Record<string, { min?: number; max?: number }>
  ): FormValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []

    // 验证各个字段
    Object.entries(config).forEach(([key, value]) => {
      const rule = this.getFieldRule('bandwidth', key, dynamicRules)
      if (rule && value !== undefined) {
        const error = this.validateNumericRange(
          Number(value),
          rule,
          this.getFieldDisplayName(key)
        )
        if (error) {
          errors.push(error)
        }
      }
    })

    // 业务逻辑验证
    if (config.trx_transfer_bandwidth && config.trc20_transfer_bandwidth) {
      if (config.trc20_transfer_bandwidth <= config.trx_transfer_bandwidth) {
        errors.push({
          field: 'trc20_transfer_bandwidth',
          message: 'TRC20转账带宽消耗应该大于TRX转账带宽消耗',
          code: 'LOGICAL_ERROR',
          value: config.trc20_transfer_bandwidth
        })
      }
    }

    // 缓冲百分比警告
    if (config.buffer_percentage && config.buffer_percentage < 10) {
      warnings.push('缓冲百分比较低，可能导致带宽不足的风险')
    }

    // 最大带宽限制警告
    if (config.max_bandwidth_limit && config.trc20_transfer_bandwidth) {
      const maxTransactions = Math.floor(config.max_bandwidth_limit / config.trc20_transfer_bandwidth)
      if (maxTransactions < 10) {
        warnings.push(`当前配置下，最大带宽限制只能支持约${maxTransactions}笔TRC20交易`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 验证完整配置
   */
  static validateFullConfig(
    energyConfig: Partial<EnergyConfig>,
    bandwidthConfig: Partial<BandwidthConfig>
  ): FormValidationResult {
    const energyResult = this.validateEnergyConfig(energyConfig)
    const bandwidthResult = this.validateBandwidthConfig(bandwidthConfig)

    return {
      isValid: energyResult.isValid && bandwidthResult.isValid,
      errors: [...energyResult.errors, ...bandwidthResult.errors],
      warnings: [...energyResult.warnings, ...bandwidthResult.warnings]
    }
  }

  /**
   * 获取字段显示名称
   */
  private static getFieldDisplayName(fieldKey: string): string {
    const displayNames: Record<string, string> = {
      usdt_standard_energy: 'USDT标准能量消耗',
      usdt_max_energy: 'USDT最大能量消耗',
      usdt_buffer_percentage: 'USDT缓冲百分比',
      trx_transfer_bandwidth: 'TRX转账带宽消耗',
      trc20_transfer_bandwidth: 'TRC20转账带宽消耗',
      account_create_bandwidth: '账户创建带宽消耗',
      buffer_percentage: '带宽缓冲百分比',
      max_bandwidth_limit: '最大带宽限制'
    }
    return displayNames[fieldKey] || fieldKey
  }

  /**
   * 获取字段验证规则
   */
  static getFieldRule(
    category: 'energy' | 'bandwidth', 
    fieldKey: string, 
    dynamicRules?: Record<string, { min?: number; max?: number }>
  ): ValidationRule | undefined {
    // 获取默认规则
    const rules = DEFAULT_VALIDATION_RULES[category] as Record<string, ValidationRule>
    const defaultRule = rules[fieldKey]
    
    if (!defaultRule) return undefined
    
    // 优先使用动态规则
    if (dynamicRules && dynamicRules[fieldKey]) {
      const dynamicRule = dynamicRules[fieldKey]
      return {
        ...defaultRule,
        min: dynamicRule.min ?? defaultRule.min,
        max: dynamicRule.max ?? defaultRule.max
      }
    }
    
    // 使用默认规则
    return defaultRule
  }

  /**
   * 验证单个字段
   */
  static validateField(
    category: 'energy' | 'bandwidth', 
    fieldKey: string, 
    value: any, 
    dynamicRules?: Record<string, { min?: number; max?: number }>
  ): FormValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []

    const rule = this.getFieldRule(category, fieldKey, dynamicRules)
    if (rule && value !== undefined) {
      const error = this.validateNumericRange(
        Number(value),
        rule,
        this.getFieldDisplayName(fieldKey)
      )
      if (error) {
        errors.push(error)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 格式化验证错误消息
   */
  static formatErrorMessage(error: ValidationError): string {
    return `${error.message} (当前值: ${error.value})`
  }

  /**
   * 检查字段是否必填
   */
  static isFieldRequired(category: 'energy' | 'bandwidth', fieldKey: string): boolean {
    const rule = this.getFieldRule(category, fieldKey)
    return rule?.required || false
  }

  /**
   * 获取字段的输入提示
   */
  static getFieldHint(
    category: 'energy' | 'bandwidth', 
    fieldKey: string, 
    dynamicRules?: Record<string, { min?: number; max?: number }>
  ): string {
    const rule = this.getFieldRule(category, fieldKey, dynamicRules)
    if (!rule) return ''

    const parts: string[] = []
    if (rule.min !== undefined && rule.max !== undefined) {
      parts.push(`范围: ${rule.min}-${rule.max}`)
    }
    if (rule.step !== undefined) {
      parts.push(`步长: ${rule.step}`)
    }
    if (rule.precision !== undefined) {
      parts.push(`精度: ${rule.precision}位小数`)
    }

    return parts.join(', ')
  }
}

/**
 * 实时验证装饰器
 * 用于在用户输入时进行实时验证
 */
export class RealTimeValidator {
  private static debounceTimers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * 防抖验证
   */
  static debounceValidate(
    key: string,
    validator: () => void,
    delay: number = 300
  ): void {
    // 清除之前的定时器
    const existingTimer = this.debounceTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // 设置新的定时器
    const timer = setTimeout(() => {
      validator()
      this.debounceTimers.delete(key)
    }, delay)

    this.debounceTimers.set(key, timer)
  }

  /**
   * 清理所有定时器
   */
  static cleanup(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
  }
}

/**
 * 错误处理工具
 */
export class ValidationErrorHandler {
  /**
   * 将验证错误转换为Element Plus表单错误格式
   */
  static toElementPlusErrors(errors: ValidationError[]): Record<string, string> {
    const formErrors: Record<string, string> = {}
    errors.forEach(error => {
      formErrors[error.field] = error.message
    })
    return formErrors
  }

  /**
   * 获取第一个错误消息
   */
  static getFirstErrorMessage(errors: ValidationError[]): string {
    return errors.length > 0 ? errors[0].message : ''
  }

  /**
   * 按字段分组错误
   */
  static groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
    const grouped: Record<string, ValidationError[]> = {}
    errors.forEach(error => {
      if (!grouped[error.field]) {
        grouped[error.field] = []
      }
      grouped[error.field].push(error)
    })
    return grouped
  }
}