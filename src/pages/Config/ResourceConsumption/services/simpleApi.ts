/**
 * 简化的资源消耗配置API服务
 * 
 * 只提供必要的能量和带宽配置操作
 */

import { ElMessage } from 'element-plus'
import { apiClient } from '../../../../services/api/core/apiClient'
import type {
    BandwidthConfig,
    EnergyConfig,
    PresetValue
} from '../types/resource-consumption.types'

const API_BASE_URL = '/api/system-configs/configs'

export class SimpleResourceConsumptionApi {
  /**
   * 获取能量配置
   */
  static async getEnergyConfig(): Promise<EnergyConfig> {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/energy`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取能量配置失败')
      }
      
      return response.data.data
    } catch (error: any) {
      console.error('获取能量配置失败:', error)
      ElMessage.error('获取能量配置失败，请稍后重试')
      throw error
    }
  }

  /**
   * 保存能量配置
   */
  static async saveEnergyConfig(config: Partial<EnergyConfig>): Promise<void> {
    try {
      const response = await apiClient.put(`${API_BASE_URL}/energy`, config)
      
      if (!response.data.success) {
        throw new Error(response.data.error || '保存能量配置失败')
      }
    } catch (error: any) {
      console.error('保存能量配置失败:', error)
      throw error
    }
  }

  /**
   * 保存能量配置的预设值
   */
  static async saveEnergyPresets(presets: PresetValue[]): Promise<void> {
    try {
      const response = await apiClient.put(`${API_BASE_URL}/energy/presets`, { preset_values: presets })
      
      if (!response.data.success) {
        throw new Error(response.data.error || '保存预设值失败')
      }
    } catch (error: any) {
      console.error('保存能量预设值失败:', error)
      throw error
    }
  }

  /**
   * 获取带宽配置
   */
  static async getBandwidthConfig(): Promise<BandwidthConfig> {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/bandwidth`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取带宽配置失败')
      }
      
      return response.data.data
    } catch (error: any) {
      console.error('获取带宽配置失败:', error)
      ElMessage.error('获取带宽配置失败，请稍后重试')
      throw error
    }
  }

  /**
   * 保存带宽配置
   */
  static async saveBandwidthConfig(config: Partial<BandwidthConfig>): Promise<void> {
    try {
      const response = await apiClient.put(`${API_BASE_URL}/bandwidth`, config)
      
      if (!response.data.success) {
        throw new Error(response.data.error || '保存带宽配置失败')
      }
    } catch (error: any) {
      console.error('保存带宽配置失败:', error)
      throw error
    }
  }
}
