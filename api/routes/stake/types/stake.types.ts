/**
 * 质押相关类型定义
 */
import type { Request, Response } from 'express';

// 基础质押操作请求参数
export interface StakeOperationRequest {
  ownerAddress: string
  frozenBalance?: number
  unfreezeBalance?: number
  resource: 'ENERGY' | 'BANDWIDTH'
  poolId?: string
}

// 委托操作请求参数
export interface DelegateOperationRequest {
  ownerAddress: string
  receiverAddress: string
  balance: number
  resource: 'ENERGY' | 'BANDWIDTH'
  lock?: boolean
  lockPeriod?: number
  poolId?: string
}

// 提取操作请求参数
export interface WithdrawRequest {
  ownerAddress: string
  poolId?: string
}

// 查询参数接口
export interface StakeQueryParams {
  address?: string
  poolId?: string
  pool_id?: string
  networkId?: string
  page?: string
  limit?: string
  operationType?: string
  resourceType?: string
  operation_type?: string
  resource_type?: string
  startDate?: string
  endDate?: string
}

// 质押统计响应
export interface StakeStatistics {
  total_stakes: number
  total_staked: number
  total_unstaked: number
  energy_stakes: number
  bandwidth_stakes: number
  total_delegates: number
  total_delegated: number
  energy_delegates: number
  bandwidth_delegates: number
}

// 质押概览响应
export interface StakeOverview {
  totalStaked: number
  totalDelegated: number
  totalUnfreezing: number
  availableToWithdraw: number
  stakingRewards: number
  delegationRewards: number
}

// 质押记录
export interface StakeRecord {
  id: string
  pool_account_id: string
  operation_type: 'freeze' | 'unfreeze'
  amount: number
  resource_type: 'ENERGY' | 'BANDWIDTH'
  txid: string
  status: 'pending' | 'confirmed' | 'failed'
  created_at: string
  confirmed_at?: string
  error_message?: string
}

// 委托记录
export interface DelegateRecord {
  id: string
  pool_account_id: string
  operation_type: 'delegate' | 'undelegate'
  receiver_address: string
  amount: number
  resource_type: 'ENERGY' | 'BANDWIDTH'
  txid: string
  status: 'pending' | 'confirmed' | 'failed'
  created_at: string
  confirmed_at?: string
  lock_period?: number
  is_locked: boolean
  error_message?: string
}

// 解冻记录
export interface UnfreezeRecord {
  id: string
  pool_account_id: string
  amount: number
  resource_type: 'ENERGY' | 'BANDWIDTH'
  txid: string
  unfreeze_time: string
  withdrawable_time: string
  status: 'unfreezing' | 'withdrawable' | 'withdrawn'
  created_at: string
}

// Express 路由处理器类型
export type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: string
  type?: string
}

// 分页响应格式
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
