// 机器人相关类型定义

export interface Bot {
  id: string
  name: string
  address: string
  private_key?: string
  type: 'energy' | 'bandwidth' | 'mixed'
  status: 'online' | 'offline' | 'error' | 'maintenance' | 'active' | 'inactive'
  description?: string
  balance: number
  energy_balance: number
  today_orders?: number
  total_orders?: number
  min_order_amount?: number
  max_order_amount?: number
  last_activity?: string
  created_at?: string
  updated_at?: string
}

export interface BotForm {
  name: string
  address: string
  private_key: string
  type: 'energy' | 'bandwidth' | 'mixed'
  description: string
  min_order_amount: number
  max_order_amount: number
  is_active: boolean
}

export interface BotStats {
  label: string
  value: number
  icon: any
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

export type BotModalMode = 'view' | 'edit' | 'create'