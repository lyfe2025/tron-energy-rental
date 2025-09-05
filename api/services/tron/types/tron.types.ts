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
  totalStaked: number;
  totalDelegated: number;
  availableEnergy: number;
  availableBandwidth: number;
  pendingUnfreeze: number;
  withdrawableAmount: number;
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
    limit: number;
    available: number;
  };
  bandwidth: {
    used: number;
    limit: number;
    available: number;
  };
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
