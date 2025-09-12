/**
 * 连接状态相关类型定义
 */

export type ConnectivityStatus = 'connected' | 'disconnected' | 'slow' | null

export interface ConnectivityState {
  checking: boolean
  status: ConnectivityStatus
  latency: number | null
  error: string | null
  suggestions: string[]
  lastChecked: Date | null
}

export interface ConnectivityCheckResult {
  accessible: boolean
  latency?: number
  error?: string
  status?: 'excellent' | 'good' | 'slow'
  suggestions?: string[]
}

export interface TelegramApiResponse {
  success: boolean
  data?: ConnectivityCheckResult
  message?: string
}
