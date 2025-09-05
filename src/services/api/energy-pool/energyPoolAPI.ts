/**
 * 能量池管理API
 */
import { apiClient } from '../core/apiClient';
import type { ApiResponse, PaginatedResponse } from '../core/types';

export interface EnergyPool {
  id: string
  name: string
  description?: string
  total_trx: number
  staked_trx: number
  available_trx: number
  total_energy: number
  delegated_energy: number
  available_energy: number
  performance_rate: number
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  updated_at: string
}

export interface CreateEnergyPoolData {
  name: string
  description?: string
  initial_trx_amount?: number
}

export interface UpdateEnergyPoolData {
  name?: string
  description?: string
  status?: 'active' | 'inactive' | 'maintenance'
}

export const energyPoolAPI = {
  /**
   * 获取能量池列表
   */
  getPools: (params?: {
    page?: number
    limit?: number
    status?: string
    search?: string
  }) => 
    apiClient.get<PaginatedResponse<EnergyPool>>('/api/energy-pool', { params }),

  /**
   * 获取能量池详情
   */
  getPool: (id: string) => 
    apiClient.get<ApiResponse<EnergyPool>>(`/api/energy-pool/${id}`),

  /**
   * 创建能量池
   */
  createPool: (data: CreateEnergyPoolData) => 
    apiClient.post<ApiResponse<EnergyPool>>('/api/energy-pool', data),

  /**
   * 更新能量池
   */
  updatePool: (id: string, data: UpdateEnergyPoolData) => 
    apiClient.put<ApiResponse<EnergyPool>>(`/api/energy-pool/${id}`, data),

  /**
   * 删除能量池
   */
  deletePool: (id: string) => 
    apiClient.delete<ApiResponse<void>>(`/api/energy-pool/${id}`),

  /**
   * 获取能量池统计
   */
  getPoolStats: (id: string) => 
    apiClient.get<ApiResponse<{
      total_transactions: number
      total_volume: number
      success_rate: number
      average_response_time: number
      daily_stats: Array<{
        date: string
        transactions: number
        volume: number
        success_rate: number
      }>
    }>>(`/api/energy-pool/${id}/stats`),

  /**
   * 获取能量池余额
   */
  getPoolBalance: (id: string) => 
    apiClient.get<ApiResponse<{
      trx_balance: number
      energy_balance: number
      bandwidth_balance: number
      frozen_balance: {
        energy: number
        bandwidth: number
      }
      unfreezing_balance: {
        energy: number
        bandwidth: number
        unfreeze_time: string
      }
    }>>(`/api/energy-pool/${id}/balance`),

  /**
   * 充值到能量池
   */
  depositToPool: (id: string, data: {
    amount: number
    currency: 'TRX' | 'USDT'
  }) => 
    apiClient.post<ApiResponse<{
      txid: string
      message: string
    }>>(`/api/energy-pool/${id}/deposit`, data),

  /**
   * 从能量池提取资金
   */
  withdrawFromPool: (id: string, data: {
    amount: number
    currency: 'TRX' | 'USDT'
    to_address?: string
  }) => 
    apiClient.post<ApiResponse<{
      txid: string
      message: string
    }>>(`/api/energy-pool/${id}/withdraw`, data),

  /**
   * 获取账户网络配置
   */
  getAccountNetwork: (accountId: string) => 
    apiClient.get<ApiResponse<{
      network_id: string | null
      network?: {
        id: string
        name: string
        type: string
        rpc_url: string
        chain_id: string
      }
    }>>(`/api/energy-pools-extended/${accountId}/network`),

  /**
   * 设置账户网络配置
   */
  setAccountNetwork: (accountId: string, data: {
    network_id: string
  }) => 
    apiClient.put<ApiResponse<{
      message: string
    }>>(`/api/energy-pools-extended/${accountId}/network`, data),

  /**
   * 批量设置账户网络配置
   */
  batchSetAccountNetwork: (data: {
    networkId: string
    accountIds: string[]
  }) => 
    apiClient.put<ApiResponse<{
      message: string
      updated_count: number
    }>>('/api/energy-pools-extended/batch-network', {
      network_id: data.networkId,
      pool_ids: data.accountIds
    })
};

export default energyPoolAPI;
