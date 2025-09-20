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
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  txid: string
  operationType: 'freeze' | 'unfreeze'
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
  unfreezeTime?: string
  status: 'pending' | 'success' | 'failed'
  createdAt: string
}

// 代理记录接口
export interface DelegateRecord {
  id: string
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  txid: string
  operationType: 'delegate' | 'undelegate'
  toAddress: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
  expireTime?: string
  status: 'pending' | 'success' | 'failed'
  createdAt: string
  // 新增字段：支持Base58格式的发起方和接收方地址
  from_address?: string       // 代理发起方地址 (Base58格式)
  to_address?: string         // 代理接收方地址 (Base58格式)
  fromAddress?: string        // 前端兼容性字段（代理发起方）
  direction?: 'incoming' | 'outgoing'  // 交易方向（相对于查询地址）
}

// 解质押记录接口
export interface UnfreezeRecord {
  id: string
  poolAccountId: string       // 能量池账户ID (energy_pools表)
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
  networkId: string           // 网络ID (tron_networks表)
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  accountAddress?: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
}

export interface UnfreezeParams {
  networkId: string           // 网络ID (tron_networks表)
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  accountAddress: string      // 解质押地址（必需）
  amount: number              // 解质押金额 (TRX单位)
  resourceType: 'ENERGY' | 'BANDWIDTH'
}

// 代理操作参数接口
export interface DelegateParams {
  networkId: string           // 网络ID (tron_networks表)
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  accountAddress?: string
  toAddress: string
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
}

export interface UndelegateParams {
  networkId: string           // 网络ID (tron_networks表)
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  accountAddress: string      // 代理方账户地址（必需）
  toAddress: string           // 接收方地址
  amount: number              // 代理数量
  resourceType: 'ENERGY' | 'BANDWIDTH'  // 资源类型
}

// 记录查询参数接口
export interface StakeRecordQueryParams {
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  networkId?: string          // 网络ID (tron_networks表)
  page?: number
  limit?: number
  operationType?: 'freeze' | 'unfreeze'
  resourceType?: 'ENERGY' | 'BANDWIDTH'
  startDate?: string
  endDate?: string
}

export interface DelegateRecordQueryParams {
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  networkId?: string          // 网络ID (tron_networks表)
  page?: number
  limit?: number
  operationType?: 'delegate' | 'undelegate'
  resourceType?: 'ENERGY' | 'BANDWIDTH'
  toAddress?: string
  startDate?: string
  endDate?: string
  // ✅ 新增：方向参数（用于后端日志，实际过滤在前端进行）
  direction?: 'out' | 'in'    // 代理方向：out=代理给他人, in=他人代理给自己
}

export interface UnfreezeRecordQueryParams {
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  networkId?: string          // 网络ID (tron_networks表)
  page?: number
  limit?: number
  status?: 'pending' | 'available' | 'withdrawn'
  resourceType?: 'ENERGY' | 'BANDWIDTH'
  startDate?: string
  endDate?: string
}
