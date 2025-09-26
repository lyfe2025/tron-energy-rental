// 订单状态枚举 - 与后端保持一致
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'active' | 'completed' | 'manually_completed' | 'failed' | 'cancelled' | 'expired'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

// 订单接口 - 与后端数据结构匹配
export interface Order {
  id: number
  order_number?: string
  user_id: number
  bot_id?: string
  price_config_id?: number  // 替换package_id为price_config_id，关联price_configs表
  package_id?: number  // 兼容字段
  energy_amount: number
  calculated_units?: number
  duration_hours?: number
  flash_rent_duration?: number
  price_trx?: number
  price?: number  // 兼容字段
  payment_trx_amount?: string | number  // 实际支付的TRX金额
  commission_rate?: number
  commission_amount?: number
  order_type?: string
  recipient_address?: string
  target_address?: string  // 兼容字段
  source_address?: string
  status: OrderStatus
  payment_status?: PaymentStatus
  payment_address?: string
  payment_amount?: number
  payment_tx_hash?: string
  payment_currency?: 'USDT' | 'TRX'  // 支付货币类型
  tron_tx_hash?: string  // 兼容字段
  delegation_tx_hash?: string
  delegate_tx_hash?: string  // 兼容字段
  energy_pool_account_used?: string
  error_message?: string
  processing_details?: any
  retry_count?: number
  expires_at?: string
  completed_at?: string
  processing_started_at?: string
  delegation_started_at?: string
  created_at: string
  updated_at: string
  
  // 用户信息字段 (通过JOIN users表获取)
  telegram_id?: number
  username?: string
  first_name?: string
  last_name?: string
  email?: string
}

// 订单统计接口 - 与后端保持一致
export interface OrderStats {
  total: number
  pending: number
  paid: number
  processing: number
  active: number
  completed: number
  manually_completed: number
  failed: number
  cancelled: number
  expired: number
  totalRevenue: number
  averageOrderValue: number
}

// 订单搜索过滤器接口
export interface OrderFilters {
  search: string
  status: OrderStatus | ''
  dateRange: {
    start: string
    end: string
  }
  orderType?: string
  paymentStatus?: string
  minAmount?: number
  maxAmount?: number
}

// 分页接口
export interface OrderPagination {
  page: number
  limit: number
  total: number
}

// 订单查询参数接口
export interface OrderQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: OrderStatus | ''
  start_date?: string
  end_date?: string
}

// 订单状态更新数据接口
export interface OrderStatusUpdateData {
  orderId: string
  status: OrderStatus
  tron_tx_hash?: string
  errorMessage?: string
}

// API 响应接口
export interface OrderListResponse {
  orders: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: OrderStats
}

// 订单状态选项接口
export interface OrderStatusOption {
  value: OrderStatus | ''
  label: string
}

// 订单操作结果接口
export interface OrderOperationResult {
  success: boolean
  message: string
  data?: any
}

// 订单详情模态框状态接口
export interface OrderModalState {
  showDetailsModal: boolean
  showStatusModal: boolean
  selectedOrder: Order | null
  isUpdating: boolean
}

// 订单管理状态接口
export interface OrderManagementState {
  orders: any[] // 使用 any 类型避免类型冲突
  stats: OrderStats
  filters: OrderFilters
  pagination: OrderPagination
  isLoading: boolean
  error: string | null
  modal: OrderModalState
}