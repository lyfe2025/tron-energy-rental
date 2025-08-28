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