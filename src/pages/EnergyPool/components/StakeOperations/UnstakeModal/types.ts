/**
 * 解锁操作相关的类型定义
 */

import type { NetworkParameters } from '@/services/networkParametersService'
import type { ResourceType } from '../shared/types'

// 重新导出共享类型
export type { ResourceType }

// 解锁交易数据
export interface UnstakeTransactionData {
  amount: number
  resourceType: ResourceType
  accountAddress: string
  poolId: string
  accountId?: string
}

// 解锁表单数据
export interface UnstakeFormData {
  resourceType: ResourceType
  amount: string
}

// 账户余额详细信息
export interface UnstakeAccountBalance {
  available: number
  staked: number
  delegated: number
  withdrawable: number
  energyStaked: number
  bandwidthStaked: number
  // 代理出去的数量（用于"代理中资源"显示）
  energyDelegatedOut: number
  bandwidthDelegatedOut: number
  // 直接质押的数量（可解质押）
  energyDirectStaked: number
  bandwidthDirectStaked: number
}

// 解锁模态框状态
export interface UnstakeModalState {
  loading: boolean
  error: string
  networkParams: NetworkParameters | null
  loadingParams: boolean
  // 交易确认弹窗状态
  showTransactionConfirm: boolean
  transactionData: UnstakeTransactionData | null
}

// 解锁操作Props
export interface UnstakeOperationProps {
  poolId: string
  accountId?: string
  accountAddress?: string
  accountName?: string
}

// 解锁操作Emits
export interface UnstakeOperationEmits {
  close: []
  success: []
}

// 资源信息
export interface ResourceInfo {
  type: ResourceType
  staked: number
  delegatedOut: number
  directStaked: number
  displayName: string
  icon: string
}
