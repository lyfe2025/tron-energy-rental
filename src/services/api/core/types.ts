/**
 * API通用类型定义
 */

// API响应类型定义
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 分页响应类型
export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message?: string
}

// 通用查询参数
export interface QueryParams {
  page?: number
  limit?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

// 操作结果类型
export interface OperationResult {
  success: boolean
  message?: string
  error?: string
}

// 统计数据基础接口
export interface BaseStats {
  total: number
  period?: string
  updatedAt?: string
}

// 分页元数据
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
