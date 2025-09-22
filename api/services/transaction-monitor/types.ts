/**
 * 交易监听服务相关类型定义
 */

export interface MonitoredAddress {
  address: string;
  networkId: string;
  networkName: string;
  tronWebInstance: any;
  tronGridProvider: any;
}

export interface Transaction {
  txID: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  confirmed: boolean;
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
