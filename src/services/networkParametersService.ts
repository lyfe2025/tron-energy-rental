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
  blockExplorerUrl?: string // 区块浏览器URL（来自数据库配置）
  unlockPeriod: number
  unlockPeriodDays: number
  unlockPeriodText: string
  minStakeAmount: number
  minStakeAmountTrx: number
  lastUpdated: string
  // TRON网络资源参数 - 基于官方文档
  totalDailyEnergy: number // 全网每日固定能量总量：180,000,000,000
  totalDailyBandwidth: number // 全网每日固定带宽总量：43,200,000,000
  totalStakedForEnergy: number // 全网用于获取Energy的TRX总量
  totalStakedForBandwidth: number // 全网用于获取Bandwidth的TRX总量
  energyUnitPrice: number // Energy单价：100 sun
  bandwidthUnitPrice: number // Bandwidth单价：1000 sun
  freeBandwidthPerDay: number // 每日免费带宽：600
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
   * 根据TRON官方公式计算资源获得量
   * @param stakeAmount 质押的TRX数量
   * @param resourceType 资源类型
   * @param networkParams 网络参数
   * @returns 预估获得的资源数量
   */
  calculateResourceAmount(
    stakeAmountTrx: number, 
    resourceType: 'ENERGY' | 'BANDWIDTH', 
    networkParams: NetworkParameters
  ): number {
    // 将TRX转换为sun（1 TRX = 1,000,000 sun）
    const stakeAmountSun = stakeAmountTrx * 1_000_000
    
    if (resourceType === 'ENERGY') {
      // Amount of Energy obtained = Amount of TRX staked for obtaining Energy / Total amount of TRX staked for obtaining Energy on the whole network * 180,000,000,000
      if (!networkParams.totalStakedForEnergy || networkParams.totalStakedForEnergy <= 0) {
        console.warn('[NetworkParametersService] totalStakedForEnergy无效:', networkParams.totalStakedForEnergy)
        return 0
      }
      const rawResult = (stakeAmountSun / networkParams.totalStakedForEnergy) * networkParams.totalDailyEnergy
      // TRON资源单位转换：官方公式返回的数值需要除以1,000,000得到用户显示单位
      const result = rawResult / 1_000_000
      console.log(`[NetworkParametersService] Energy计算详情:`, {
        input: `${stakeAmountTrx} TRX`,
        stakeAmountSun,
        totalStakedForEnergy: networkParams.totalStakedForEnergy,
        totalDailyEnergy: networkParams.totalDailyEnergy,
        formula: `${stakeAmountSun} ÷ ${networkParams.totalStakedForEnergy} × ${networkParams.totalDailyEnergy} ÷ 1,000,000`,
        rawResult: Math.round(rawResult),
        displayResult: Math.round(result)
      })
      return result
    } else {
      // Amount of Bandwidth obtained = Amount of TRX staked for obtaining Bandwidth / Total amount of TRX staked for obtaining Bandwidth on the whole network * 43,200,000,000
      if (!networkParams.totalStakedForBandwidth || networkParams.totalStakedForBandwidth <= 0) {
        console.warn('[NetworkParametersService] totalStakedForBandwidth无效:', networkParams.totalStakedForBandwidth)
        return 0
      }
      const rawResult = (stakeAmountSun / networkParams.totalStakedForBandwidth) * networkParams.totalDailyBandwidth
      // TRON资源单位转换：官方公式返回的数值需要除以1,000,000得到用户显示单位
      const result = rawResult / 1_000_000
      console.log(`[NetworkParametersService] Bandwidth计算详情:`, {
        input: `${stakeAmountTrx} TRX`,
        stakeAmountSun,
        totalStakedForBandwidth: networkParams.totalStakedForBandwidth,
        totalDailyBandwidth: networkParams.totalDailyBandwidth,
        formula: `${stakeAmountSun} ÷ ${networkParams.totalStakedForBandwidth} × ${networkParams.totalDailyBandwidth} ÷ 1,000,000`,
        rawResult: Math.round(rawResult),
        displayResult: Math.round(result)
      })
      return result
    }
  }

  /**
   * 格式化资源数量显示 - 显示真实完整数量
   */
  formatResourceAmount(amount: number, resourceType: 'ENERGY' | 'BANDWIDTH'): string {
    if (amount <= 0) return '0'
    
    // 返回真实的整数资源数量，使用千位分隔符
    const roundedAmount = Math.round(amount)
    
    if (resourceType === 'ENERGY') {
      return `${roundedAmount.toLocaleString()}`
    } else {
      return `${roundedAmount.toLocaleString()}`
    }
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
