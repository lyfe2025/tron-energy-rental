import type {
    DelegateResourceParams,
    FreezeBalanceV2Params,
    ServiceResponse,
    StakeOverview,
    StakeTransactionParams,
    TransactionResult,
    UnfreezeBalanceV2Params,
    WithdrawExpireUnfreezeParams
} from '../../types/tron.types';

// 重新导出基础类型以便使用
export type {
    DelegateResourceParams, FreezeBalanceV2Params,
    ServiceResponse,
    StakeOverview,
    StakeTransactionParams,
    TransactionResult,
    UnfreezeBalanceV2Params,
    WithdrawExpireUnfreezeParams
};

// 网络配置相关类型
export interface NetworkConfig {
  name?: string;
  rpcUrl?: string;
  rpc_url?: string;
  fullHost?: string;
  apiKey?: string;
  api_key?: string;
}

export interface TronGridConfig {
  baseUrl: string;
  headers: Record<string, string>;
}

// 操作类相关接口
export interface OperationParams {
  tronWeb: any;
  networkConfig?: NetworkConfig;
}

// 质押操作相关类型
export interface FreezeOperationResult extends TransactionResult {
  poolId?: number;
}

export interface UnfreezeOperationResult extends TransactionResult {
  unfreezeTime?: Date;
  expireTime?: Date;
}

// 委托操作相关类型  
export interface DelegateOperationResult extends TransactionResult {
  receiverAddress?: string;
  lockPeriod?: number;
}

export interface UndelegateResourceParams {
  ownerAddress: string;
  receiverAddress: string;
  balance: number;
  resource: 'ENERGY' | 'BANDWIDTH';
}

// TronGrid API相关类型
export interface TronGridTransactionResponse {
  success: boolean;
  data?: any[];
  meta?: {
    total: number;
    page_size: number;
  };
}

export interface TronGridAccountResponse {
  address: string;
  balance: number;
  frozenV2?: Array<{
    type: 'ENERGY' | 'BANDWIDTH';
    amount: number;
  }>;
  unfrozenV2?: Array<{
    unfreeze_amount: number;
    unfreeze_expire_time: number;
  }>;
  delegated_frozenV2_balance_for_energy?: number;
  delegated_frozenV2_balance_for_bandwidth?: number;
  acquired_delegated_frozenV2_balance_for_energy?: number;
  acquired_delegated_frozenV2_balance_for_bandwidth?: number;
}

// 交易记录格式化相关类型
export interface FormattedStakeRecord {
  id: string;
  transaction_id: string;
  pool_id: string;
  address: string;
  amount: number;
  resource_type: 'ENERGY' | 'BANDWIDTH';
  operation_type: 'freeze' | 'unfreeze' | 'delegate' | 'undelegate' | 'withdraw';
  status: 'success' | 'failed';
  created_at: string;
  block_number?: number;
  to_address?: string;
  fee?: number;
}

export interface FormattedUnfreezeRecord {
  id: string;
  txid: string;
  pool_id: string;
  amount: number;
  resource_type: 'ENERGY' | 'BANDWIDTH';
  unfreeze_time: string;
  withdrawable_time: string | null;
  status: 'unfreezing' | 'withdrawable' | 'withdrawn';
  created_at: string;
}

// 数据库记录相关类型
export interface DatabaseRecordResult {
  success: boolean;
  error?: string;
}

// 网络参数查询相关类型
export interface ChainParameter {
  key: string;
  value: string;
}

export interface ChainParametersResponse {
  chainParameter?: ChainParameter[];
}
