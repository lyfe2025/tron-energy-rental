import { ref, reactive, computed, onMounted } from 'vue'
import { debounce } from 'lodash-es'
import { ordersAPI } from '@/services/api'
import type {
  Order,
  OrderStats,
  OrderFilters,
  OrderPagination,
  OrderQueryParams,
  OrderStatusUpdateData,
  OrderListResponse,
  OrderModalState,
  OrderManagementState
} from '../types/order.types'

export function useOrderManagement() {
  // 状态管理
  const state = reactive<OrderManagementState>({
    orders: [],
    stats: {
      total: 0,
      pending: 0,
      paid: 0,
      processing: 0,
      active: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      expired: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    },
    filters: {
      search: '',
      status: '',
      dateRange: {
        start: '',
        end: ''
      }
    },
    pagination: {
      page: 1,
      limit: 20,
      total: 0
    },
    isLoading: false,
    error: null,
    modal: {
      showDetailsModal: false,
      showStatusModal: false,
      selectedOrder: null,
      isUpdating: false
    }
  })

  // 计算属性
  const hasFilters = computed(() => {
    return state.filters.search || 
           state.filters.status || 
           state.filters.dateRange.start || 
           state.filters.dateRange.end
  })

  const totalPages = computed(() => {
    return Math.ceil(state.pagination.total / state.pagination.limit)
  })

  // API 调用函数
  const fetchOrders = async (params?: OrderQueryParams) => {
    try {
      state.isLoading = true
      state.error = null

      const queryParams = new URLSearchParams()
      
      // 添加分页参数
      queryParams.append('page', String(params?.page || state.pagination.page))
      queryParams.append('limit', String(params?.limit || state.pagination.limit))
      
      // 添加搜索和过滤参数
      if (params?.search || state.filters.search) {
        queryParams.append('search', params?.search || state.filters.search)
      }
      if (params?.status || state.filters.status) {
        queryParams.append('status', params?.status || state.filters.status)
      }
      if (params?.start_date || state.filters.dateRange.start) {
        queryParams.append('start_date', params?.start_date || state.filters.dateRange.start)
      }
      if (params?.end_date || state.filters.dateRange.end) {
        queryParams.append('end_date', params?.end_date || state.filters.dateRange.end)
      }

      const response = await ordersAPI.getOrders({
        page: params?.page || state.pagination.page,
        limit: params?.limit || state.pagination.limit,
        search: params?.search || state.filters.search || undefined,
        status: params?.status || state.filters.status || undefined,
        start_date: params?.start_date || state.filters.dateRange.start || undefined,
        end_date: params?.end_date || state.filters.dateRange.end || undefined
      })
      
      // 处理API响应数据结构
      if (response.data.success && response.data.data) {
        const data = response.data.data
        state.orders = data.orders || []
        state.pagination = {
          page: data.pagination?.page || 1,
          limit: data.pagination?.limit || 10,
          total: data.pagination?.total || 0
        }
        state.stats = data.stats || null
      } else {
        // API调用成功但数据为空
        state.orders = []
        state.pagination = {
          page: 1,
          limit: 10,
          total: 0
        }
        state.stats = null
      }
      
    } catch (error) {
      console.error('获取订单列表失败:', error)
      state.error = error instanceof Error ? error.message : '获取订单列表失败'
      // 确保在错误情况下也有默认值
      state.orders = []
      state.stats = null
    } finally {
      state.isLoading = false
    }
  }

  const updateOrderStatus = async (data: OrderStatusUpdateData) => {
    try {
      state.modal.isUpdating = true
      
      await ordersAPI.updateOrderStatus(data.orderId, {
        status: data.status,
        payment_tx_hash: data.payment_tx_hash,
      })
      
      // 更新本地状态
      const orderIndex = state.orders.findIndex(order => order.id === parseInt(data.orderId))
      if (orderIndex !== -1) {
        state.orders[orderIndex] = {
          ...state.orders[orderIndex],
          status: data.status,
          payment_tx_hash: data.payment_tx_hash || state.orders[orderIndex].payment_tx_hash,
          updated_at: new Date().toISOString()
        }
      }
      
      // 关闭模态框
      closeStatusModal()
      
      // 刷新统计数据
      await fetchOrders()
      
    } catch (error) {
      console.error('更新订单状态失败:', error)
      state.error = error instanceof Error ? error.message : '更新订单状态失败'
    } finally {
      state.modal.isUpdating = false
    }
  }

  // 防抖搜索
  const debouncedSearch = debounce((searchQuery: string) => {
    state.filters.search = searchQuery
    state.pagination.page = 1
    fetchOrders()
  }, 300)

  // 过滤器操作
  const updateFilters = (filters: Partial<OrderFilters>) => {
    Object.assign(state.filters, filters)
    state.pagination.page = 1
    fetchOrders()
  }

  const clearFilters = () => {
    state.filters = {
      search: '',
      status: '',
      dateRange: {
        start: '',
        end: ''
      }
    }
    state.pagination.page = 1
    fetchOrders()
  }

  // 分页操作
  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      state.pagination.page = page
      fetchOrders()
    }
  }

  const changePageSize = (limit: number) => {
    state.pagination.limit = limit
    state.pagination.page = 1
    fetchOrders()
  }

  // 模态框操作
  const showOrderDetails = (order: Order) => {
    state.modal.selectedOrder = order
    state.modal.showDetailsModal = true
  }

  const closeDetailsModal = () => {
    state.modal.showDetailsModal = false
    state.modal.selectedOrder = null
  }

  const showStatusUpdateModal = (order: Order) => {
    state.modal.selectedOrder = order
    state.modal.showStatusModal = true
  }

  const closeStatusModal = () => {
    state.modal.showStatusModal = false
    state.modal.selectedOrder = null
  }

  // 刷新数据
  const refreshOrders = () => {
    fetchOrders()
  }

  // 初始化
  onMounted(() => {
    fetchOrders()
  })

  return {
    // 状态
    state,
    
    // 计算属性
    hasFilters,
    totalPages,
    
    // 方法
    fetchOrders,
    updateOrderStatus,
    debouncedSearch,
    updateFilters,
    clearFilters,
    changePage,
    changePageSize,
    showOrderDetails,
    closeDetailsModal,
    showStatusUpdateModal,
    closeStatusModal,
    refreshOrders
  }
}