/**
 * 能量闪租配置相关类型定义
 */

export interface LineBreaksConfig {
  after_title: number
  after_subtitle: number
  after_details: number
  before_warning: number
  before_notes: number
}

export interface DisplayTextsConfig {
  title: string
  subtitle_template: string | string[]
  duration_label: string
  price_label: string
  max_label: string
  address_label: string
  double_energy_warning: string
  line_breaks?: LineBreaksConfig
}

export interface EnergyFlashConfigData {
  single_price: number
  max_transactions: number
  expiry_hours: number
  payment_address: string
  double_energy_for_no_usdt: boolean
  display_texts?: DisplayTextsConfig
  notes?: string[]
}

export interface EnergyFlashConfig {
  mode_type: string
  is_active: boolean
  config: EnergyFlashConfigData
  enable_image?: boolean
  image_url?: string
  image_alt?: string
}

export interface LineBreakPresets {
  compact: LineBreaksConfig
  normal: LineBreaksConfig
  spacious: LineBreaksConfig
  custom: LineBreaksConfig
}

export interface ImageUploadData {
  url: string
  filename: string
}

export interface CopyStatus {
  message: string
  type: 'success' | 'error' | 'warning'
}

// 格式化函数的类型
export type TemplateFormatter = (template: string, config: EnergyFlashConfigData) => string

// 组件事件类型
export interface EnergyFlashConfigEvents {
  onToggle: (modeType: string) => void
  onSave: (modeType: string) => void
}
