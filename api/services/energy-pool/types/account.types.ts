/**
 * 能源池账户相关类型定义
 */

export interface EnergyPoolAccount {
  id: string; // UUID
  name: string;
  tron_address: string;
  private_key_encrypted: string;
  total_energy: number;
  available_energy: number;
  total_bandwidth: number;
  available_bandwidth: number;
  cost_per_energy?: number; // 这个字段在数据库中不存在，需要计算或添加
  status: 'active' | 'inactive' | 'maintenance';
  last_updated_at: Date;
  created_at: Date;
  updated_at: Date;
  account_type?: 'own_energy' | 'agent_energy' | 'third_party';
  priority?: number;
  description?: string;
  contact_info?: any;
  daily_limit?: number;
  monthly_limit?: number;
}

export interface BatchUpdateResult {
  successCount: number; 
  failedCount: number; 
  errors: Array<{ id: string; error: string }>;
  success: boolean;
  message: string;
}

export interface AddAccountResult {
  success: boolean; 
  message: string; 
  accountId?: string;
}

export interface UpdateAccountResult {
  success: boolean; 
  message: string;
}

export interface PoolStatisticsResult {
  success: boolean;
  data?: {
    totalAccounts: number;
    activeAccounts: number;
    totalEnergy: number;
    availableEnergy: number;
    totalBandwidth: number;
    availableBandwidth: number;
    utilizationRate: number;
    bandwidthUtilizationRate: number;
    averageCostPerEnergy: number;
    averageCostPerBandwidth: number;
    // 额外统计信息
    totalEnergyFromStaking?: number;
    totalBandwidthFromStaking?: number;
    totalDelegatedEnergyOut?: number;
    totalDelegatedBandwidthOut?: number;
  };
  message?: string;
}

export interface AccountRealTimeData {
  id: string;
  name: string;
  status: string;
  energy: {
    fromStaking: number;
    total: number;
    available: number;
    used: number;
    delegatedOut: number;
    delegatedIn: number;
  };
  bandwidth: {
    fromStaking: number;
    total: number;
    available: number;
    used: number;
    delegatedOut: number;
    delegatedIn: number;
  };
  costPerEnergy: number;
}
