/**
 * 解锁交易确认弹窗相关的类型定义
 */

import type { NetworkParameters } from '@/services/networkParametersService'
import type { TransactionFees } from '@/services/transactionFeeService'
import type { ResourceType } from '../shared/types'

// 解锁交易数据
export interface UnstakeTransactionData {
  amount: number
  resourceType: ResourceType
  accountAddress: string
  poolId: string
  accountId?: string
}

// 确认弹窗Props
export interface UnstakeTransactionConfirmProps {
  transactionData: UnstakeTransactionData
  networkParams?: NetworkParameters
  estimatedResource: number
  accountName?: string
}

// 确认弹窗Emits
export interface UnstakeTransactionConfirmEmits {
  confirm: [data: UnstakeTransactionData]
  reject: []
}

// 交易费用状态
export interface TransactionFeeState {
  fees: TransactionFees | null
  loading: boolean
  error: string | null
}

// 交易确认状态
export interface TransactionConfirmState {
  loading: boolean
  showDetails: boolean
  feeState: TransactionFeeState
}

// 交易详情信息
export interface TransactionDetailInfo {
  title: string
  value: string
  type?: 'normal' | 'warning' | 'error' | 'success'
}

// 费用详情信息
export interface FeeDetailInfo {
  label: string
  value: string
  tooltip?: string
  type?: 'bandwidth' | 'energy' | 'service'
}
