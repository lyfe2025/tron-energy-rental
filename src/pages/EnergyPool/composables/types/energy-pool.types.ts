/**
 * 能源池相关类型定义
 */

export interface EnergyPoolAccount {
  id: string
  name: string
  tron_address: string
  private_key_encrypted: string
  // 注意：total_energy, available_energy, total_bandwidth, available_bandwidth 字段已移除
  // 这些数据现在从TRON网络实时获取，不再存储在数据库中
  cost_per_energy: number
  status: 'active' | 'inactive' | 'maintenance'
  last_updated_at: string
  created_at: string
  updated_at: string
  account_type: 'own_energy' | 'agent_energy' | 'third_party'
  priority: number
  description?: string
  contact_info?: any
  daily_limit?: number
  monthly_limit?: number
  associated_networks?: Array<{ id: string; name: string }>
  network_config?: {
    id: string
    name: string
    type: string
    rpc_url: string
    chain_id?: string
  }
}

export interface EnergyPoolStatistics {
  totalAccounts: number
  activeAccounts: number
  // 注意：能量和带宽统计字段已移除，现在从TRON网络实时获取
  // totalEnergy, availableEnergy, totalBandwidth, availableBandwidth 不再静态统计
  // utilizationRate, bandwidthUtilizationRate 等利用率指标需要基于实时数据计算
  averageCost: number
}

export interface TodayConsumption {
  total_consumed_energy: number
  total_revenue: number
  total_transactions: number
  average_price: number
  success_rate: number
  total_cost: number
}

export interface LoadingStates {
  statistics: boolean
  accounts: boolean
  refresh: boolean
  batch: boolean
}

export interface NetworkInfo {
  id: string
  name: string
  type: string
  rpc_url: string
  is_active: boolean
  health_status: string
}

export interface AccountAddData {
  name: string
  tron_address: string
  private_key_encrypted: string
  // 注意：total_energy 字段已移除，现在从TRON网络实时获取
  account_type?: string
  priority?: number
  description?: string
  daily_limit?: number
  monthly_limit?: number
  status?: string
}

export interface AccountUpdateData {
  name?: string
  tron_address?: string
  private_key_encrypted?: string
  status?: 'active' | 'inactive' | 'maintenance'
  account_type?: 'own_energy' | 'agent_energy' | 'third_party'
  priority?: number
  description?: string
  contact_info?: any
  daily_limit?: number
  monthly_limit?: number
}
