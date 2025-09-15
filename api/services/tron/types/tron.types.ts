export interface TronConfig {
  fullHost: string;
  privateKey?: string;
  solidityNode?: string;
  eventServer?: string;
  headers?: Record<string, string>;
}

export interface DelegateResourceParams {
  ownerAddress: string;
  receiverAddress: string;
  balance: number;
  resource: 'ENERGY' | 'BANDWIDTH';
  lock: boolean;
  lockPeriod?: number;
}

export interface TransactionResult {
  success: boolean;
  txid?: string;
  error?: string;
  energyUsed?: number;
  netUsed?: number;
}

export interface FreezeBalanceV2Params {
  ownerAddress: string;
  frozenBalance: number;
  resource: 'ENERGY' | 'BANDWIDTH';
}

export interface UnfreezeBalanceV2Params {
  ownerAddress: string;
  unfreezeBalance: number;
  resource: 'ENERGY' | 'BANDWIDTH';
}

export interface WithdrawExpireUnfreezeParams {
  ownerAddress: string;
}

export interface StakeOverview {
  // 新的9个统计字段
  totalStakedTrx: number;           // 总质押 TRX
  totalStakedEnergyTrx: number;     // 能量总质押 TRX
  totalStakedBandwidthTrx: number;  // 带宽总质押 TRX
  unlockingTrx: number;             // 解锁中 TRX
  withdrawableTrx: number;          // 待提取 TRX
  stakedEnergy: number;             // 质押获得能量
  delegatedToOthersEnergy: number;  // 代理给他人能量
  delegatedToSelfEnergy: number;    // 代理给自己能量
  stakedBandwidth: number;          // 质押获得带宽
  delegatedToOthersBandwidth: number; // 代理给他人带宽
  delegatedToSelfBandwidth: number; // 代理给自己带宽
  
  // 保留原有字段以保持向后兼容性
  totalStaked?: number;
  totalDelegated?: number;
  totalUnfreezing?: number;
  availableToWithdraw?: number;
  stakingRewards?: number;
  delegationRewards?: number;
  availableEnergy?: number;
  availableBandwidth?: number;
  pendingUnfreeze?: number;
  withdrawableAmount?: number;
}

export interface StakeTransactionParams {
  transactionId: string;
  poolId: number;
  address: string;
  amount: number;
  resourceType: 'ENERGY' | 'BANDWIDTH';
  operationType: 'freeze' | 'unfreeze' | 'delegate' | 'undelegate' | 'withdraw';
  fromAddress?: string;
  toAddress?: string;
  lockPeriod?: number;
  unfreezeTime?: Date;
  expireTime?: Date;
}

export interface EnergyTransactionData {
  txid: string;
  from_address: string;
  to_address: string;
  amount: number;
  resource_type: string;
  status: string;
  lock_period: number;
}

export interface AccountData {
  address: string;
  balance: number;
  energy: number;
  bandwidth: number;
  frozen: any[];
}

export interface ResourceData {
  energy: {
    used: number;
    limit: number; // 仅质押获得的能量
    total: number; // 包含代理的总能量
    available: number; // 实际可用于出租的能量
    delegatedOut?: number; // 代理给别人的能量
    delegatedIn?: number; // 从别人获得的能量代理
  };
  bandwidth: {
    used: number;
    limit: number; // 仅质押获得的带宽
    total: number; // 包含代理的总带宽
    available: number; // 实际可用于出租的带宽
    delegatedOut?: number; // 代理给别人的带宽
    delegatedIn?: number; // 从别人获得的带宽代理
  };
  delegation?: {
    energyOut: number;
    energyIn: number;
    bandwidthOut: number;
    bandwidthIn: number;
  };
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
