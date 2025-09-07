import type { EnergyPoolAccount } from '../../composables/useEnergyPool'

// 组件属性接口
export interface AccountModalProps {
  visible: boolean
  account?: EnergyPoolAccount | null
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
    total: number
    available: number
  }
  bandwidth: {
    total: number
    available: number
  }
  estimatedCostPerEnergy: number
  networkInfo?: {
    name: string
    type: string
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
