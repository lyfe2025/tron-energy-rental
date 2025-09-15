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
  totalBandwidth: number;
  availableBandwidth: number;
  utilizationRate: number;
  bandwidthUtilizationRate: number;
  averageCostPerEnergy: number;
  averageCostPerBandwidth: number;
}

export interface EnergyPoolAccount {
  id: string;
  name: string;
  tron_address: string;
  private_key_encrypted: string;
  total_energy: number;
  available_energy: number;
  total_bandwidth: number;
  available_bandwidth: number;
  status: 'active' | 'inactive' | 'maintenance';
  account_type: 'own_energy' | 'agent_energy' | 'third_party';
  priority: number;
  cost_per_energy: number;
  description?: string;
  contact_info?: any;
  daily_limit?: number;
  monthly_limit?: number;
  network_config?: {
    id: string;
    name: string;
    type: string;
    rpc_url: string;
    chain_id?: string;
  };
  created_at: string;
  updated_at: string;
  last_updated_at?: string;
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
  getStatistics: (networkId?: string) => {
    const params = networkId ? { network_id: networkId } : {};
    return apiClient.get<ApiResponse<EnergyPoolStatistics>>('/api/energy-pool/statistics', { params });
  },

  /**
   * 获取可用的TRON网络列表
   */
  getNetworks: () => 
    apiClient.get<ApiResponse<Array<{
      id: string;
      name: string;
      type: string;
      rpc_url: string;
      is_active: boolean;
      health_status?: string;
    }>>>('/api/energy-pool/networks'),

  /**
   * 获取能量池账户列表
   */
  getAccounts: (networkId?: string) => 
    apiClient.get<ApiResponse<EnergyPoolAccount[]>>('/api/energy-pool/accounts', {
      params: networkId ? { networkId } : undefined
    }),

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
   * 验证TRON地址并获取账户信息
   */
  validateTronAddress: (data: {
    address: string
    private_key?: string
    network_id?: string
  }) => 
    apiClient.post<ApiResponse<{
      address: string
      balance: number
      usdtBalance: number
      energy: {
        total: number
        available: number
        used: number
      }
      bandwidth: any
      frozenInfo: any[]
      estimatedCostPerEnergy: number
      networkInfo: {
        id: string
        name: string
        type: string
        rpcUrl: string
      }
      usdtInfo?: {
        error?: string
      }
      contractInfo?: {
        address: string
        decimals: number
        type: string
        symbol: string
        name: string
      } | null
      isValid: boolean
    }>>('/api/energy-pool/accounts/validate-address', data),

  /**
   * 添加能量池账户（自动获取TRON数据）
   */
  addAccount: (accountData: {
    name: string
    tron_address: string
    private_key_encrypted: string
    account_type?: string
    priority?: number
    description?: string
    daily_limit?: number
    monthly_limit?: number
    status?: string
  }) => 
    apiClient.post<ApiResponse<{ 
      id: string
      tronData: {
        total_energy: number
        available_energy: number
        cost_per_energy: number
        balance: number
        frozen_balance: number
      }
    }>>('/api/energy-pool/accounts', accountData),

  /**
   * 获取单个能量池账户详情
   */
  getAccount: (id: string, includePrivateKey: boolean = false) => 
    apiClient.get<ApiResponse<EnergyPoolAccount>>(`/api/energy-pool/accounts/${id}`, {
      params: includePrivateKey ? { include_private_key: 'true' } : {}
    }),

  /**
   * 更新能量池账户
   */
  updateAccount: (id: string, updates: Partial<EnergyPoolAccount>) => 
    apiClient.put<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}`, updates),

  /**
   * 启用账户
   */
  enableAccount: (id: string) => 
    apiClient.put<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}/enable`),

  /**
   * 停用账户
   */
  disableAccount: (id: string) => 
    apiClient.put<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}/disable`),

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
