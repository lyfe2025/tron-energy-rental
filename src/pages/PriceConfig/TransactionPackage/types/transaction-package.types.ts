/**
 * 笔数套餐配置相关类型定义
 */

export interface PackageButton {
  name: string
  transaction_count: number
  price: number      // USDT总价
  unit_price: number // USDT单价
  trx_price?: number    // TRX总价
  trx_unit_price?: number // TRX单价
  currency: string
}

export interface OrderConfig {
  payment_address: string
  expire_minutes: number
  confirmation_template: string
  confirmation_template_trx?: string  // TRX版本的模板
  inline_keyboard?: {
    enabled: boolean
    buttons_per_row: number
    buttons: Array<{
      text: string
      callback_data: string
    }>
  }
}



export interface TransactionPackageConfigData {
  packages: PackageButton[]
  daily_fee: number
  order_config: OrderConfig
  main_message_template: string
  reply_message: string
  transferable?: boolean
  proxy_purchase?: boolean
}

export interface TransactionPackageConfig {
  mode_type: string
  is_active: boolean
  config: TransactionPackageConfigData
  inline_keyboard_config?: any
  enable_image?: boolean
  image_url?: string
  image_alt?: string
}

export interface Button {
  id: string
  count: number
  unitPrice: number  // USDT单价
  price: number     // USDT总价
  trxUnitPrice: number  // TRX单价
  trxPrice: number     // TRX总价
  isSpecial: boolean
}

export interface ImageUploadData {
  url: string
  filename: string
}
