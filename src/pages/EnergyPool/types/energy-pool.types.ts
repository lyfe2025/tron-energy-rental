// 能源池账户类型定义
export interface EnergyPoolAccount {
  id: string
  name: string
  tron_address: string
  private_key_encrypted: string
  total_energy: number
  available_energy: number
  total_bandwidth: number
  available_bandwidth: number
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
    chain_id: string
  }
}

// 能源池统计信息类型定义
export interface EnergyPoolStatistics {
  totalAccounts: number
  activeAccounts: number
  totalEnergy: number
  availableEnergy: number
  totalBandwidth: number
  availableBandwidth: number
  averageCost: number
  utilizationRate: number
  bandwidthUtilizationRate: number
}

// 网络类型定义
export interface Network {
  id: string
  name: string
  type: string
  rpc_url: string
  chain_id?: string
  is_active: boolean
  health_status?: string
}

// 今日消耗统计类型定义
export interface TodayConsumption {
  totalEnergy: number
  totalCost: number
  transactionCount: number
  averageEnergyPerTx: number
  peakHour: string
  efficiency: number
}

// 批量操作类型定义
export type BatchAction = 'enable' | 'disable'
export type ToggleAction = 'enable' | 'disable'

// 账户状态类型
export type AccountStatus = 'active' | 'inactive' | 'maintenance'

// 账户类型
export type AccountType = 'own_energy' | 'agent_energy' | 'third_party'

// 加载状态类型定义
export interface LoadingState {
  statistics: boolean
  accounts: boolean
  refresh: boolean
  batch: boolean
}

// 筛选状态类型定义
export interface FilterState {
  searchQuery: string
  statusFilter: string
}

// 账户操作数据类型
export interface AccountFormData {
  name: string
  tron_address: string
  private_key_encrypted: string
  total_energy: number
  account_type?: AccountType
  priority?: number
  description?: string
  daily_limit?: number
  monthly_limit?: number
  status?: AccountStatus
}

// 账户更新数据类型
export interface AccountUpdateData {
  name?: string
  tron_address?: string
  private_key_encrypted?: string
  status?: AccountStatus
  account_type?: AccountType
  priority?: number
  description?: string
  contact_info?: any
  daily_limit?: number
  monthly_limit?: number
}

// 优化分配结果类型
export interface AllocationResult {
  recommendedAccounts: EnergyPoolAccount[]
  totalEnergy: number
  estimatedCost: number
  allocationStrategy: string
}

// Modal显示状态类型
export interface ModalState {
  showAddModal: boolean
  showEditModal: boolean
  showDetailsModal: boolean
  showDeleteConfirm: boolean
  showEnableConfirm: boolean
  showDisableConfirm: boolean
  showBatchNetworkModal: boolean
  showNetworkSwitcher: boolean
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
