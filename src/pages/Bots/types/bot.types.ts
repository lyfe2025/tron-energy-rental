// 机器人相关类型定义

export interface Bot {
  id: string
  name: string
  address: string
  private_key: string
  type: 'energy' | 'bandwidth'
  description?: string
  min_order_amount: number
  max_order_amount: number
  is_active: boolean
  status: 'active' | 'inactive' | 'maintenance' | 'error'
  balance?: number
  trx_balance?: number
  energy_balance?: number
  username?: string
  token?: string
  webhook_url?: string
  webhook_secret?: string
  settings?: unknown
  commands?: BotCommand[]
  welcome_message?: string
  help_message?: string
  error_message?: string
  maintenance_mode?: boolean
  rate_limit?: number
  max_users?: number
  current_users?: number
  total_messages?: number
  total_users?: number
  total_orders?: number
  last_message_at?: string
  created_at?: string
  updated_at?: string
  // 网络配置数组（合并后的字段）
  network_configurations?: BotNetworkConfiguration[]
  // 添加缺失的属性
  stats?: {
    total_orders: number
    total_users: number
    total_balance: number
    user_count: number
    order_count: number
    today_orders: number
    total_revenue: number
  }
  today_orders?: number
  last_activity?: string
}

export interface BotForm {
  name: string
  username: string
  token: string
  description: string
  webhook_url: string
  settings: unknown
  welcome_message: string
  help_message: string
  commands: BotCommand[]
  address?: string
  private_key?: string
  type?: string
  min_order_amount?: number
  max_order_amount?: number
  is_active?: boolean
}

export interface BotStats {
  total: number
  active: number
  inactive: number
  totalBalance: number
}

export interface BotStatCard {
  label: string
  value: number
  icon: unknown
  bgColor: string
  iconColor: string
  change: string | null
  changeColor: string
}

export interface BotFilters {
  searchQuery: string
  statusFilter: string
  typeFilter: string
}

export interface BotPagination {
  currentPage: number
  pageSize: number
  totalPages: number
}

export interface BotCommand {
  command: string
  description: string
  enabled: boolean
}

export type BotModalMode = 'view' | 'edit' | 'create'

// 机器人网络配置接口（与后端保持一致）
export interface BotNetworkConfiguration {
  id: string
  network_id: string
  network_name: string
  network_type: string
  rpc_url: string
  is_active: boolean
  is_primary: boolean
  priority: number
  config: Record<string, any>
  api_settings: Record<string, any>
  contract_addresses: Record<string, string>
  gas_settings: Record<string, any>
  monitoring_settings: Record<string, any>
  last_sync_at?: string
  sync_status: 'pending' | 'success' | 'error'
  error_count: number
  last_error?: string
  last_error_at?: string
  created_at: string
  updated_at: string
}

// 网络配置操作请求接口
export interface AddBotNetworkConfigRequest {
  bot_id: string
  network_id: string
  is_active?: boolean
  is_primary?: boolean
  priority?: number
  config?: Record<string, any>
  api_settings?: Record<string, any>
  contract_addresses?: Record<string, string>
  gas_settings?: Record<string, any>
  monitoring_settings?: Record<string, any>
}

export interface UpdateBotNetworkConfigRequest {
  bot_id: string
  config_id: string
  is_active?: boolean
  is_primary?: boolean
  priority?: number
  config?: Record<string, any>
  api_settings?: Record<string, any>
  contract_addresses?: Record<string, string>
  gas_settings?: Record<string, any>
  monitoring_settings?: Record<string, any>
}