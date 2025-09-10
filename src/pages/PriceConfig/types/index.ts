/**
 * 价格配置相关类型定义
 */

export interface PriceConfig {
  id: string
  mode_type: string
  name: string
  description: string
  is_active: boolean
  config: any
  inline_keyboard_config?: any
  image_url?: string
  image_alt?: string
  enable_image: boolean
  created_at: string
  updated_at: string
}

export interface EnergyFlashDisplayTexts {
  title: string
  subtitle_template: string | string[]  // 支持 {price} 和 {max} 占位符，可以是单个字符串或字符串数组
  duration_label: string
  price_label: string
  max_label: string
  address_label: string
  double_energy_warning: string
}

export interface EnergyFlashConfigData {
  single_price: number
  max_transactions: number
  expiry_hours: number
  payment_address: string
  double_energy_for_no_usdt: boolean
  display_texts: EnergyFlashDisplayTexts
  notes: string[]
}

export interface TransactionPackage {
  name: string
  transaction_count: number
  price: number
  currency: string
}

export interface TransactionPackageDisplayTexts {
  title: string
  subtitle: string
  usage_title: string
  address_prompt: string
}

export interface TransactionPackageConfigData {
  daily_fee: number
  transferable: boolean
  proxy_purchase: boolean
  packages: TransactionPackage[]
  display_texts: TransactionPackageDisplayTexts
  usage_rules: string[]
  notes: string[]
}


export interface TrxExchangeDisplayTexts {
  title: string
  subtitle_template: string  // 支持 {min_amount} 占位符
  rate_title: string
  rate_description: string
  address_label: string
}

export interface TrxExchangeConfigData {
  exchange_address: string
  min_amount: number
  rate_update_interval: number
  usdt_to_trx_rate: number
  trx_to_usdt_rate: number
  is_auto_exchange: boolean
  display_texts: TrxExchangeDisplayTexts
  notes: string[]
}

export interface ConfigCardProps {
  config: PriceConfig | undefined
  saving: boolean
  onToggle: (modeType: string) => Promise<void>
  onSave: (modeType: string) => Promise<void>
}

export interface ValidationResult {
  isValid: boolean
  message: string
}
