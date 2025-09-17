import type { DelegateRecord } from '../../../composables/useStake'

/**
 * 代理方向类型
 */
export type DelegateDirection = 'out' | 'in'

/**
 * 筛选器类型
 */
export interface DelegateFilters {
  operationType: '' | 'delegate' | 'undelegate'
  resourceType: '' | 'ENERGY' | 'BANDWIDTH'
  startDate: string
  endDate: string
}

/**
 * 代理记录组件基础属性
 */
export interface DelegateRecordsBaseProps {
  poolId: string      // 实际上是网络ID
  networkId: string   // 网络ID
  accountId: string   // 能量池账户ID
}

/**
 * 代理记录组件属性（包含方向）
 */
export interface DelegateRecordsProps extends DelegateRecordsBaseProps {
  delegateDirection?: DelegateDirection  // 代理方向：out=代理出去，in=代理获得
}

/**
 * 代理操作参数
 */
export interface DelegateOperationParams {
  networkId: string
  poolAccountId: string
  resourceType: 'ENERGY' | 'BANDWIDTH'
  amount: string
  toAddress: string
}

/**
 * 加载记录参数
 */
export interface LoadRecordsParams {
  poolAccountId: string
  networkId: string
  page: number
  limit: number
  operationType?: 'delegate' | 'undelegate'
  resourceType?: 'ENERGY' | 'BANDWIDTH'
  startDate?: string
  endDate?: string
}

/**
 * 代理记录文本配置
 */
export interface DelegateRecordsTextConfig {
  // 操作类型文本
  delegateText: string
  undelegateText: string
  
  // 地址标签
  addressLabel: string
  
  // 空状态
  emptyTitle: string
  emptyMessage: string
  
  // 对话框
  undelegateDialogTitle: string
  undelegateDialogMessage: (record: DelegateRecord, formatTrx: (amount: number) => string, formatAddress: (address: string) => string) => string
  
  // 操作按钮
  undelegateButtonText: string
}
