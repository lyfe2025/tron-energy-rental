/**
 * 能量闪租配置相关类型定义
 */

export interface EnergyFlashConfigData {
  single_price: number
  max_transactions: number
  expiry_hours: number
  payment_address: string
  main_message_template?: string
}

export interface EnergyFlashConfig {
  mode_type: string
  is_active: boolean
  config: EnergyFlashConfigData
  enable_image?: boolean
  image_url?: string
  image_alt?: string
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
