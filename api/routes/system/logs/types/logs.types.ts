/**
 * 日志相关类型定义
 */
import type { Request, Response } from 'express';

// 路由处理器类型
export type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

// 操作日志查询参数
export interface OperationLogQueryParams {
  page?: string
  limit?: string
  user_id?: string
  operation?: string
  start_date?: string
  end_date?: string
}

// 登录日志查询参数
export interface LoginLogQueryParams {
  page?: string
  limit?: string
  user_id?: string
  login_status?: string
  ip_address?: string
  start_date?: string
  end_date?: string
}

// 操作日志记录
export interface OperationLog {
  id: string
  user_id: string
  operation: string
  resource_type: string
  url: string
  method: string
  details?: any
  ip_address: string
  user_agent: string
  created_at: string
  username?: string
  email?: string
}

// 登录日志记录
export interface LoginLog {
  id: string
  user_id: string
  login_status: 'success' | 'failed'
  ip_address: string
  user_agent: string
  failure_reason?: string
  created_at: string
  username?: string
  email?: string
  login_time: string
}

// 日志统计数据
export interface LogsStats {
  operation_logs: {
    total: number
    today: number
    this_week: number
    this_month: number
  }
  login_logs: {
    total: number
    today: number
    this_week: number
    this_month: number
    success_rate: number
  }
  top_operations: Array<{
    operation: string
    count: number
  }>
  top_users: Array<{
    username: string
    email: string
    operation_count: number
    login_count: number
  }>
}

// 批量删除请求
export interface BatchDeleteRequest {
  ids: string[]
  confirm?: boolean
}

// 导出日志请求
export interface ExportLogsRequest {
  type: 'operations' | 'logins'
  format?: 'csv' | 'json' | 'excel'
  start_date?: string
  end_date?: string
  user_id?: string
  operation?: string
  login_status?: string
}

// 清理配置
export interface CleanupConfig {
  operation_logs_retention_days: number
  login_logs_retention_days: number
  auto_cleanup_enabled: boolean
  cleanup_schedule?: string
}

// 清理请求
export interface CleanupRequest {
  type: 'operations' | 'logins' | 'both'
  retention_days?: number
  force?: boolean
}

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 分页响应格式
export interface PaginatedResponse<T> extends ApiResponse<{ logs: T[]; pagination: PaginationInfo }> {}

// 分页信息
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

// 日志详情响应
export interface LogDetailResponse<T> extends ApiResponse<T> {}

// 统计响应
export interface StatsResponse extends ApiResponse<LogsStats> {}

// 导出响应
export interface ExportResponse extends ApiResponse<{
  filename: string
  download_url: string
  expires_at: string
}> {}

// 清理响应
export interface CleanupResponse extends ApiResponse<{
  deleted_count: number
  operation: string
  retention_days: number
}> {}

// 用户操作日志查询参数
export interface UserOperationLogsParams extends Omit<OperationLogQueryParams, 'user_id'> {
  userId: string
}
