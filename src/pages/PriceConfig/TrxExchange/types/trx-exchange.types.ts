/**
 * TRX闪兑配置相关类型定义
 */

export interface TrxExchangeConfigData {
  usdt_to_trx_rate: number
  trx_to_usdt_rate: number
  min_amount: number
  max_amount: number
  payment_address: string
  main_message_template?: string
}

export interface TrxExchangeConfig {
  mode_type: string
  is_active: boolean
  config: TrxExchangeConfigData
  enable_image?: boolean
  image_url?: string
  image_alt?: string
}

export interface ImageUploadData {
  url: string
  filename: string
}
