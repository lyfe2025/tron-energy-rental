/**
 * 能量计算器相关类型定义
 */

import type { EnergyConsumptionResult } from '@/services/tronApiService'

/**
 * 计算器状态
 */
export interface CalculatorState {
  transferType: 'existing' | 'new'
  amount: number
  calculationMode: 'static' | 'api'
  fromAddress: string
  toAddress: string
  result: CalculatorResult | null
  apiResult: EnergyConsumptionResult | null
  isLoading: boolean
  error: string | null
}

/**
 * 静态计算结果
 */
export interface CalculatorResult {
  baseEnergy: number
  bufferEnergy: number
  totalEnergy: number
  trxCost: number
}

/**
 * 预设值
 */
export interface PresetValue {
  name: string
  value: number
}

/**
 * 新预设值状态
 */
export interface NewPresetState {
  name: string
  value: number
}
