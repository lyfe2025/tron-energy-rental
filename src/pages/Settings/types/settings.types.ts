export interface SettingsTab {
  id: string
  name: string
  icon: any
}

export interface BasicSettings {
  systemName: string
  systemDescription: string
  contactEmail: string
  supportPhone: string
  timezone: string
  language: string
  currency: string
  dateFormat: string
}

export interface SecuritySettings {
  enableTwoFactor: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  passwordExpireDays: number
  enableIpWhitelist: boolean
  ipWhitelist: string[]
  enableApiRateLimit: boolean
  apiRateLimit: number
}

export interface NotificationSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  systemAlerts: boolean
  orderUpdates: boolean
  lowBalanceAlert: boolean
  maintenanceNotifications: boolean
  weeklyReport: boolean
  monthlyReport: boolean
}

export interface AdvancedSettings {
  enableMaintenanceMode: boolean
  maintenanceMessage: string
  enableDebugMode: boolean
  logLevel: string
  enableAutoBackup: boolean
  backupRetentionDays: number
  enableCacheOptimization: boolean
  cacheExpireTime: number
}

export interface PricingSettings {
  energyBasePrice: number
  bandwidthBasePrice: number
  discountRules: DiscountRule[]
  emergencyFeeMultiplier: number
  minimumOrderAmount: number
  maximumOrderAmount: number
}

export interface DiscountRule {
  id: string
  name: string
  type: 'volume' | 'time' | 'user_level'
  threshold: number
  discount: number
  enabled: boolean
}

export interface SystemSettings {
  basic: BasicSettings
  security: SecuritySettings
  notifications: NotificationSettings
  advanced: AdvancedSettings
  pricing: PricingSettings
}

export interface SettingsManagementState {
  settings: SystemSettings
  activeTab: string
  isSaving: boolean
  isLoading: boolean
  isDirty: boolean
  lastSaved: Date | null
}
