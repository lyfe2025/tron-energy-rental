// 菜单状态枚举
export enum MenuStatus {
  ACTIVE = 1,
  INACTIVE = 0
}

// 菜单类型枚举
export enum MenuType {
  MENU = 1,
  BUTTON = 2,
  LINK = 3
}

// 菜单图标类型枚举
export enum MenuIconType {
  LUCIDE = 'lucide',
  CUSTOM = 'custom'
}

// 基础菜单接口
export interface Menu {
  id: number
  name: string
  path?: string
  component?: string
  icon?: string
  type: number
  status: number
  sort_order: number
  parent_id?: number
  permission?: string  // 后端字段名是permission，不是permission_key
  visible?: number     // 数据库字段，1表示可见，0表示隐藏
  created_at: string
  updated_at: string
}

// 创建菜单请求
export interface CreateMenuRequest {
  name: string
  path?: string
  component?: string
  icon?: string
  type: number
  status: number
  sort_order: number
  parent_id?: number
  permission?: string  // 后端字段名是permission
  visible?: number     // 数据库字段，1表示可见，0表示隐藏
}

// 更新菜单请求
export interface UpdateMenuRequest {
  name?: string
  path?: string
  component?: string
  icon?: string
  type?: number
  status?: number
  sort_order?: number
  parent_id?: number
  permission?: string  // 后端字段名是permission
  visible?: number     // 数据库字段，1表示可见，0表示隐藏
}

// 菜单查询参数
export interface MenuQuery {
  name?: string
  type?: number
  status?: number
  parent_id?: number
  permission_key?: string
  is_hidden?: boolean
  page?: number
  limit?: number
}

// 菜单树节点
export interface MenuTreeNode extends Menu {
  children?: MenuTreeNode[]
  level?: number
  hasChildren?: boolean
  
  // 为了兼容前端表单，保留这些计算属性
  readonly icon_type?: MenuIconType
  readonly permission_key?: string
  readonly is_hidden?: boolean
  readonly description?: string
  readonly is_cache?: boolean
  readonly is_affix?: boolean
  readonly redirect?: string
  readonly meta?: Record<string, any>
}

// 菜单选项
export interface MenuOption {
  value: number
  label: string
  children?: MenuOption[]
}

// API 响应类型
export interface MenuResponse {
  success: boolean
  data: Menu
  message?: string
}

export interface MenuListResponse {
  success: boolean
  data: Menu[]
  message?: string
}

export interface MenuTreeResponse {
  success: boolean
  data: MenuTreeNode[]
  message?: string
}

export interface MenuOptionsResponse {
  success: boolean
  data: MenuOption[]
  message?: string
}

// 菜单统计
export interface MenuStats {
  total: number
  active: number
  inactive: number
  menu_count: number
  button_count: number
  link_count: number
}

export interface MenuStatsResponse {
  success: boolean
  data: MenuStats
  message?: string
}

// 批量操作
export interface BatchMenuOperation {
  action: 'delete' | 'activate' | 'deactivate' | 'move'
  menu_ids: number[]
  target_parent_id?: number
}

export interface BatchOperationResponse {
  success: boolean
  data: {
    success_count: number
    failed_count: number
    failed_items?: Array<{
      id: number
      error: string
    }>
  }
  message?: string
}

// 移动菜单请求
export interface MoveMenuRequest {
  menu_id: number
  target_parent_id?: number
  target_position: number
}

// 分页
export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

// 错误响应
export interface ErrorResponse {
  success: false
  message: string
  errors?: Record<string, string[]>
}

// 菜单权限
export interface MenuPermission {
  id: number
  menu_id: number
  permission_key: string
  permission_name: string
  description?: string
  created_at: string
  updated_at: string
}

// 菜单权限请求
export interface MenuPermissionRequest {
  menu_id: number
  permission_key: string
  permission_name: string
  description?: string
}

// 菜单权限响应
export interface MenuPermissionResponse {
  success: boolean
  data: MenuPermission[]
  message?: string
}

// 菜单路由配置
export interface MenuRoute {
  path: string
  name: string
  component?: string
  redirect?: string
  meta: {
    title: string
    icon?: string
    hidden?: boolean
    cache?: boolean
    affix?: boolean
    permission?: string
    [key: string]: any
  }
  children?: MenuRoute[]
}

// 菜单路由响应
export interface MenuRouteResponse {
  success: boolean
  data: MenuRoute[]
  message?: string
}

// 菜单复制请求
export interface CopyMenuRequest {
  source_menu_id: number
  target_parent_id?: number
  name_suffix?: string
  copy_children?: boolean
}

// 菜单导出数据
export interface MenuExportData {
  menus: Menu[]
  permissions: MenuPermission[]
  export_time: string
  version: string
}

// 菜单导入请求
export interface MenuImportRequest {
  data: MenuExportData
  overwrite_existing?: boolean
  import_permissions?: boolean
}

// 菜单导入响应
export interface MenuImportResponse {
  success: boolean
  data: {
    imported_menus: number
    imported_permissions: number
    skipped_menus: number
    errors: string[]
  }
  message?: string
}

// 菜单使用情况
export interface MenuUsage {
  menu_id: number
  menu_name: string
  role_count: number
  user_count: number
  last_accessed?: string
}

// 菜单使用情况响应
export interface MenuUsageResponse {
  success: boolean
  data: MenuUsage[]
  message?: string
}

// 菜单变更日志
export interface MenuChangeLog {
  id: number
  menu_id: number
  menu_name: string
  action: 'create' | 'update' | 'delete' | 'move'
  changes: Record<string, { old: any; new: any }>
  operator_id: number
  operator_name: string
  created_at: string
}

// 菜单变更日志响应
export interface MenuChangeLogResponse {
  success: boolean
  data: {
    logs: MenuChangeLog[]
    pagination: Pagination
  }
  message?: string
}

// 菜单验证规则
export interface MenuValidationRules {
  name: {
    required: boolean
    min_length: number
    max_length: number
  }
  path: {
    pattern?: string
    unique?: boolean
  }
  permission_key: {
    pattern?: string
    unique?: boolean
  }
  sort_order: {
    min: number
    max: number
  }
}

// 菜单配置
export interface MenuConfig {
  max_depth: number
  default_icon: string
  validation_rules: MenuValidationRules
  supported_icon_types: MenuIconType[]
  supported_menu_types: MenuType[]
}

// 菜单配置响应
export interface MenuConfigResponse {
  success: boolean
  data: MenuConfig
  message?: string
}