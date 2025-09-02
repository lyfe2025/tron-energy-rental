/**
 * 能量池扩展API - 匹配拆分后的后端服务
 */
import { apiClient } from '../core/apiClient';
import type { ApiResponse } from '../core/types';

// 扩展现有的energyPoolAPI
import { energyPoolAPI } from './energyPoolAPI';

// 新增的接口定义
export interface EnergyPoolStatistics {
  totalAccounts: number;
  activeAccounts: number;
  totalEnergy: number;
  availableEnergy: number;
  reservedEnergy: number;
  utilizationRate: number;
}

export interface EnergyPoolAccount {
  id: string;
  name: string;
  tron_address: string;
  total_energy: number;
  available_energy: number;
  reserved_energy: number;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}

export interface TodayConsumption {
  total_consumed_energy: number;
  total_cost: number;
  total_transactions: number;
  account_breakdown: Array<{
    pool_account_id: string;
    account_name: string;
    total_consumed_energy: number;
    total_cost: number;
  }>;
}

export interface EnergyAllocation {
  poolAccountId: string;
  energyAmount: number;
  estimatedCost: number;
}

export interface OptimizationResult {
  allocations: EnergyAllocation[];
  totalCost: number;
  success: boolean;
  message?: string;
}

// 扩展API方法
export const energyPoolExtendedAPI = {
  ...energyPoolAPI,
  
  /**
   * 获取能量池统计信息
   */
  getStatistics: () => 
    apiClient.get<ApiResponse<EnergyPoolStatistics>>('/api/energy-pool/statistics'),

  /**
   * 获取能量池账户列表
   */
  getAccounts: () => 
    apiClient.get<ApiResponse<EnergyPoolAccount[]>>('/api/energy-pool/accounts'),

  /**
   * 刷新能量池状态
   */
  refreshStatus: () => 
    apiClient.post<ApiResponse<{ message: string }>>('/api/energy-pool/refresh-status'),

  /**
   * 优化能量分配
   */
  optimizeAllocation: (requiredEnergy: number) => 
    apiClient.post<ApiResponse<OptimizationResult>>('/api/energy-pool/optimize-allocation', {
      requiredEnergy
    }),

  /**
   * 添加能量池账户
   */
  addAccount: (accountData: Omit<EnergyPoolAccount, 'id' | 'created_at' | 'updated_at'>) => 
    apiClient.post<ApiResponse<{ accountId: string }>>('/api/energy-pool/accounts', accountData),

  /**
   * 更新能量池账户
   */
  updateAccount: (id: string, updates: Partial<EnergyPoolAccount>) => 
    apiClient.put<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}`, updates),

  /**
   * 启用账户
   */
  enableAccount: (id: string) => 
    apiClient.post<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}/enable`),

  /**
   * 停用账户
   */
  disableAccount: (id: string) => 
    apiClient.post<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}/disable`),

  /**
   * 删除账户
   */
  deleteAccount: (id: string) => 
    apiClient.delete<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}`),

  /**
   * 获取今日消耗统计
   */
  getTodayConsumption: () => 
    apiClient.get<ApiResponse<TodayConsumption>>('/api/energy-pool/consumption/today'),

  /**
   * 获取消耗趋势
   */
  getConsumptionTrend: (days: number = 30) => 
    apiClient.get<ApiResponse<Array<{
      date: string;
      consumption: number;
      cost: number;
      transactionCount: number;
    }>>>('/api/energy-pool/consumption/trend', { params: { days } }),

  /**
   * 预留能量
   */
  reserveEnergy: (data: {
    poolAccountId: string;
    energyAmount: number;
    transactionId: string;
    userId?: string;
  }) => 
    apiClient.post<ApiResponse<{ message: string }>>('/api/energy-pool/reserve', data),

  /**
   * 释放预留能量
   */
  releaseEnergy: (data: {
    poolAccountId: string;
    energyAmount: number;
    transactionId: string;
    userId?: string;
  }) => 
    apiClient.post<ApiResponse<{ message: string }>>('/api/energy-pool/release', data),

  /**
   * 确认能量使用
   */
  confirmEnergyUsage: (data: {
    poolAccountId: string;
    energyAmount: number;
    transactionId: string;
    userId?: string;
  }) => 
    apiClient.post<ApiResponse<{ message: string }>>('/api/energy-pool/confirm', data),

  /**
   * 获取预留统计
   */
  getReservationStats: (timeRange?: { start: string; end: string }) => 
    apiClient.get<ApiResponse<{
      totalReservations: number;
      totalEnergyReserved: number;
      totalEnergyReleased: number;
      totalEnergyConfirmed: number;
      currentlyReserved: number;
    }>>('/api/energy-pool/reservations/stats', { params: timeRange }),

  /**
   * 清理过期预留
   */
  cleanupExpiredReservations: (expirationHours: number = 24) => 
    apiClient.post<ApiResponse<{
      releasedCount: number;
      totalEnergyReleased: number;
    }>>('/api/energy-pool/cleanup-expired', { expirationHours })
};

export default energyPoolExtendedAPI;
