/**
 * 核心配置管理器
 * 负责配置的初始化、加载和合并
 */
import type { ConfigCardProps } from '../../types'
import { DEFAULT_CONFIG } from './defaults'

export class ConfigManager {
  /**
   * 深度合并对象
   */
  private static mergeDeep(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {}
        }
        this.mergeDeep(target[key], source[key])
      } else if (target[key] === undefined || target[key] === null || target[key] === '') {
        target[key] = source[key]
      }
    }
  }

  /**
   * 初始化配置，确保所有必要字段存在
   */
  static initializeConfig(props: ConfigCardProps): void {
    if (props.config) {
      // 确保 config 对象存在
      if (!props.config.config) {
        props.config.config = DEFAULT_CONFIG
      } else {
        // 合并默认配置，确保所有字段存在
        this.mergeDeep(props.config.config, DEFAULT_CONFIG)
      }
    }
  }

  /**
   * 获取默认配置
   */
  static getDefaultConfig() {
    return DEFAULT_CONFIG
  }

  /**
   * 验证配置数据的完整性
   */
  static validateConfig(config: any): boolean {
    if (!config) return false
    
    // 检查必要字段
    const requiredFields = ['packages', 'order_config', 'main_message_template', 'reply_message']
    for (const field of requiredFields) {
      if (!config[field]) return false
    }

    // 检查packages数组
    if (!Array.isArray(config.packages) || config.packages.length === 0) {
      return false
    }

    // 检查每个package的必要字段
    for (const pkg of config.packages) {
      if (!pkg.transaction_count || !pkg.price || !pkg.unit_price) {
        return false
      }
    }

    // 检查order_config
    const orderConfig = config.order_config
    if (!orderConfig.payment_address || !orderConfig.confirmation_template) {
      return false
    }

    return true
  }

  /**
   * 清理并标准化配置数据
   */
  static sanitizeConfig(config: any): any {
    if (!config) return DEFAULT_CONFIG

    // 清理packages数组
    if (config.packages && Array.isArray(config.packages)) {
      config.packages = config.packages.map((pkg: any) => ({
        name: pkg.name || `${pkg.transaction_count}笔套餐`,
        transaction_count: Number(pkg.transaction_count) || 10,
        price: Number(pkg.price) || 0,
        unit_price: Number(pkg.unit_price) || 0,
        trx_price: Number(pkg.trx_price) || 0,
        trx_unit_price: Number(pkg.trx_unit_price) || 0,
        currency: pkg.currency || 'USDT'
      })).filter((pkg: any) => pkg.transaction_count > 0 && pkg.price > 0)
    }

    // 清理order_config
    if (config.order_config) {
      config.order_config = {
        payment_address: config.order_config.payment_address || DEFAULT_CONFIG.order_config.payment_address,
        expire_minutes: Number(config.order_config.expire_minutes) || DEFAULT_CONFIG.order_config.expire_minutes,
        confirmation_template: config.order_config.confirmation_template || DEFAULT_CONFIG.order_config.confirmation_template,
        confirmation_template_trx: config.order_config.confirmation_template_trx || DEFAULT_CONFIG.order_config.confirmation_template_trx,
        inline_keyboard: {
          enabled: config.order_config.inline_keyboard?.enabled !== false,
          buttons_per_row: Number(config.order_config.inline_keyboard?.buttons_per_row) || DEFAULT_CONFIG.order_config.inline_keyboard.buttons_per_row,
          buttons: config.order_config.inline_keyboard?.buttons || DEFAULT_CONFIG.order_config.inline_keyboard.buttons
        }
      }
    }

    // 清理其他字段
    config.daily_fee = Number(config.daily_fee) || DEFAULT_CONFIG.daily_fee
    config.main_message_template = config.main_message_template || DEFAULT_CONFIG.main_message_template
    config.reply_message = config.reply_message || DEFAULT_CONFIG.reply_message
    config.transferable = config.transferable !== false
    config.proxy_purchase = config.proxy_purchase !== false

    return config
  }
}
