/**
 * 质押管理API
 */
import { apiClient } from '../core/apiClient';
import type { ApiResponse } from '../core/types';

export interface StakeOverview {
  totalStaked: number
  totalDelegated: number
  totalUnfreezing: number
  availableToWithdraw: number
  stakingRewards: number
  delegationRewards: number
}

export interface StakeStatistics {
  totalStakedTrx: number
  totalDelegatedEnergy: number
  totalDelegatedBandwidth: number
  pendingUnfreezes: number
  availableToWithdraw: number
  estimatedDailyRewards: number
}

export interface StakeOperationData {
  poolId: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
}

export interface DelegateOperationData extends StakeOperationData {
  toAddress: string
}

export interface StakeOperationResult {
  txid: string
  message: string
}

export interface WithdrawResult extends StakeOperationResult {
  amount: number
}

export interface StakeRecord {
  id: string
  poolId: string
  txid: string
  operationType: 'freeze' | 'unfreeze'
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
  unfreezeTime?: string
  status: 'pending' | 'success' | 'failed'
  createdAt: string
}

export interface StakeRecordsResponse extends Array<StakeRecord> {}

export interface PaginatedApiResponse<T> {
  success: boolean
  data: T
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message?: string
}

export const stakeAPI = {
  /**
   * 获取质押概览
   */
  getOverview: (poolId: string) => 
    apiClient.get<ApiResponse<StakeOverview>>(`/api/energy-pool/stake/overview?poolId=${poolId}`),

  /**
   * 获取质押统计信息
   */
  getStatistics: (poolId: string) => 
    apiClient.get<ApiResponse<StakeStatistics>>(`/api/energy-pool/stake/statistics?poolId=${poolId}`),

  /**
   * 质押TRX
   */
  freezeTrx: (data: StakeOperationData) => 
    apiClient.post<ApiResponse<StakeOperationResult>>('/api/energy-pool/stake/freeze', data),

  /**
   * 解质押TRX
   */
  unfreezeTrx: (data: Omit<StakeOperationData, 'lockPeriod'>) => 
    apiClient.post<ApiResponse<StakeOperationResult>>('/api/energy-pool/stake/unfreeze', data),

  /**
   * 委托资源
   */
  delegateResource: (data: DelegateOperationData) => 
    apiClient.post<ApiResponse<StakeOperationResult>>('/api/energy-pool/stake/delegate', data),

  /**
   * 取消委托资源
   */
  undelegateResource: (data: Omit<DelegateOperationData, 'lockPeriod'>) => 
    apiClient.post<ApiResponse<StakeOperationResult>>('/api/energy-pool/stake/undelegate', data),

  /**
   * 提取已解质押资金
   */
  withdrawUnfrozen: (data: { poolId: string }) => 
    apiClient.post<ApiResponse<WithdrawResult>>('/api/energy-pool/stake/withdraw', data),

  /**
   * 获取质押记录
   */
  getStakeRecords: (params: {
    poolId: string
    page?: number
    limit?: number
    operationType?: 'freeze' | 'unfreeze'
    resourceType?: 'ENERGY' | 'BANDWIDTH'
    startDate?: string
    endDate?: string
  }) => 
    apiClient.get<PaginatedApiResponse<StakeRecordsResponse>>('/api/energy-pool/stake/records', { params }),

  /**
   * 获取委托记录
   */
  getDelegateRecords: (params: {
    poolId: string
    page?: number
    limit?: number
    operationType?: 'delegate' | 'undelegate'
    resourceType?: 'ENERGY' | 'BANDWIDTH'
    startDate?: string
    endDate?: string
  }) => 
    apiClient.get<PaginatedApiResponse<StakeRecordsResponse>>('/api/energy-pool/stake/delegates', { params }),

  /**
   * 获取解冻记录
   */
  getUnfreezeRecords: (params: {
    poolId: string
    page?: number
    limit?: number
  }) => 
    apiClient.get<PaginatedApiResponse<Array<{
      id: string
      poolId: string
      txid: string
      amount: number
      resource_type: 'ENERGY' | 'BANDWIDTH'
      unfreeze_time: string
      withdrawable_time: string
      status: 'unfreezing' | 'withdrawable' | 'withdrawn'
      created_at: string
      canWithdraw?: boolean
      daysUntilWithdrawable?: number
    }>>>('/api/energy-pool/stake/unfreezes', { params })
};

export default stakeAPI;
