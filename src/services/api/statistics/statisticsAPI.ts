/**
 * 统计分析API
 */
import type { OrderStats, RevenueStats, StatisticsParams, UserActivityStats } from '../../../types/api';
import { apiClient } from '../core/apiClient';
import type { ApiResponse } from '../core/types';

export interface OverviewStats {
  total_users: number
  total_orders: number
  total_revenue: number
  orders_change: number
  revenue_change: number
  active_users: number
  users_change: number
  online_bots: number
  bots_change: number
  new_users: number
  paying_users: number
  conversion_rate: number
  retention_rate: number
}

export interface OrderTrendData {
  date: string
  orders: number
  revenue: number
}

export interface RevenueAnalysisData {
  period: string
  revenue: number
  change: number
  percentage: number
}

export interface BotStatusStats {
  online: number
  offline: number
  error: number
  maintenance: number
  chart_data: Array<{ 
    status: string
    count: number
    percentage: number 
  }>
}

export const statisticsAPI = {
  /**
   * 获取总览统计
   */
  getOverview: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<OverviewStats>>('/api/statistics/overview', { params }),
  
  /**
   * 获取订单统计
   */
  getOrderStats: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<OrderStats>>('/api/statistics/orders', { params }),
  
  /**
   * 获取收入统计
   */
  getRevenueStats: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<RevenueStats>>('/api/statistics/revenue', { params }),
  
  /**
   * 获取用户活跃度统计
   */
  getUserActivityStats: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<UserActivityStats>>('/api/statistics/user-activity', { params }),

  /**
   * 获取订单趋势
   */
  getOrderTrend: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<OrderTrendData[]>>('/api/statistics/order-trend', { params }),

  /**
   * 获取收入分析
   */
  getRevenueAnalysis: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<RevenueAnalysisData[]>>('/api/statistics/revenue-analysis', { params }),

  /**
   * 获取机器人状态
   */
  getBotStatus: () => 
    apiClient.get<ApiResponse<BotStatusStats>>('/api/statistics/bot-status'),

  /**
   * 获取实时统计
   */
  getRealTimeStats: () => 
    apiClient.get<ApiResponse<{
      active_users: number
      pending_orders: number
      processing_orders: number
      system_status: string
    }>>('/api/statistics/realtime'),

  /**
   * 导出统计报告
   */
  exportReport: (params?: StatisticsParams & { format?: 'excel' | 'pdf' }) => 
    apiClient.get<Blob>('/api/statistics/export', { 
      params, 
      responseType: 'blob' 
    })
};

export default statisticsAPI;
