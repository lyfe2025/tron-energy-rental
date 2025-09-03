import type { OperationAction, ResourceType } from '../../types'

export interface OperationLog {
  id: string
  username: string
  module: string
  operation: string
  method: string
  url: string
  description: string
  ip_address: string
  status: 'success' | 'failed'
  execution_time: number
  request_params?: any
  response_data?: any
  error_message?: string
  created_at: string
}

export interface OperationLogQuery {
  username?: string
  action?: OperationAction | ''
  resource?: ResourceType | ''
  startDate?: string
  endDate?: string
}

export interface SearchForm {
  username: string
  module: string
  operation: string
  timeRange: string
}

export interface Pagination {
  current: number
  pageSize: number
  total: number
}

export interface OperationLogResponse {
  data: OperationLog[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}
