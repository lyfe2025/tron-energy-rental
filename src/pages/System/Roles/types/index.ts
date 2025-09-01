// 角色状态枚举
export enum RoleStatus {
  ACTIVE = 1,
  INACTIVE = 0
}

// 权限类型枚举
export enum PermissionType {
  MENU = 'menu',
  BUTTON = 'button',
  API = 'api',
  PAGE = 'page',
  OPERATION = 'operation'
}

// 角色接口
export interface Role {
  id: number
  name: string
  code: string
  description?: string
  status: number
  type: string
  sort_order: number
  is_system?: boolean
  permission_count?: number
  user_count?: number
  created_at: string
  updated_at: string
}

// 权限接口
export interface Permission {
  id: number
  name: string
  code: string
  type: PermissionType
  parent_id?: number
  path?: string
  method?: string
  description?: string
  sort_order: number
  created_at: string
  updated_at: string
  children?: Permission[]
}

// 角色权限关联接口
export interface RolePermission {
  id: number
  role_id: number
  permission_id: number
  created_at: string
}

// 创建角色请求
export interface CreateRoleRequest {
  name: string
  code: string
  description?: string
  status: number
  type?: string
  sort_order: number
}

// 更新角色请求
export interface UpdateRoleRequest {
  name?: string
  code?: string
  description?: string
  status?: number
  type?: string
  sort_order?: number
}

// 角色查询参数
export interface RoleQuery {
  keyword?: string
  status?: string
  type?: string
  page?: number
  limit?: number
}

// 权限查询参数
export interface PermissionQuery {
  keyword?: string
  type?: PermissionType
  parent_id?: number
  page?: number
  limit?: number
}

// 角色权限配置请求
export interface RolePermissionRequest {
  role_id: number
  permission_ids: number[]
}

// API响应基础接口
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
}

// 分页响应接口
export interface PaginatedResponse<T> {
  roles?: T[]
  data?: T[]
  total: number
  page: number
  limit: number
}

// 角色列表响应
export interface RoleListResponse extends ApiResponse<PaginatedResponse<Role>> {}

// 角色详情响应
export interface RoleDetailResponse extends ApiResponse<Role> {}

// 权限列表响应
export interface PermissionListResponse extends ApiResponse<PaginatedResponse<Permission>> {}

// 权限树响应
export interface PermissionTreeResponse extends ApiResponse<Permission[]> {}

// 角色权限响应
export interface RolePermissionResponse extends ApiResponse<Permission[]> {}

// 角色权限列表响应（用于获取角色的权限ID列表）
export interface RolePermissionsResponse extends ApiResponse<number[]> {}

// 角色统计信息
export interface RoleStats {
  total_roles: number
  active_roles: number
  inactive_roles: number
  system_roles: number
  custom_roles: number
}

// 角色统计响应
export interface RoleStatsResponse extends ApiResponse<RoleStats> {}

// 批量角色操作
export interface BatchRoleOperation {
  action: 'activate' | 'deactivate' | 'delete'
  role_ids: number[]
  reason?: string
}

// 批量操作响应
export interface BatchOperationResponse {
  success_count: number
  failed_count: number
  failed_items: Array<{
    id: number
    reason: string
  }>
}

// 批量角色操作响应
export interface BatchRoleOperationResponse extends ApiResponse<BatchOperationResponse> {}

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

// 角色用户信息
export interface RoleUser {
  id: number
  username: string
  email: string
  name: string
  department_name?: string
  position_name?: string
  assigned_at: string
}

// 角色用户响应
export interface RoleUsersResponse extends ApiResponse<PaginatedResponse<RoleUser>> {}

// 角色导出数据
export interface RoleExportData {
  roles: Role[]
  permissions: Permission[]
  role_permissions: RolePermission[]
  export_time: string
}

// 角色导入请求
export interface RoleImportRequest {
  file: File
  overwrite_existing: boolean
}

// 角色导入响应
export interface RoleImportResponse extends ApiResponse<{
  imported_count: number
  skipped_count: number
  error_count: number
  errors: string[]
}> {}

// 角色使用情况
export interface RoleUsage {
  role_id: number
  role_name: string
  user_count: number
  permission_count: number
  last_used_at?: string
}

// 角色使用情况响应
export interface RoleUsageResponse extends ApiResponse<RoleUsage[]> {}

// 角色变更日志
export interface RoleChangeLog {
  id: number
  role_id: number
  role_name: string
  action: string
  changes: Record<string, any>
  operator_id: number
  operator_name: string
  ip_address: string
  user_agent: string
  created_at: string
}

// 角色变更日志响应
export interface RoleChangeLogResponse extends ApiResponse<PaginatedResponse<RoleChangeLog>> {}

// 权限树节点
export interface PermissionTreeNode extends Permission {
  children?: PermissionTreeNode[]
  checked?: boolean
  indeterminate?: boolean
  expanded?: boolean
}

// 角色选项
export interface RoleOption {
  id: number
  name: string
  code: string
  disabled?: boolean
}

// 权限选项
export interface PermissionOption {
  id: number
  name: string
  code: string
  type: PermissionType
  disabled?: boolean
}

// 角色配置
export interface RoleConfig {
  max_roles_per_user: number
  allow_role_inheritance: boolean
  require_approval_for_role_changes: boolean
  auto_revoke_expired_roles: boolean
  role_expiry_days: number
}

// 角色配置响应
export interface RoleConfigResponse extends ApiResponse<RoleConfig> {}

// 角色冲突检查
export interface RoleConflictCheck {
  user_id: number
  role_ids: number[]
}

// 角色冲突响应
export interface RoleConflictResponse extends ApiResponse<{
  has_conflicts: boolean
  conflicts: Array<{
    role1_id: number
    role1_name: string
    role2_id: number
    role2_name: string
    conflict_reason: string
  }>
}> {}

// 角色审批
export interface RoleApproval {
  id: number
  user_id: number
  user_name: string
  role_id: number
  role_name: string
  action: 'assign' | 'revoke'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  applicant_id: number
  applicant_name: string
  approver_id?: number
  approver_name?: string
  approval_reason?: string
  applied_at: string
  processed_at?: string
}

// 角色审批响应
export interface RoleApprovalResponse extends ApiResponse<PaginatedResponse<RoleApproval>> {}

// 角色审批请求
export interface RoleApprovalRequest {
  user_id: number
  role_id: number
  action: 'assign' | 'revoke'
  reason: string
}