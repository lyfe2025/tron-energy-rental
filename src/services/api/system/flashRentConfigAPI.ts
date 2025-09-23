/**
 * 能量闪租配置API服务
 */
import { get } from '@/lib/request'

export interface FlashRentConfig {
  id: string
  mode_type: string
  name: string
  description: string
  config: {
    single_price: number
    energy_per_unit?: number // 可选，默认32000
    max_amount: number
    max_transactions?: number // 可选的最大交易数字段
    payment_address: string
    expiry_hours: number
  }
  is_active: boolean
  network_id: string
  network_name: string
  created_at: string
  updated_at: string
}

export interface FlashRentConfigResponse {
  success: boolean
  data: FlashRentConfig[]
  message: string
}

/**
 * 获取能量闪租配置
 */
export const getFlashRentConfig = async (networkId?: string): Promise<FlashRentConfigResponse> => {
  const url = networkId 
    ? `/api/system/flash-rent-config?network_id=${networkId}`
    : '/api/system/flash-rent-config'
  
  const response = await get<FlashRentConfigResponse>(url)
  
  return response
}

/**
 * 根据网络ID获取单个配置
 */
export const getFlashRentConfigByNetwork = async (networkId: string): Promise<FlashRentConfig | null> => {
  try {
    const response = await getFlashRentConfig(networkId)
    
    if (response.success && response.data.length > 0) {
      // 返回第一个活跃的配置
      return response.data.find(config => config.is_active) || response.data[0]
    }
    
    return null
  } catch (error) {
    console.error('获取闪租配置失败:', error)
    return null
  }
}

/**
 * 获取系统能量消耗配置
 */
export interface EnergyConsumptionConfig {
  standard_energy: number
  buffer_percentage: number
  calculated_energy_per_unit: number
}

export const getEnergyConsumptionConfig = async (): Promise<EnergyConsumptionConfig> => {
  try {
    const response = await get<{
      success: boolean
      data: Array<{ config_key: string; config_value: string }>
    }>('/api/system-configs/values?keys=resource_consumption.energy.usdt_standard_energy,resource_consumption.energy.usdt_buffer_percentage')
    
    if (response.success && response.data) {
      const configs = response.data.reduce((acc, item) => {
        acc[item.config_key] = parseFloat(item.config_value)
        return acc
      }, {} as Record<string, number>)
      
      const standardEnergy = configs['resource_consumption.energy.usdt_standard_energy'] || 65000
      const bufferPercentage = configs['resource_consumption.energy.usdt_buffer_percentage'] || 1
      
      // 计算：单笔需要消耗的能量 = 标准转账能量消耗 * (1 + 安全缓冲百分比)
      const calculatedEnergyPerUnit = Math.round(standardEnergy * (1 + bufferPercentage / 100))
      
      return {
        standard_energy: standardEnergy,
        buffer_percentage: bufferPercentage,
        calculated_energy_per_unit: calculatedEnergyPerUnit
      }
    }
  } catch (error) {
    console.error('获取能量消耗配置失败:', error)
  }
  
  // 返回默认值
  return {
    standard_energy: 65000,
    buffer_percentage: 1,
    calculated_energy_per_unit: 65650 // 65000 * (1 + 1/100)
  }
}

export const flashRentConfigApi = {
  getFlashRentConfig,
  getFlashRentConfigByNetwork,
  getEnergyConsumptionConfig
}
