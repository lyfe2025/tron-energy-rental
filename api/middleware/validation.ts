import { type NextFunction, type Request, type Response } from 'express'
import { PriceConfigService } from '../services/PriceConfigService'

const priceConfigService = PriceConfigService.getInstance()

// 验证价格配置数据
export const validatePriceConfig = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mode_type, name, description, config } = req.body

    // 验证必填字段
    if (!mode_type || !name || !config) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'mode_type, name, and config are required'
      })
    }

    // 验证模式类型
    const validModeTypes = ['energy_flash', 'transaction_package']
    if (!validModeTypes.includes(mode_type)) {
      return res.status(400).json({
        error: 'Invalid mode_type',
        message: `mode_type must be one of: ${validModeTypes.join(', ')}`
      })
    }

    // 验证配置数据格式
    if (!priceConfigService.validateConfigData(mode_type, config)) {
      return res.status(400).json({
        error: 'Invalid config data',
        message: `Config data format is invalid for mode_type: ${mode_type}`
      })
    }

    next()
  } catch (error) {
    res.status(500).json({
      error: 'Validation error',
      message: error instanceof Error ? error.message : 'Unknown validation error'
    })
  }
}

// 验证模式类型参数
export const validateModeType = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { modeType } = req.params
    
    const validModeTypes = ['energy_flash', 'transaction_package', 'trx_exchange']
    if (!validModeTypes.includes(modeType)) {
      return res.status(400).json({
        error: 'Invalid mode_type',
        message: `mode_type must be one of: ${validModeTypes.join(', ')}`
      })
    }

    next()
  } catch (error) {
    res.status(500).json({
      error: 'Validation error',
      message: error instanceof Error ? error.message : 'Unknown validation error'
    })
  }
}

// 验证能量闪租配置
export const validateEnergyFlashConfig = (config: any): string[] => {
  const errors: string[] = []

  if (typeof config.single_price !== 'number' || config.single_price <= 0) {
    errors.push('single_price must be a positive number')
  }

  if (typeof config.max_transactions !== 'number' || config.max_transactions <= 0) {
    errors.push('max_transactions must be a positive number')
  }

  if (typeof config.expiry_hours !== 'number' || config.expiry_hours <= 0) {
    errors.push('expiry_hours must be a positive number')
  }

  if (typeof config.payment_address !== 'string' || !config.payment_address.trim()) {
    errors.push('payment_address must be a non-empty string')
  }

  // 验证主消息模板（可选）
  if (config.main_message_template !== undefined && typeof config.main_message_template !== 'string') {
    errors.push('main_message_template must be a string if provided')
  }

  return errors
}

// 验证TRX闪兑配置
export const validateTrxExchangeConfig = (config: any): string[] => {
  const errors: string[] = []

  // 验证汇率
  if (typeof config.usdt_to_trx_rate !== 'number' || config.usdt_to_trx_rate <= 0) {
    errors.push('usdt_to_trx_rate must be a positive number')
  }

  if (typeof config.trx_to_usdt_rate !== 'number' || config.trx_to_usdt_rate <= 0) {
    errors.push('trx_to_usdt_rate must be a positive number')
  }

  // 验证金额限制
  if (typeof config.min_amount !== 'number' || config.min_amount <= 0) {
    errors.push('min_amount must be a positive number')
  }

  if (typeof config.max_amount !== 'number' || config.max_amount <= 0) {
    errors.push('max_amount must be a positive number')
  }

  // 验证最小金额不能大于最大金额
  if (config.min_amount && config.max_amount && config.min_amount > config.max_amount) {
    errors.push('min_amount cannot be greater than max_amount')
  }

  // 验证支付地址
  if (typeof config.payment_address !== 'string' || !config.payment_address.trim()) {
    errors.push('payment_address must be a non-empty string')
  }

  // 验证主消息模板（可选）
  if (config.main_message_template !== undefined && typeof config.main_message_template !== 'string') {
    errors.push('main_message_template must be a string if provided')
  }

  return errors
}

// 验证价格配置更新数据（用于PUT请求）
export const validatePriceConfigUpdate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, config } = req.body
    const { modeType } = req.params

    // 验证必填字段（更新时不需要mode_type，因为从URL参数获取）
    if (!config) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'config is required'
      })
    }

    // 验证配置数据格式
    if (!priceConfigService.validateConfigData(modeType, config)) {
      return res.status(400).json({
        error: 'Invalid config data',
        message: `Config data format is invalid for mode_type: ${modeType}`
      })
    }

    next()
  } catch (error) {
    res.status(500).json({
      error: 'Validation error',
      message: error instanceof Error ? error.message : 'Unknown validation error'
    })
  }
}

// 通用验证错误处理函数
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  // 这个函数可以用于处理express-validator的验证错误
  // 目前作为占位符，可以根据需要扩展
  next()
}

// 验证分页参数
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10 } = req.query
    
    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: 'Invalid page parameter',
        message: 'Page must be a positive integer'
      })
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: 'Limit must be a positive integer between 1 and 100'
      })
    }
    
    // 将验证后的值添加到请求对象中
    req.query.page = pageNum.toString()
    req.query.limit = limitNum.toString()
    
    next()
  } catch (error) {
    res.status(500).json({
      error: 'Validation error',
      message: error instanceof Error ? error.message : 'Unknown validation error'
    })
  }
}

// 验证笔数套餐配置
export const validateTransactionPackageConfig = (config: any): string[] => {
  const errors: string[] = []

  // 验证基础配置
  if (typeof config.daily_fee !== 'number' || config.daily_fee < 0) {
    errors.push('daily_fee must be a non-negative number')
  }

  if (typeof config.transferable !== 'boolean') {
    errors.push('transferable must be a boolean')
  }

  if (typeof config.proxy_purchase !== 'boolean') {
    errors.push('proxy_purchase must be a boolean')
  }

  // 验证套餐配置
  if (!Array.isArray(config.packages)) {
    errors.push('packages must be an array')
  } else {
    config.packages.forEach((pkg: any, index: number) => {
      if (typeof pkg.name !== 'string' || !pkg.name.trim()) {
        errors.push(`packages[${index}].name must be a non-empty string`)
      }
      if (typeof pkg.transaction_count !== 'number' || pkg.transaction_count <= 0) {
        errors.push(`packages[${index}].transaction_count must be a positive number`)
      }
      if (typeof pkg.price !== 'number' || pkg.price <= 0) {
        errors.push(`packages[${index}].price must be a positive number`)
      }
      if (typeof pkg.unit_price !== 'number' || pkg.unit_price <= 0) {
        errors.push(`packages[${index}].unit_price must be a positive number`)
      }
      if (typeof pkg.currency !== 'string' || !pkg.currency.trim()) {
        errors.push(`packages[${index}].currency must be a non-empty string`)
      }
    })
  }

  // 验证订单配置
  if (!config.order_config || typeof config.order_config !== 'object') {
    errors.push('order_config must be an object')
  } else {
    if (typeof config.order_config.payment_address !== 'string' || !config.order_config.payment_address.trim()) {
      errors.push('order_config.payment_address must be a non-empty string')
    }
    if (typeof config.order_config.expire_minutes !== 'number' || config.order_config.expire_minutes <= 0) {
      errors.push('order_config.expire_minutes must be a positive number')
    }
    if (typeof config.order_config.confirmation_template !== 'string' || !config.order_config.confirmation_template.trim()) {
      errors.push('order_config.confirmation_template must be a non-empty string')
    }
  }

  // 验证消息模板
  if (typeof config.main_message_template !== 'string' || !config.main_message_template.trim()) {
    errors.push('main_message_template must be a non-empty string')
  }

  if (typeof config.reply_message !== 'string' || !config.reply_message.trim()) {
    errors.push('reply_message must be a non-empty string')
  }

  return errors
}
