/**
 * Webhook配置相关类型定义
 */

export interface WebhookConfig {
  webhook_url: string
  webhook_secret: string
  max_connections: number
}

export interface BotData {
  id?: string
  username?: string
  work_mode?: 'polling' | 'webhook'
}

export interface WebhookStatus {
  url: string
  configured_secret: boolean
  last_error_message?: string
  pending_update_count: number
  has_custom_certificate: boolean
  last_error_date?: string
}

export interface WebhookProps {
  modelValue: WebhookConfig
  workMode: 'polling' | 'webhook'
  mode?: 'create' | 'edit'
  botData?: BotData | null
  botUsername?: string
}

export interface WebhookEmits {
  'update:modelValue': [value: WebhookConfig]
}

export interface WebhookUIState {
  checking: boolean
  applying: boolean
  showWebhookDetails: boolean
  showConnectionsHelp: boolean
  showUrlExplanation: boolean
  secretVisible: boolean
  secretGenerated: boolean
}
