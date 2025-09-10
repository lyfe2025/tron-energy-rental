export interface NotificationSettingsProps {
  botId: string
}

export interface GlobalSettings {
  enabled: boolean
  testMode: boolean
  debugMode: boolean
  defaultLanguage: string
  defaultParseMode: string
  sendDelay: number
}

export interface TimeSettings {
  enableTimeRestriction: boolean
  allowedTimeRange: [string, string]
  timezone: string
  holidayOptions: string[]
}

export interface RateLimitSettings {
  messagesPerSecond: number
  messagesPerMinute: number
  batchDelay: number
  userHourlyLimit: number
  userDailyLimit: number
  duplicateMessageInterval: number
  maxRetries: number
  retryDelay: number
  failureAction: string
}

export interface AudienceSettings {
  defaultAudience: string[]
  excludeGroups: string[]
  smartDelivery: boolean
  personalizedContent: boolean
  adaptiveScheduling: boolean
}

export interface AdvancedSettings {
  webhookUrl: string
  webhookSecret: string
  logRetentionDays: number
  analyticsRetentionDays: number
  failedMessageRetentionDays: number
  enableFailover: boolean
  fallbackBotToken: string
}

export interface PriorityConfigItem {
  type: string
  priority: 'high' | 'medium' | 'low'
  weight: number
  maxDelay: number
}

export interface NotificationSettings {
  global: GlobalSettings
  time: TimeSettings
  rateLimit: RateLimitSettings
  audience: AudienceSettings
  advanced: AdvancedSettings
  priority: PriorityConfigItem[]
}

export interface SettingsResponse {
  success: boolean
  data: NotificationSettings
}

export interface SaveSettingsRequest {
  settings: NotificationSettings
}

export interface SaveSettingsResponse {
  success: boolean
  message: string
}

export interface TestWebhookRequest {
  url: string
  secret: string
}

export interface TestWebhookResponse {
  success: boolean
  message: string
}
