/**
 * 质押操作相关的类型定义
 */

import type { NetworkParameters } from '@/services/networkParametersService'

// 基础操作参数接口
export interface BaseOperationProps {
  poolId: string
  accountId?: string
  accountAddress?: string
  accountName?: string
}

// 质押操作参数
export interface StakeOperationProps extends BaseOperationProps {}

// 解质押操作参数
export interface UnstakeOperationProps extends BaseOperationProps {}

// 委托操作参数
export interface DelegateOperationProps extends BaseOperationProps {}

// 提取操作参数
export interface WithdrawOperationProps extends BaseOperationProps {}

// 操作结果接口
export interface OperationResult {
  success: boolean
  txid?: string
  message?: string
  error?: string
}

// 资源类型
export type ResourceType = 'ENERGY' | 'BANDWIDTH'

// 质押表单数据
export interface StakeFormData {
  resourceType: ResourceType
  amount: string
}

// 解质押表单数据
export interface UnstakeFormData {
  resourceType: ResourceType
  amount: string
}

// 委托表单数据
export interface DelegateFormData {
  resourceType: ResourceType
  amount: string
  receiverAddress: string
  lockPeriod?: number
}

// 提取表单数据
export interface WithdrawFormData {
  // 提取操作通常不需要额外参数，只需要确认
}

// 模态框状态接口
export interface ModalState {
  loading: boolean
  error: string
  networkParams: NetworkParameters | null
  loadingParams: boolean
}

// 操作类型枚举
export enum StakeOperationType {
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  DELEGATE = 'delegate',
  WITHDRAW = 'withdraw'
}

// 网络信息
export interface NetworkInfo {
  networkId: string
  networkName: string
  networkType: string
  unlockPeriodText: string
}

// 账户余额信息
export interface AccountBalance {
  available: number
  staked: number
  delegated: number
  withdrawable: number
}
