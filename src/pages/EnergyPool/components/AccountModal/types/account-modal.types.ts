import type { EnergyPoolAccount } from '../../../composables/useEnergyPool'

// 组件属性接口
export interface AccountModalProps {
  visible: boolean
  account?: EnergyPoolAccount | null
  currentNetworkId?: string
  currentNetwork?: any
}

// 组件事件接口
export interface AccountModalEmits {
  close: []
  success: [data: any]
}

// 表单数据接口
export interface AccountFormData {
  name: string
  address: string
  private_key: string
  mnemonic: string
  status: 'active' | 'inactive' | 'maintenance'
  account_type: 'own_energy' | 'agent_energy' | 'third_party'
  priority: number
  description: string
  daily_limit: number | null
  monthly_limit: number | null
}

// 表单错误接口
export interface AccountFormErrors {
  name: string
  address: string
  private_key: string
  mnemonic: string
  priority: string
}

// 私钥输入模式
export type PrivateKeyInputMode = 'direct' | 'mnemonic'

// TRON数据接口
export interface TronData {
  balance: number
  usdtBalance?: number
  usdtInfo?: {
    error?: string
  }
  energy: {
    total: number        // 包含代理的总能量
    limit?: number       // 仅质押获得的能量（可选，兼容旧API）
    available: number    // 实际可用于出租的能量
    used?: number        // 已使用的能量（可选，兼容旧API）
    delegatedOut?: number // 代理给别人的TRX数量
    delegatedIn?: number  // 从别人获得的TRX数量
  }
  bandwidth: {
    total: number        // 包含代理的总带宽
    limit?: number       // 仅质押获得的带宽（可选，兼容旧API）
    available: number    // 实际可用于出租的带宽
    used?: number        // 已使用的带宽（可选，兼容旧API）
    delegatedOut?: number // 代理给别人的TRX数量
    delegatedIn?: number  // 从别人获得的TRX数量
  }
  // 代理详情
  delegation?: {
    energyOut: number
    energyIn: number
    bandwidthOut: number
    bandwidthIn: number
  }
  estimatedCostPerEnergy: number
  estimatedCostPerBandwidth?: number
  contractInfo?: {
    address: string
    decimals: number
    type: string
    symbol: string
    name: string
  }
  networkInfo?: {
    id: string
    name: string
    type: string
    rpcUrl: string
  }
}

// 私钥生成参数接口
export interface PrivateKeyGenerationParams {
  mnemonic: string
}

// TRON地址验证参数接口
export interface TronValidationParams {
  address: string
  private_key: string
}

// 提交数据接口
export interface AccountSubmitData {
  name: string
  tron_address: string
  private_key_encrypted: string
  status: 'active' | 'inactive' | 'maintenance'
  account_type: 'own_energy' | 'agent_energy' | 'third_party'
  priority: number
  description: string | null
  daily_limit: number | null
  monthly_limit: number | null
}
