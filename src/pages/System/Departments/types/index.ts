// 部门状态枚举
export enum DepartmentStatus {
  ACTIVE = 1,
  INACTIVE = 0
}

// 部门基础接口
export interface Department {
  id: number
  name: string
  code: string
  description?: string
  parent_id?: number
  sort_order: number
  status: DepartmentStatus
  created_at: string
  updated_at: string
}

// 创建部门请求
export interface CreateDepartmentRequest {
  name: string
  code: string
  description?: string
  parent_id?: number
  sort_order?: number
  status?: DepartmentStatus
}

// 更新部门请求
export interface UpdateDepartmentRequest {
  name?: string
  code?: string
  description?: string
  parent_id?: number
  sort_order?: number
  status?: DepartmentStatus
}

// 部门查询参数
export interface DepartmentQuery {
  name?: string
  status?: DepartmentStatus
  parent_id?: number
  page?: number
  limit?: number
}

// 部门树节点
export interface DepartmentTreeNode extends Department {
  children?: DepartmentTreeNode[]
  level?: number
  hasChildren?: boolean
  userCount?: number
}

// 部门选项（用于下拉选择）
export interface DepartmentOption {
  id: number
  name: string
  parent_id?: number
  level?: number
  disabled?: boolean
}

// API 响应类型
export interface DepartmentListResponse {
  code: number
  message: string
  data: {
    departments: Department[]
    total: number
    page: number
    limit: number
  }
}

export interface DepartmentTreeResponse {
  code: number
  message: string
  data: DepartmentTreeNode[]
}

export interface DepartmentResponse {
  code: number
  message: string
  data: Department
}

export interface DepartmentOptionsResponse {
  code: number
  message: string
  data: DepartmentOption[]
}

// 部门统计信息
export interface DepartmentStats {
  total: number
  active: number
  inactive: number
  topLevel: number
  maxDepth: number
}

export interface DepartmentStatsResponse {
  code: number
  message: string
  data: DepartmentStats
}

// 批量操作
export interface BatchDepartmentOperation {
  action: 'activate' | 'deactivate' | 'delete'
  department_ids: number[]
  reason?: string
}

export interface BatchOperationResponse {
  code: number
  message: string
  data: {
    success_count: number
    failed_count: number
    failed_items?: {
      id: number
      reason: string
    }[]
  }
}

// 移动部门
export interface MoveDepartmentRequest {
  department_id: number
  target_parent_id?: number
  sort_order?: number
}

// 分页信息
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// 错误响应
export interface ErrorResponse {
  code: number
  message: string
  errors?: Record<string, string[]>
}

// 部门用户信息
export interface DepartmentUser {
  id: number
  username: string
  email: string
  position?: string
  status: string
}

export interface DepartmentUsersResponse {
  code: number
  message: string
  data: {
    users: DepartmentUser[]
    total: number
    page: number
    limit: number
  }
}

// 部门导出数据
export interface DepartmentExportData {
  departments: Department[]
  export_time: string
  total_count: number
}

// 部门导入请求
export interface DepartmentImportRequest {
  file: File
  overwrite?: boolean
  validate_only?: boolean
}

export interface DepartmentImportResponse {
  code: number
  message: string
  data: {
    success_count: number
    failed_count: number
    failed_items?: {
      row: number
      name: string
      reason: string
    }[]
    preview?: Department[]
  }
}

// 部门使用情况
export interface DepartmentUsage {
  department_id: number
  department_name: string
  user_count: number
  role_count: number
  sub_department_count: number
  can_delete: boolean
  dependencies: string[]
}

export interface DepartmentUsageResponse {
  code: number
  message: string
  data: DepartmentUsage
}

// 部门变更日志
export interface DepartmentChangeLog {
  id: number
  department_id: number
  department_name: string
  action: string
  changes: Record<string, any>
  operator_id: number
  operator_name: string
  created_at: string
}

export interface DepartmentChangeLogResponse {
  code: number
  message: string
  data: {
    logs: DepartmentChangeLog[]
    total: number
    page: number
    limit: number
  }
}

// 部门验证规则
export interface DepartmentValidationRules {
  name: {
    required: boolean
    min_length: number
    max_length: number
    unique: boolean
  }
  description: {
    max_length: number
  }
  max_depth: number
  max_children: number
}

// 部门配置
export interface DepartmentConfig {
  validation_rules: DepartmentValidationRules
  default_status: DepartmentStatus
  allow_self_parent: boolean
  auto_sort: boolean
}

export interface DepartmentConfigResponse {
  code: number
  message: string
  data: DepartmentConfig
}