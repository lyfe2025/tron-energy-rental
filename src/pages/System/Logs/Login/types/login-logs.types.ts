/**
 * 登录日志相关类型定义
 * 从 Login/index.vue 中分离的类型定义
 */

export interface LoginLog {
  id: string
  username: string
  user_id?: string
  ip_address: string
  user_agent: string
  status: number // 1表示成功，0表示失败
  login_time: string
  logout_time?: string
  session_duration?: number
  location?: string
  device_type?: string
  failure_reason?: string
  created_at: string
}

export interface LoginLogSearchParams {
  username: string
  status: string
  ip_address: string
  timeRange: string
}

export interface LoginLogPagination {
  current: number
  pageSize: number
  total: number
}
