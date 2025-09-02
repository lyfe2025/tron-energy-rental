// 质押概览接口
export interface StakeOverview {
  totalStaked: number
  totalDelegated: number
  totalUnfreezing: number
  availableToWithdraw: number
  stakingRewards: number
  delegationRewards: number
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
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
}

export interface UnfreezeParams {
  poolId: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
}

// 委托操作参数接口
export interface DelegateParams {
  poolId: string
  toAddress: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
}

export interface UndelegateParams {
  poolId: string
  toAddress: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
}

// 记录查询参数接口
export interface StakeRecordQueryParams {
  poolId: string
  page?: number
  limit?: number
  operationType?: 'freeze' | 'unfreeze'
  resourceType?: 'ENERGY' | 'BANDWIDTH'
  startDate?: string
  endDate?: string
}

export interface DelegateRecordQueryParams {
  poolId: string
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
  page?: number
  limit?: number
  status?: 'pending' | 'available' | 'withdrawn'
  resourceType?: 'ENERGY' | 'BANDWIDTH'
  startDate?: string
  endDate?: string
}
