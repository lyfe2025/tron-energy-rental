/**
 * 实时账户数据获取 Composable
 * 提供统一的TRON账户实时数据获取功能
 */
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { toast } from 'sonner'
import { ref } from 'vue'

export interface RealTimeAccountData {
  balance: number
  usdtBalance: number
  energy: { 
    total: number
    limit?: number
    available: number
    used?: number
    delegatedOut?: number
    delegatedIn?: number
  }
  bandwidth: { 
    total: number
    limit?: number
    available: number
    used?: number
    delegatedOut?: number
    delegatedIn?: number
    freeUsed?: number // 免费带宽已使用（调试信息）
    stakedUsed?: number // 质押带宽已使用（调试信息）
  }
  estimatedCostPerEnergy: number
  estimatedCostPerBandwidth: number
  usdtInfo?: { error?: string }
  contractInfo?: {
    address: string
    decimals: number
    type: string
    symbol: string
    name: string
  } | null
  delegation?: {
    energyOut: number
    energyIn: number
    bandwidthOut: number
    bandwidthIn: number
  }
}

export const useRealTimeAccountData = () => {
  const realTimeData = ref<RealTimeAccountData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 获取实时TRON账户数据
   * @param address TRON地址
   * @param networkId 网络ID
   * @param showToast 是否显示错误提示，默认true
   */
  const fetchRealTimeData = async (
    address: string, 
    networkId?: string, 
    showToast: boolean = true
  ): Promise<RealTimeAccountData | null> => {
    if (!address) {
      if (showToast) {
        toast.error('地址不能为空')
      }
      return null
    }

    console.log('🔍 [useRealTimeAccountData] 开始获取实时数据:', {
      address,
      networkId
    })

    loading.value = true
    error.value = null
    
    try {
      const response = await energyPoolExtendedAPI.validateTronAddress({
        address: address,
        private_key: '', // 空私钥，只获取账户信息
        network_id: networkId
      })

      if (response.data.success && response.data.data) {
        const data: RealTimeAccountData = {
          balance: response.data.data.balance,
          usdtBalance: response.data.data.usdtBalance || 0,
          energy: response.data.data.energy,
          bandwidth: response.data.data.bandwidth,
          estimatedCostPerEnergy: response.data.data.estimatedCostPerEnergy || 0.0001,
          estimatedCostPerBandwidth: (response.data.data as any).estimatedCostPerBandwidth || 0.001,
          usdtInfo: response.data.data.usdtInfo,
          contractInfo: (response.data.data as any).contractInfo
        }
        
        realTimeData.value = data
        console.log('✅ [useRealTimeAccountData] 实时数据获取成功')
        return data
      } else {
        const errorMsg = response.data.message || '获取实时数据失败'
        error.value = errorMsg
        if (showToast) {
          toast.error(errorMsg)
        }
        return null
      }
    } catch (err) {
      const errorMsg = '获取实时数据失败，请检查网络连接'
      error.value = errorMsg
      console.error('❌ [useRealTimeAccountData] 获取实时数据失败:', err)
      if (showToast) {
        toast.error(errorMsg)
      }
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 清空数据
   */
  const clearData = () => {
    realTimeData.value = null
    error.value = null
  }

  /**
   * 格式化能量数值
   */
  const formatEnergy = (energy: number): string => {
    if (energy == null || isNaN(energy) || typeof energy !== 'number') {
      return '0'
    }
    return Math.floor(energy).toLocaleString('zh-CN')
  }

  /**
   * 格式化带宽数值
   */
  const formatBandwidth = (bandwidth: number): string => {
    if (bandwidth == null || isNaN(bandwidth) || typeof bandwidth !== 'number') {
      return '0'
    }
    return Math.floor(bandwidth).toLocaleString('zh-CN')
  }

  /**
   * 格式化TRX数值
   */
  const formatTrx = (trx: number): string => {
    if (trx == null || isNaN(trx) || typeof trx !== 'number') {
      return '0'
    }
    return (trx / 1000000).toFixed(6)
  }

  /**
   * 格式化地址
   */
  const formatAddress = (address: string): string => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  return {
    // 数据
    realTimeData,
    loading,
    error,
    
    // 方法
    fetchRealTimeData,
    clearData,
    
    // 格式化函数
    formatEnergy,
    formatBandwidth,
    formatTrx,
    formatAddress
  }
}
