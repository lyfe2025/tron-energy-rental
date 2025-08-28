/**
 * 管理员管理模块类型定义
 * 基于后端API接口定义的TypeScript类型
 */

// 管理员基础信息
export interface Admin {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  last_login?: string;
  notes?: string; // 添加缺失的notes属性
  created_at: string;
  updated_at: string;
  permissions?: AdminPermission[];
}

// 管理员角色
export interface AdminRoleInfo {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  created_at: string;
}

// 管理员权限配置
export interface AdminPermission {
  id: string;
  admin_id: string;
  role_id: string;
  role_name: string;
  role_description: string;
  permissions: string[];
  granted_at: string;
  name?: string; // 添加缺失的name属性
  description?: string; // 添加缺失的description属性
  resource?: string; // 添加缺失的resource属性
}

// 管理员角色枚举
export type AdminRole = 'super_admin' | 'admin' | 'operator' | 'customer_service';

// 管理员状态枚举
export type AdminStatus = 'active' | 'inactive';

// 管理员查询参数
export interface AdminQuery {
  page?: number;
  limit?: number;
  role?: AdminRole | '';
  status?: AdminStatus | '';
  search?: string;
}

// 管理员搜索参数（扩展查询参数）
export interface AdminSearchParams extends AdminQuery {
  startDate?: string;
  endDate?: string;
  lastLogin?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 创建管理员请求
export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
  role?: AdminRole;
  status?: AdminStatus;
  notes?: string; // 添加缺失的notes属性
}

// 更新管理员请求
export interface UpdateAdminRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: AdminRole;
  status?: AdminStatus;
  notes?: string; // 添加缺失的notes属性
}

// 更新管理员状态请求
export interface UpdateAdminStatusRequest {
  status: AdminStatus;
}

// 分配角色权限请求
export interface AssignRoleRequest {
  role_id: string;
}

// 分配权限请求
export interface AssignPermissionsRequest {
  permission_ids: string[];
}

// 分页信息
export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API响应类型
export interface AdminListResponse {
  admins: Admin[];
  pagination: AdminPagination;
}

export interface AdminDetailResponse {
  admin: Admin;
}

export interface AdminRoleListResponse {
  roles: AdminRoleInfo[];
}

export interface AdminPermissionResponse {
  permission: AdminPermission;
}

// 管理员状态选项
export const ADMIN_STATUS_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '活跃', value: 'active' },
  { label: '停用', value: 'inactive' }
] as const;

// 管理员角色选项
export const ADMIN_ROLE_OPTIONS = [
  { label: '全部角色', value: '' },
  { label: '超级管理员', value: 'super_admin' },
  { label: '管理员', value: 'admin' },
  { label: '操作员', value: 'operator' },
  { label: '客服管理员', value: 'customer_service' }
] as const;

// 管理员状态标签映射
export const ADMIN_STATUS_LABELS: Record<AdminStatus, string> = {
  active: '活跃',
  inactive: '停用'
};

// 管理员角色标签映射
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  operator: '操作员',
  customer_service: '客服管理员'
};

// 管理员状态颜色映射
export const ADMIN_STATUS_COLORS: Record<AdminStatus, string> = {
  active: 'text-green-600 bg-green-100',
  inactive: 'text-gray-600 bg-gray-100'
};

// 管理员角色颜色映射
export const ADMIN_ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'text-purple-600 bg-purple-100',
  admin: 'text-blue-600 bg-blue-100',
  operator: 'text-orange-600 bg-orange-100',
  customer_service: 'text-green-600 bg-green-100'
};