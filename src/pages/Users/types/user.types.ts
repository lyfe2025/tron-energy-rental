// 用户基础信息接口
export interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  role: UserRole
  status: UserStatus
  balance: number
  last_login?: string
  login_count?: number
  remark?: string
  created_at: string
  updated_at: string
}

// 用户角色类型
export type UserRole = 'admin' | 'agent' | 'user';

// 用户状态类型
export type UserStatus = 'active' | 'inactive' | 'banned';

// 用户表单数据接口
export interface UserFormData {
  id: string
  username: string
  email: string
  phone: string
  role: string
  status: UserStatus
  balance: number
  password: string
  confirmPassword: string
  remark: string
  created_at: string
  updated_at: string
  last_login: string
}

// 用户统计数据接口
export interface UserStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  bannedUsers: number
  newUsersToday: number
  newUsersThisMonth: number
  totalBalance: number
  averageBalance: number
}

// 用户搜索参数接口
export interface UserSearchParams {
  query: string
  status: UserStatus | ''
  role: UserRole | ''
  dateRange: {
    start: string
    end: string
  }
}

// 用户列表查询参数接口
export interface UserListParams {
  page: number
  pageSize: number
  search?: string
  status?: UserStatus
  role?: UserRole
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

// 用户列表响应接口
export interface UserListResponse {
  users: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 批量操作参数接口
export interface BatchOperationParams {
  userIds: string[]
  operation: BatchOperationType
  data?: any
}

// 批量操作类型
export type BatchOperationType = 
  | 'activate'
  | 'deactivate'
  | 'delete'
  | 'export'
  | 'roleChange'
  | 'resetPassword'
  | 'sendNotification'

// 用户创建参数接口
export interface CreateUserParams {
  username: string
  email: string
  phone?: string
  role: UserRole
  status: UserStatus
  balance: number
  password: string
  remark?: string
}

// 用户更新参数接口
export interface UpdateUserParams {
  username?: string
  email?: string
  phone?: string
  role?: UserRole
  status?: UserStatus
  balance?: number
  password?: string
  remark?: string
}

// 密码重置参数接口
export interface ResetPasswordParams {
  userId: string
  newPassword: string
}

// 余额调整参数接口
export interface AdjustBalanceParams {
  userId: string
  amount: number
  type: 'increase' | 'decrease'
  reason: string
}

// 用户导出参数接口
export interface ExportUsersParams {
  userIds?: string[]
  format: 'excel' | 'csv'
  fields: string[]
  filters?: UserSearchParams
  search?: string
  status?: UserStatus
  role?: UserRole
}

// 用户模态框模式类型
export type UserModalMode = 'view' | 'edit' | 'create'

// 用户操作日志接口
export interface UserOperationLog {
  id: string
  userId: string
  operatorId: string
  operatorName: string
  operation: string
  description: string
  oldData?: any
  newData?: any
  ip: string
  userAgent: string
  created_at: string
}

// 用户登录历史接口
export interface UserLoginHistory {
  id: string
  userId: string
  ip: string
  userAgent: string
  location?: string
  loginTime: string
  logoutTime?: string
  status: 'success' | 'failed'
}

// API 响应基础接口
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}