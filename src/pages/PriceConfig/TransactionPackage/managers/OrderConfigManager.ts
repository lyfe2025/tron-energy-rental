/**
 * 订单配置管理器
 * 负责订单相关配置的管理
 */
import { ref } from 'vue'
import { DEFAULT_CONFIG } from '../core/defaults'
import type { OrderConfig } from '../types/transaction-package.types'

export class OrderConfigManager {
  private paymentAddress = ref('')
  private orderExpireMinutes = ref(0)
  private orderConfirmationTemplate = ref('')
  private orderConfirmationTemplateTrx = ref('')
  private inlineKeyboardEnabled = ref(false)
  private keyboardButtonsPerRow = ref(0)

  constructor() {
    this.loadDefaults()
  }

  // Getters
  getPaymentAddress() {
    return this.paymentAddress
  }

  getOrderExpireMinutes() {
    return this.orderExpireMinutes
  }

  getOrderConfirmationTemplate() {
    return this.orderConfirmationTemplate
  }

  getOrderConfirmationTemplateTrx() {
    return this.orderConfirmationTemplateTrx
  }

  getInlineKeyboardEnabled() {
    return this.inlineKeyboardEnabled
  }

  getKeyboardButtonsPerRow() {
    return this.keyboardButtonsPerRow
  }

  // Setters
  setPaymentAddress(address: string) {
    this.paymentAddress.value = address
  }

  setOrderExpireMinutes(minutes: number) {
    this.orderExpireMinutes.value = minutes
  }

  setOrderConfirmationTemplate(template: string) {
    this.orderConfirmationTemplate.value = template
  }

  setOrderConfirmationTemplateTrx(template: string) {
    this.orderConfirmationTemplateTrx.value = template
  }

  setInlineKeyboardEnabled(enabled: boolean) {
    this.inlineKeyboardEnabled.value = enabled
  }

  setKeyboardButtonsPerRow(count: number) {
    this.keyboardButtonsPerRow.value = count
  }

  /**
   * 从配置加载订单设置
   */
  loadFromConfig(config: any) {
    const orderConfig = config?.order_config || DEFAULT_CONFIG.order_config
    
    // 基本订单配置
    this.paymentAddress.value = orderConfig.payment_address || DEFAULT_CONFIG.order_config.payment_address
    this.orderExpireMinutes.value = orderConfig.expire_minutes || DEFAULT_CONFIG.order_config.expire_minutes
    
    // 确认模板配置
    this.orderConfirmationTemplate.value = orderConfig.confirmation_template || DEFAULT_CONFIG.order_config.confirmation_template
    this.orderConfirmationTemplateTrx.value = orderConfig.confirmation_template_trx || DEFAULT_CONFIG.order_config.confirmation_template_trx
    
    // 内嵌键盘配置
    const keyboardConfig = orderConfig.inline_keyboard || DEFAULT_CONFIG.order_config.inline_keyboard
    this.inlineKeyboardEnabled.value = keyboardConfig.enabled !== false
    this.keyboardButtonsPerRow.value = keyboardConfig.buttons_per_row || DEFAULT_CONFIG.order_config.inline_keyboard.buttons_per_row
  }

  /**
   * 加载默认配置
   */
  loadDefaults() {
    this.loadFromConfig(DEFAULT_CONFIG)
  }

  /**
   * 导出订单配置用于保存
   */
  exportConfig(): OrderConfig {
    return {
      payment_address: this.paymentAddress.value,
      expire_minutes: this.orderExpireMinutes.value,
      confirmation_template: this.orderConfirmationTemplate.value,
      confirmation_template_trx: this.orderConfirmationTemplateTrx.value,
      inline_keyboard: {
        enabled: this.inlineKeyboardEnabled.value,
        buttons_per_row: this.keyboardButtonsPerRow.value,
        buttons: [
          {
            text: '🔄 切换 TRX 支付',
            callback_data: 'switch_currency_trx'
          },
          {
            text: '❌ 取消订单',
            callback_data: 'cancel_order'
          }
        ]
      }
    }
  }

  /**
   * 验证订单配置
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证支付地址
    if (!this.paymentAddress.value) {
      errors.push('支付地址不能为空')
    } else if (this.paymentAddress.value.length < 20) {
      errors.push('支付地址格式不正确')
    }

    // 验证过期时间
    if (this.orderExpireMinutes.value <= 0) {
      errors.push('订单过期时间必须大于0')
    } else if (this.orderExpireMinutes.value > 1440) {
      errors.push('订单过期时间不能超过24小时')
    }

    // 验证确认模板
    if (!this.orderConfirmationTemplate.value) {
      errors.push('USDT订单确认模板不能为空')
    }

    if (!this.orderConfirmationTemplateTrx.value) {
      errors.push('TRX订单确认模板不能为空')
    }

    // 验证键盘配置
    if (this.inlineKeyboardEnabled.value) {
      if (this.keyboardButtonsPerRow.value <= 0 || this.keyboardButtonsPerRow.value > 8) {
        errors.push('每行按钮数量应在1-8之间')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 重置为默认配置
   */
  reset() {
    this.loadDefaults()
  }

  /**
   * 检查模板是否包含必要的占位符
   */
  validateTemplate(template: string): { isValid: boolean; missingPlaceholders: string[] } {
    const requiredPlaceholders = [
      '{userAddress}',
      '{unitPrice}',
      '{totalAmount}',
      '{transactionCount}',
      '{paymentAddress}',
      '{expireTime}'
    ]

    const missingPlaceholders = requiredPlaceholders.filter(placeholder => 
      !template.includes(placeholder)
    )

    return {
      isValid: missingPlaceholders.length === 0,
      missingPlaceholders
    }
  }

  /**
   * 获取配置摘要信息
   */
  getConfigSummary() {
    return {
      paymentAddress: this.paymentAddress.value,
      expireMinutes: this.orderExpireMinutes.value,
      hasUsdtTemplate: !!this.orderConfirmationTemplate.value,
      hasTrxTemplate: !!this.orderConfirmationTemplateTrx.value,
      keyboardEnabled: this.inlineKeyboardEnabled.value,
      buttonsPerRow: this.keyboardButtonsPerRow.value
    }
  }
}
