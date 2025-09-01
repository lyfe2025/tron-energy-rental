/**
 * 价格配置相关类型定义
 */

export interface PriceConfig {
  id: string
  mode_type: string
  is_active: boolean
  config: any
  created_at: string
  updated_at: string
}

export interface EnergyFlashConfigData {
  single_price: number
  max_transactions: number
  expiry_hours: number
  payment_address: string
  double_energy_for_no_usdt: boolean
}

export interface TransactionPackage {
  name: string
  transaction_count: number
  price: number
  currency: string
}

export interface TransactionPackageConfigData {
  daily_fee: number
  transferable: boolean
  proxy_purchase: boolean
  packages: TransactionPackage[]
}

export interface VipBenefits {
  unlimited_transactions: boolean
  priority_support: boolean
  no_daily_fee: boolean
}

export interface VipPackage {
  name: string
  duration_days: number
  price: number
  currency: string
  benefits: VipBenefits
}

export interface VipPackageConfigData {
  packages: VipPackage[]
}

export interface TrxExchangeConfigData {
  exchange_address: string
  min_amount: number
  rate_update_interval: number
  usdt_to_trx_rate: number
  trx_to_usdt_rate: number
  is_auto_exchange: boolean
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
