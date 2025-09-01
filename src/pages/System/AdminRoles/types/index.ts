// 用户状态枚举
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

// 管理员角色信息
export interface AdminRoleInfo {
  admin_id: string
  username: string
  email: string
  phone?: string
  avatar?: string
  department_id?: number
  department_name?: string
  position_id?: number
  position_name?: string
  status: UserStatus
  last_login_at?: string
  created_at: string
  updated_at: string
  roles: AdminRole[]
}

// 管理员角色
export interface AdminRole {
  id: number
  name: string
  description?: string
  status: string
  assigned_at: string
  assigned_by: number
  assigned_by_name: string
}

// 管理员角色查询参数
export interface AdminRoleQuery {
  username?: string
  email?: string
  department_id?: number
  position_id?: number
  role_id?: number
  status?: UserStatus
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// 管理员角色分配请求
export interface AdminRoleAssignRequest {
  admin_ids: string[]
  role_ids: number[]
  operation: 'assign' | 'remove' | 'replace'
  reason?: string
}

// 管理员角色分配响应
export interface AdminRoleAssignResponse {
  success: boolean
  message: string
  data?: {
    assigned_count: number
    failed_count: number
    failed_users?: Array<{
      admin_id: string
      username: string
      reason: string
    }>
  }
}

// 管理员权限信息
export interface AdminPermissionInfo {
  admin_id: string
  username: string
  permissions: AdminPermission[]
  roles: Array<{
    id: number
    name: string
    permissions: Permission[]
  }>
}

// 管理员权限
export interface AdminPermission {
  id: number
  name: string
  key: string
  type: string
  resource: string
  action: string
  description?: string
  source: 'role' | 'direct'
  source_name: string
}

// 权限
export interface Permission {
  id: number
  name: string
  key: string
  type: string
  resource: string
  action: string
  description?: string
  menu_id?: number
  parent_id?: number
  sort_order: number
  status: string
  created_at: string
  updated_at: string
}

// API响应类型
export interface AdminRoleListResponse {
  success: boolean
  message: string
  data: {
    list: AdminRoleInfo[]
    pagination: Pagination
  }
}

export interface AdminPermissionResponse {
  success: boolean
  message: string
  data: AdminPermissionInfo
}

// 管理员角色统计
export interface AdminRoleStats {
  total_users: number
  active_users: number
  inactive_users: number
  users_with_roles: number
  users_without_roles: number
  role_distribution: Array<{
    role_id: number
    role_name: string
    user_count: number
  }>
  department_distribution: Array<{
    department_id: number
    department_name: string
    user_count: number
  }>
}

export interface AdminRoleStatsResponse {
  success: boolean
  message: string
  data: AdminRoleStats
}

// 批量操作
export interface BatchAdminRoleOperation {
  operation: 'assign' | 'remove' | 'replace'
  admin_ids: string[]
  role_ids: number[]
  reason?: string
}

export interface BatchOperationResponse {
  success: boolean
  message: string
  data: {
    total: number
    success_count: number
    failed_count: number
    failed_items: Array<{
      admin_id: string
      username: string
      reason: string
    }>
  }
}

// 分页
export interface Pagination {
  page: number
  page_size: number
  total: number
  pages: number
}

// 错误响应
export interface ErrorResponse {
  success: false
  message: string
  errors?: Record<string, string[]>
}

// 管理员角色历史记录
export interface AdminRoleHistory {
  id: number
  admin_id: string
  username: string
  role_id: number
  role_name: string
  operation: 'assign' | 'remove'
  reason?: string
  operated_by: string
  operated_by_name: string
  operated_at: string
}

export interface AdminRoleHistoryResponse {
  success: boolean
  message: string
  data: {
    list: AdminRoleHistory[]
    pagination: Pagination
  }
}

// 管理员角色导出
export interface AdminRoleExportData {
  admin_id: string
  username: string
  email: string
  department_name: string
  position_name: string
  roles: string[]
  status: string
  last_login_at: string
  created_at: string
}

// 管理员角色导入
export interface AdminRoleImportRequest {
  file: File
  operation: 'assign' | 'replace'
  skip_errors: boolean
}

export interface AdminRoleImportResponse {
  success: boolean
  message: string
  data: {
    total: number
    success_count: number
    failed_count: number
    failed_items: Array<{
      row: number
      username: string
      reason: string
    }>
  }
}

// 角色选项
export interface RoleOption {
  value: number
  label: string
  description?: string
  status: string
}

// 部门选项
export interface DepartmentOption {
  value: number
  label: string
  parent_id?: number
  level: number
}

// 岗位选项
export interface PositionOption {
  value: number
  label: string
  department_id: number
  department_name: string
}

// 管理员选项
export interface AdminOption {
  value: number
  label: string
  email: string
  department_name?: string
  position_name?: string
  status: UserStatus
}

// 权限树节点
export interface PermissionTreeNode {
  id: number
  name: string
  key: string
  type: string
  resource: string
  action: string
  description?: string
  parent_id?: number
  children?: PermissionTreeNode[]
  checked: boolean
  indeterminate: boolean
  source?: 'role' | 'direct'
  source_name?: string
}

// 管理员角色配置
export interface AdminRoleConfig {
  allow_multiple_roles: boolean
  require_approval: boolean
  auto_inherit_permissions: boolean
  role_priority_enabled: boolean
  max_roles_per_user: number
}

export interface AdminRoleConfigResponse {
  success: boolean
  message: string
  data: AdminRoleConfig
}

// 角色冲突检查
export interface RoleConflictCheck {
  admin_id: string
  role_ids: number[]
}

export interface RoleConflictResponse {
  success: boolean
  message: string
  data: {
    has_conflicts: boolean
    conflicts: Array<{
      role1_id: number
      role1_name: string
      role2_id: number
      role2_name: string
      conflict_type: string
      description: string
    }>
  }
}

// 管理员角色审批
export interface AdminRoleApproval {
  id: number
  user_id: number
  username: string
  role_ids: number[]
  role_names: string[]
  operation: 'assign' | 'remove'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requested_by: number
  requested_by_name: string
  requested_at: string
  reviewed_by?: number
  reviewed_by_name?: string
  reviewed_at?: string
  review_comment?: string
}

export interface AdminRoleApprovalResponse {
  success: boolean
  message: string
  data: {
    list: AdminRoleApproval[]
    pagination: Pagination
  }
}

// 管理员角色审批请求
export interface AdminRoleApprovalRequest {
  approval_id: number
  action: 'approve' | 'reject'
  comment?: string
}