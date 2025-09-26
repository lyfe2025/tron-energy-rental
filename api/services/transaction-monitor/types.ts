/**
 * 交易监听服务相关类型定义
 */

export interface MonitoredAddress {
  address: string;
  networkId: string;
  networkName: string;
  modeType?: string; // 'energy_flash' 或 'transaction_package'
  tronWebInstance: any;
  tronGridProvider: any;
}

export interface Transaction {
  txID: string;
  blockNumber?: number;
  timestamp?: number;
  blockTimestamp?: number;  // TRC20交易使用此字段
  from: string;
  to: string;
  amount: number;
  confirmed?: boolean;
  token?: string;  // TRC20代币符号
  contractAddress?: string;  // TRC20合约地址
  type?: 'trx' | 'trc20';  // 交易类型
}

export interface TransactionInfo {
  id?: string;
  txid?: string;
  result?: string;
  blockNumber?: number;
  receipt?: any;
  [key: string]: any;
}

export interface NetworkConfig {
  networkId: string;
  networkName: string;
  rpcUrl: string;
  apiKey: string;
  isTestNet: boolean;
}
