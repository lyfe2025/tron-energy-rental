/**
 * 订单管理API
 */
import type { Order, OrderStats, UpdateOrderStatusData } from '../../../types/api';
import { apiClient } from '../core/apiClient';
import type { ApiResponse, QueryParams } from '../core/types';

export interface OrderQueryParams extends QueryParams {
  status?: string
  user_id?: string
  start_date?: string
  end_date?: string
}

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

export interface ProcessOrderResponse {
  message: string
}

export const ordersAPI = {
  /**
   * 获取订单列表
   */
  getOrders: (params?: OrderQueryParams) => 
    apiClient.get<ApiResponse<OrderListResponse>>('/api/orders', { params }),
  
  /**
   * 获取订单详情
   */
  getOrder: (id: string) => 
    apiClient.get<ApiResponse<Order>>(`/api/orders/${id}`),
  
  /**
   * 更新订单状态
   */
  updateOrderStatus: (id: string, data: UpdateOrderStatusData) => 
    apiClient.put<ApiResponse<Order>>(`/api/orders/${id}/status`, data),
  
  /**
   * 处理订单
   */
  processOrder: (id: string) => 
    apiClient.post<ApiResponse<ProcessOrderResponse>>(`/api/orders/${id}/process`),

  /**
   * 取消订单
   */
  cancelOrder: (id: string, reason?: string) => 
    apiClient.post<ApiResponse<Order>>(`/api/orders/${id}/cancel`, { reason }),

  /**
   * 批量处理订单
   */
  batchProcessOrders: (orderIds: string[]) => 
    apiClient.post<ApiResponse<void>>('/api/orders/batch/process', { orderIds }),

  /**
   * 获取订单统计
   */
  getOrderStats: (params?: { start_date?: string; end_date?: string }) => 
    apiClient.get<ApiResponse<OrderStats>>('/api/orders/stats', { params }),

  /**
   * 导出订单数据
   */
  exportOrders: (params?: OrderQueryParams) => 
    apiClient.get<Blob>('/api/orders/export', { 
      params, 
      responseType: 'blob' 
    }),

  /**
   * 重新发送订单通知
   */
  resendNotification: (id: string) => 
    apiClient.post<ApiResponse<void>>(`/api/orders/${id}/resend-notification`)
};

export default ordersAPI;
