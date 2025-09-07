// 质押概览接口
export interface StakeOverview {
  // 新的9个统计字段
  totalStakedTrx: number           // 总质押 TRX
  unlockingTrx: number             // 解锁中 TRX
  withdrawableTrx: number          // 待提取 TRX
  stakedEnergy: number             // 质押获得能量
  delegatedToOthersEnergy: number  // 代理给他人能量
  delegatedToSelfEnergy: number    // 代理给自己能量
  stakedBandwidth: number          // 质押获得带宽
  delegatedToOthersBandwidth: number // 代理给他人带宽
  delegatedToSelfBandwidth: number // 代理给自己带宽

  // 保留原有字段以保持向后兼容性
  totalStaked?: number
  totalDelegated?: number
  totalUnfreezing?: number
  availableToWithdraw?: number
  stakingRewards?: number
  delegationRewards?: number
}

// 质押统计接口
export interface StakeStatistics {
  totalStakedTrx: number
  totalDelegatedEnergy: number
  totalDelegatedBandwidth: number
  pendingUnfreezes: number
  availableToWithdraw: number
  estimatedDailyRewards: number
}

// 质押记录接口
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

// 委托记录接口
export interface DelegateRecord {
  id: string
  poolId: string
  txid: string
  operationType: 'delegate' | 'undelegate'
  toAddress: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
  expireTime?: string
  status: 'pending' | 'success' | 'failed'
  createdAt: string
}

// 解质押记录接口
export interface UnfreezeRecord {
  id: string
  poolId: string
  txid: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  unfreezeTime: string
  expireTime: string
  status: 'pending' | 'available' | 'withdrawn'
  createdAt: string
}

// 账户资源接口
export interface AccountResources {
  address: string
  balance: number
  energy: {
    total: number
    used: number
    available: number
  }
  bandwidth: {
    total: number
    used: number
    available: number
  }
  frozen: {
    energy: number
    bandwidth: number
  }
  delegated: {
    energy: number
    bandwidth: number
  }
}

// 账户信息接口
export interface AccountInfo {
  address: string
  balance: number
  createTime: number
  latestOperationTime: number
  allowance: number
  activePermissions: Array<{
    type: string
    permissionName: string
    threshold: number
    keys: Array<{
      address: string
      weight: number
    }>
  }>
}

// 分页接口
export interface StakePagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// 质押操作参数接口
export interface FreezeParams {
  poolId: string
  accountId?: string
  accountAddress?: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
}

export interface UnfreezeParams {
  poolId: string
  accountId?: string
  accountAddress?: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
}

// 委托操作参数接口
export interface DelegateParams {
  poolId: string
  accountId?: string
  accountAddress?: string
  toAddress: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
}

export interface UndelegateParams {
  poolId: string
  accountId?: string
  accountAddress?: string
  toAddress: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
}

// 记录查询参数接口
export interface StakeRecordQueryParams {
  poolId: string
  networkId?: string
  page?: number
  limit?: number
  operationType?: 'freeze' | 'unfreeze'
  resourceType?: 'ENERGY' | 'BANDWIDTH'
  startDate?: string
  endDate?: string
}

export interface DelegateRecordQueryParams {
  poolId: string
  networkId?: string
  page?: number
  limit?: number
  operationType?: 'delegate' | 'undelegate'
  resourceType?: 'ENERGY' | 'BANDWIDTH'
  toAddress?: string
  startDate?: string
  endDate?: string
}

export interface UnfreezeRecordQueryParams {
  poolId: string
  networkId?: string
  page?: number
  limit?: number
  status?: 'pending' | 'available' | 'withdrawn'
  resourceType?: 'ENERGY' | 'BANDWIDTH'
  startDate?: string
  endDate?: string
}
