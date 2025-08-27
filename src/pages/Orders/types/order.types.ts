// 订单状态枚举
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

// 订单接口
export interface Order {
  id: string
  user_id: string
  user_address?: string
  energy_amount: number
  amount: number
  status: OrderStatus
  tx_hash?: string
  error_message?: string
  created_at: string
  updated_at: string
}

// 订单统计接口
export interface OrderStats {
  pending: number
  processing: number
  completed: number
  failed: number
  cancelled: number
  total: number
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
  orderId: string
  status: OrderStatus
  txHash?: string
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
  orders: Order[]
  stats: OrderStats
  filters: OrderFilters
  pagination: OrderPagination
  isLoading: boolean
  error: string | null
  modal: OrderModalState
}