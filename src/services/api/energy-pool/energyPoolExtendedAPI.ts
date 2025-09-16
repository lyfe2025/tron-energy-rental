/**
 * 能量池扩展API - 清理版本（移除废弃的消耗统计和预留接口）
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

// 移除了 TodayConsumption 接口，因为相关功能已废弃

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

// 基于 TRON 实时数据的新统计接口
export interface TronRealtimeStats {
  totalDelegatedEnergy: number;
  activeDelegations: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  lastUpdated: string;
}

// 清理后的API方法
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

  // =====================================================================
  // 以下方法已移除，改为基于 TRON 实时数据和订单记录的统计
  // =====================================================================
  
  /**
   * @deprecated 已移除 - 获取基于订单记录的实时统计
   * 替代方案：使用 getOrderBasedStats() 和 getTronRealtimeStats()
   */
  getTodayConsumption: () => {
    console.warn('[API] getTodayConsumption 已废弃，请使用基于 TRON 实时数据的统计接口');
    return Promise.reject(new Error('此接口已废弃，请使用基于 TRON 实时数据的统计'));
  },

  /**
   * @deprecated 已移除 - 获取基于订单记录的趋势统计
   */
  getConsumptionTrend: (days: number = 30) => {
    console.warn('[API] getConsumptionTrend 已废弃，请使用基于订单记录的趋势分析');
    return Promise.reject(new Error('此接口已废弃，请使用基于订单记录的趋势分析'));
  },

  /**
   * @deprecated 已移除 - 预留机制已取消，改为实时分配
   */
  reserveEnergy: (data: any) => {
    console.warn('[API] reserveEnergy 已废弃，现在直接进行实时能量分配');
    return Promise.reject(new Error('预留机制已移除，请使用实时能量分配'));
  },

  /**
   * @deprecated 已移除 - 预留机制已取消
   */
  releaseEnergy: (data: any) => {
    console.warn('[API] releaseEnergy 已废弃');
    return Promise.reject(new Error('预留机制已移除'));
  },

  /**
   * @deprecated 已移除 - 预留机制已取消
   */
  confirmEnergyUsage: (data: any) => {
    console.warn('[API] confirmEnergyUsage 已废弃');
    return Promise.reject(new Error('预留机制已移除'));
  },

  /**
   * @deprecated 已移除 - 预留统计已取消
   */
  getReservationStats: (timeRange?: { start: string; end: string }) => {
    console.warn('[API] getReservationStats 已废弃');
    return Promise.reject(new Error('预留统计已移除'));
  },

  /**
   * @deprecated 已移除 - 预留清理已取消
   */
  cleanupExpiredReservations: (expirationHours: number = 24) => {
    console.warn('[API] cleanupExpiredReservations 已废弃');
    return Promise.reject(new Error('预留清理已移除'));
  },

  // =====================================================================
  // 新增：基于 TRON 实时数据和订单记录的统计接口
  // =====================================================================

  /**
   * 获取基于订单记录的今日统计
   */
  getOrderBasedStats: () => 
    apiClient.get<ApiResponse<{
      totalOrders: number;
      completedOrders: number;
      totalEnergyDelegated: number;
      totalRevenue: number;
      averageOrderValue: number;
      successRate: number;
    }>>('/api/statistics/orders/today'),

  /**
   * 获取基于 TRON 实时数据的统计
   */
  getTronRealtimeStats: () => 
    apiClient.get<ApiResponse<TronRealtimeStats>>('/api/statistics/tron/realtime'),

  /**
   * 获取基于订单记录的趋势分析
   */
  getOrderTrend: (days: number = 30) => 
    apiClient.get<ApiResponse<Array<{
      date: string;
      orderCount: number;
      energyDelegated: number;
      revenue: number;
      successRate: number;
    }>>>('/api/statistics/orders/trend', { params: { days } }),

  /**
   * 获取账户实时能量数据（从 TRON 网络获取）
   */
  getAccountEnergyData: (accountId: string, networkId: string) => 
    apiClient.get<ApiResponse<{
      accountId: string;
      accountName: string;
      tronAddress: string;
      energy: {
        total: number;
        available: number;
        used: number;
      };
      bandwidth: {
        total: number;
        available: number;
        used: number;
      };
      networkInfo: {
        id: string;
        name: string;
        type: string;
      };
      lastUpdated: string;
    }>>(`/api/energy-pool/accounts/${accountId}/energy-data`, {
      params: { networkId }
    })
};

export default energyPoolExtendedAPI;
