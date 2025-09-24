/**
 * 笔数套餐配置相关类型定义
 */

export interface PackageButton {
  name: string
  transaction_count: number
  price: number
  unit_price: number
  currency: string
}

export interface OrderConfig {
  payment_address: string
  expire_minutes: number
  confirmation_template: string
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
  unitPrice: number
  price: number
  isSpecial: boolean
}

export interface ImageUploadData {
  url: string
  filename: string
}
