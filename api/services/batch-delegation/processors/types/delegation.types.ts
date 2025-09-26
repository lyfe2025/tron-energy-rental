/**
 * 代理相关类型定义
 * 从 SingleDelegationProcessor.ts 分离出的类型定义
 */

export interface DelegationResult {
  success: boolean
  message: string
  orderId?: string
  delegationTxHash?: string
  energyDelegated?: number
  remainingTransactions?: number
  usedTransactions?: number
  nextDelegationTime?: Date
  details?: any
}

export interface DelegationParams {
  ownerAddress: string
  receiverAddress: string
  balance: number
  resource: 'ENERGY' | 'BANDWIDTH'
  lock: boolean
  lockPeriod?: number
}

export interface EnergyPoolAccount {
  id: string
  name?: string
  tron_address: string
  private_key_encrypted: string
  status: string
  priority: number
  cost_per_energy: number
  address?: string  // 向后兼容
  private_key?: string  // 向后兼容
  delegatable_energy?: number
}

export interface ValidationResult {
  valid: boolean
  message: string
  order?: any
  energyRequired?: number
  energyAccount?: any
}

export interface UpdateResult {
  success: boolean
  error?: string
  usedTransactions?: number
  remainingTransactions?: number
  nextDelegationTime?: Date
}

export interface EstimateResult {
  success: boolean
  estimate?: {
    energyAmount: number
    lockPeriod: number
    estimatedCost: number
    nextDelegationTime: Date | null
    canDelegateNow: boolean
  }
  message: string
}
