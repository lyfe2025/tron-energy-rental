// 岗位状态枚举
export type PositionStatus = 0 | 1 // 0: 禁用, 1: 启用

// 岗位基础接口
export interface Position {
  id: number
  name: string
  code: string
  description?: string
  department_id: number
  department_name?: string
  level: number
  sort_order: number
  status: PositionStatus
  created_at: string
  updated_at: string
}

// 创建岗位请求
export interface CreatePositionRequest {
  name: string
  code: string
  description?: string
  department_id: number
  level?: number
  sort_order?: number
  status?: PositionStatus
}

// 更新岗位请求
export interface UpdatePositionRequest {
  name?: string
  code?: string
  description?: string
  department_id?: number
  level?: number
  sort_order?: number
  status?: PositionStatus
}

// 岗位查询参数
export interface PositionQuery {
  search?: string
  department_id?: number
  status?: number
  page?: number
  limit?: number
}

// 岗位选项（用于下拉框等）
export interface PositionOption {
  id: number
  name: string
  code: string
  department_id: number
}

// API 响应类型
export interface PositionListResponse {
  success: boolean
  data: {
    positions: Position[]
    total: number
    page: number
    limit: number
  }
  message?: string
}

export interface PositionDetailResponse {
  success: boolean
  data: Position
  message?: string
}

export interface CreatePositionResponse {
  success: boolean
  data: Position
  message?: string
}

export interface UpdatePositionResponse {
  success: boolean
  data: Position
  message?: string
}

export interface DeletePositionResponse {
  success: boolean
  message?: string
}

// 岗位统计信息
export interface PositionStats {
  total: number
  active: number
  inactive: number
  by_department: Array<{
    department_id: number
    department_name: string
    count: number
  }>
}

export interface PositionStatsResponse {
  success: boolean
  data: PositionStats
  message?: string
}

// 批量操作
export interface BatchPositionOperation {
  action: 'activate' | 'deactivate' | 'delete' | 'move'
  position_ids: number[]
  target_department_id?: number // 用于移动操作
}

export interface BatchOperationResponse {
  success: boolean
  data: {
    success_count: number
    failed_count: number
    failed_items?: Array<{
      id: number
      reason: string
    }>
  }
  message?: string
}

// 岗位移动请求
export interface MovePositionRequest {
  position_id: number
  target_department_id: number
}

export interface MovePositionResponse {
  success: boolean
  data: Position
  message?: string
}

// 分页信息
export interface Pagination {
  page: number
  limit: number
  total: number
}

// 错误响应
export interface ErrorResponse {
  success: false
  message: string
  errors?: Record<string, string[]>
}

// 岗位权限相关（如果需要）
export interface PositionPermission {
  position_id: number
  permission_id: number
  granted_at: string
  granted_by: number
}

export interface PositionPermissionRequest {
  position_id: number
  permission_ids: number[]
}

export interface PositionPermissionResponse {
  success: boolean
  data: PositionPermission[]
  message?: string
}