// 用户基础信息接口（对应users表）
export interface User {
  id: string
  telegram_id: number
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  language_code?: string | null
  email?: string | null
  phone?: string | null
  status: AllUserStatus
  tron_address?: string | null
  balance: string | number
  usdt_balance: string | number
  trx_balance: string | number
  total_orders?: number
  total_spent?: number
  total_energy_used?: number
  referral_code?: string | null
  referred_by?: string | null
  password_hash?: string | null
  login_type?: 'telegram' | 'admin' | 'both'
  user_type?: 'normal' | 'vip' | 'premium'
  last_login_at?: string | null
  last_login?: string | null
  login_count?: number
  remark?: string
  agent_id?: string | null
  bot_id?: string | null  // 新增：关联的机器人ID
  bot_name?: string | null  // 新增：机器人名称（用于显示）
  bot_username?: string | null  // 新增：机器人用户名（用于显示）
  created_at: string
  updated_at: string
}

// 代理商信息接口（对应agents表）
export interface Agent {
  id: string
  name: string
  email: string
  phone?: string | null
  status: AgentStatus
  commission_rate: number
  balance: string | number
  total_commission: string | number
  total_orders: number
  created_at: string
  updated_at: string
}

// 管理员信息接口（对应admins表）
export interface Admin {
  id: string
  username: string
  email: string
  phone?: string | null
  status: AdminStatus
  last_login_at?: string | null
  last_login?: string | null
  login_count?: number
  created_at: string
  updated_at: string
}

// 统一用户接口（用于前端显示）
export interface UnifiedUser {
  id: string
  login_type: 'telegram' | 'admin' | 'both'
  user_type: 'normal' | 'vip' | 'premium'
  username?: string | null
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  status: AllUserStatus
  balance: string | number
  usdt_balance: string | number
  trx_balance: string | number
  last_login_at?: string | null
  last_login?: string | null
  login_count?: number
  remark?: string
  created_at: string
  updated_at: string
  // 扩展字段
  telegram_id: number
  agent_id?: string | null
  commission_rate?: number
  total_commission?: string | number
  total_orders?: number
  
  // 管理员特有字段（保留用于兼容）
  permissions?: string[]
  role?: string
  
  // 向后兼容字段
  type?: 'telegram_user' | 'agent' | 'admin'
}

// 用户状态类型
export type UserStatus = 'active' | 'banned';

// 代理商状态类型
export type AgentStatus = 'pending' | 'active' | 'inactive' | 'rejected';

// 管理员状态类型
export type AdminStatus = 'active' | 'inactive';

// 统一用户状态类型
export type AllUserStatus = UserStatus | AgentStatus | AdminStatus;

// 用户角色类型（保持向后兼容）
export type UserRole = 'user';

// 用户表单数据接口
export interface UserFormData {
  id: string
  login_type: 'telegram' | 'admin' | 'both' | ''
  user_type: 'normal' | 'vip' | 'premium' | ''
  telegram_id?: number
  username?: string
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  status: AllUserStatus
  balance?: number
  usdt_balance?: number
  trx_balance?: number
  password?: string
  confirmPassword?: string
  agent_id?: string
  bot_id?: string  // 新增：关联的机器人ID
  commission_rate?: number
  // 完善所有数据库字段
  tron_address?: string
  total_orders?: number
  total_energy_used?: number
  referral_code?: string
  referred_by?: string
  created_at: string
  updated_at: string
  last_login?: string
  permissions?: string[]
  role?: string
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
  status: AllUserStatus | ''
  login_type: 'telegram' | 'admin' | 'both' | ''
  user_type?: 'normal' | 'vip' | 'premium' | ''
  bot_filter?: string  // 新增：机器人筛选
  dateRange: {
    start: string
    end: string
  }
  // 向后兼容字段
  type?: 'telegram_user' | 'agent' | 'admin' | ''
}

// 用户列表查询参数接口
export interface UserListParams {
  page: number
  pageSize: number
  search?: string
  status?: AllUserStatus
  type?: UserRole
  user_type?: 'normal' | 'vip' | 'premium'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

// 用户列表响应接口
export interface UserListResponse {
  users: UnifiedUser[]
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
  | 'typeChange'
  | 'resetPassword'
  | 'sendNotification'

// 用户创建参数接口
export interface CreateUserParams {
  login_type: 'telegram' | 'admin' | 'both'
  user_type: 'normal' | 'vip' | 'premium'
  username?: string
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  status: AllUserStatus
  balance?: number
  password?: string
  remark?: string
  role?: string
  // Telegram用户特有字段
  telegram_id?: number
  agent_id?: string
  // 代理商特有字段
  name?: string
  commission_rate?: number
  // 机器人关联字段
  bot_id?: string
}

// 用户更新参数接口
export interface UpdateUserParams {
  login_type?: 'telegram' | 'admin' | 'both'
  user_type?: 'normal' | 'vip' | 'premium'
  username?: string
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  status?: 'active' | 'inactive' | 'banned'
  balance?: number
  usdt_balance?: number
  trx_balance?: number
  password?: string
  tron_address?: string
  referral_code?: string
  referred_by?: string
  // 代理商特有字段
  name?: string
  commission_rate?: number
  agent_id?: string
  // 机器人关联字段
  bot_id?: string
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
  status?: AllUserStatus
  type?: UserRole
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