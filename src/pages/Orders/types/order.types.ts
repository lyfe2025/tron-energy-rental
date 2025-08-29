// 订单状态枚举 - 与后端保持一致
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'active' | 'completed' | 'failed' | 'cancelled' | 'expired'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

// 订单接口 - 与后端数据结构匹配
export interface Order {
  id: number
  user_id: number
  package_id?: number
  energy_amount: number
  duration_hours: number
  price_trx: number
  recipient_address: string
  status: OrderStatus
  payment_address?: string
  payment_amount?: number
  payment_tx_hash?: string
  delegation_tx_hash?: string
  error_message?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

// 订单统计接口 - 与后端保持一致
export interface OrderStats {
  total: number
  pending: number
  paid: number
  processing: number
  active: number
  completed: number
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
  orderId: number
  status: OrderStatus
  payment_tx_hash?: string
  // 移除不存在的字段
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