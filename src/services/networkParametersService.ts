/**
 * TRON网络参数服务
 * 调用后端API获取网络参数信息
 */

import { apiClient } from '@/services/api/core/apiClient'

export interface NetworkParameters {
  networkId: string
  networkName: string
  networkType: string
  network: 'mainnet' | 'shasta' | 'nile'
  unlockPeriod: number
  unlockPeriodDays: number
  unlockPeriodText: string
  energyRatio: number
  bandwidthRatio: number
  minStakeAmount: number
  minStakeAmountTrx: number
  lastUpdated: string
  estimatedResources: {
    energy: {
      per1Trx: number
      per10Trx: number
      per100Trx: number
    }
    bandwidth: {
      per1Trx: number
      per10Trx: number
      per100Trx: number
    }
  }
}

export interface StakeEstimation {
  networkId: string
  networkName: string
  networkType: string
  input: {
    amount: number
    resourceType: 'ENERGY' | 'BANDWIDTH'
  }
  estimation: {
    resource: number
    resourceType: 'ENERGY' | 'BANDWIDTH'
    unlockPeriod: number
    unlockPeriodText: string
    note: string
  }
}

class NetworkParametersService {
  /**
   * 获取指定网络的参数
   */
  async getNetworkParameters(networkId: string): Promise<NetworkParameters> {
    try {
      const response = await apiClient.get(`/api/tron-networks/${networkId}/parameters`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取网络参数失败')
      }

      return response.data.data
    } catch (error: any) {
      console.error('[NetworkParametersService] 获取网络参数失败:', error)
      throw new Error(error.response?.data?.error || error.message || '获取网络参数失败')
    }
  }

  /**
   * 获取所有活跃网络的参数
   */
  async getAllNetworkParameters(): Promise<NetworkParameters[]> {
    try {
      const response = await apiClient.get('/api/tron-networks/parameters')
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取网络参数失败')
      }

      return response.data.data
    } catch (error: any) {
      console.error('[NetworkParametersService] 获取所有网络参数失败:', error)
      throw new Error(error.response?.data?.error || error.message || '获取所有网络参数失败')
    }
  }

  /**
   * 刷新网络参数缓存
   */
  async refreshNetworkParameters(networkId: string): Promise<NetworkParameters> {
    try {
      const response = await apiClient.post(`/api/tron-networks/${networkId}/parameters/refresh`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || '刷新网络参数失败')
      }

      return response.data.data
    } catch (error: any) {
      console.error('[NetworkParametersService] 刷新网络参数失败:', error)
      throw new Error(error.response?.data?.error || error.message || '刷新网络参数失败')
    }
  }

  /**
   * 估算质押收益
   */
  async estimateStakeReward(
    networkId: string,
    amount: number,
    resourceType: 'ENERGY' | 'BANDWIDTH'
  ): Promise<StakeEstimation> {
    try {
      const response = await apiClient.post(`/api/tron-networks/${networkId}/parameters/estimate`, {
        amount,
        resourceType
      })
      
      if (!response.data.success) {
        throw new Error(response.data.error || '估算质押收益失败')
      }

      return response.data.data
    } catch (error: any) {
      console.error('[NetworkParametersService] 估算质押收益失败:', error)
      throw new Error(error.response?.data?.error || error.message || '估算质押收益失败')
    }
  }

  /**
   * 格式化资源数量
   */
  formatResourceAmount(amount: number, resourceType: 'ENERGY' | 'BANDWIDTH'): string {
    if (resourceType === 'ENERGY') {
      if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(2)}M`
      } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(2)}K`
      }
    } else {
      if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(2)}MB`
      } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(2)}KB`
      }
    }
    
    return amount.toLocaleString()
  }

  /**
   * 格式化TRX数量
   */
  formatTrxAmount(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M TRX`
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K TRX`
    }
    
    return `${amount.toLocaleString()} TRX`
  }
}

export const networkParametersService = new NetworkParametersService()
export default networkParametersService
