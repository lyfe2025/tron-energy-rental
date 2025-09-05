export interface SystemLog {
  id: number
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  module: string
  context?: Record<string, any>
  stack_trace?: string
  user_id?: string
  ip_address?: string
  user_agent?: string
  created_at: string
  updated_at: string
}

export interface SystemLogSearchForm {
  level?: string
  module?: string
  message?: string
  start_date?: string
  end_date?: string
  user_id?: string
}

export interface SystemLogPagination {
  current: number
  pageSize: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

export interface SystemLogResponse {
  success: boolean
  data: {
    logs: SystemLog[]
    pagination: SystemLogPagination
  }
  message?: string
}