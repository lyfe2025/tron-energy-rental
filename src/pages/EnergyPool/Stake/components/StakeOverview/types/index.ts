/**
 * StakeOverview 相关类型定义
 */
import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI';
import type { Network } from '@/stores/network';

// 继承网络store的类型
export type NetworkStoreNetwork = Network;

// 组件Props类型
export interface StakeOverviewProps {
  selectedAccount?: EnergyPoolAccount | null;
  currentNetwork?: NetworkStoreNetwork | null;
  formatTrx: (value: any) => string;
  formatEnergy: (value: any) => string;
  formatBandwidth: (value: any) => string;
  formatAddress: (address: string) => string;
  showAccountSection?: boolean;
  showNetworkSection?: boolean;
  showOverviewSection?: boolean;
}

// 组件事件类型
export interface StakeOverviewEmits {
  switchAccount: [];
  toggleNetworkSwitcher: [];
}

// 复制功能相关类型
export interface CopyAddressOptions {
  address: string;
  timeout?: number;
}

// 实时数据刷新选项
export interface RefreshDataOptions {
  address: string;
  networkId?: number | string;
  showToast?: boolean;
  includeStakeStatus?: boolean;
}
