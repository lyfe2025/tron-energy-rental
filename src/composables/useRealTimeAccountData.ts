/**
 * 实时账户数据获取 Composable
 * 提供统一的TRON账户实时数据获取功能
 */
import { useToast } from '@/composables/useToast'
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
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
    freeUsed?: number // 免费带宽已使用
    stakedUsed?: number // 质押带宽已使用
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
  // 新增质押状态数据
  stakeStatus?: {
    unlockingTrx: number
    withdrawableTrx: number
    stakedEnergy: number
    stakedBandwidth: number
    delegatedEnergy: number
    delegatedBandwidth: number
  }
}

export const useRealTimeAccountData = () => {
  const { error: showError } = useToast()
  const realTimeData = ref<RealTimeAccountData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 获取实时TRON账户数据
   * @param address TRON地址
   * @param networkId 网络ID
   * @param showToast 是否显示错误提示，默认true
   * @param includeStakeStatus 是否包含质押状态，默认true
   */
  const fetchRealTimeData = async (
    address: string, 
    networkId?: string, 
    showToast: boolean = true,
    includeStakeStatus: boolean = true
  ): Promise<RealTimeAccountData | null> => {
    if (!address) {
      if (showToast) {
        showError('地址不能为空')
      }
      return null
    }

    console.log('🔍 [useRealTimeAccountData] 开始获取实时数据:', {
      address,
      networkId,
      includeStakeStatus
    })

    loading.value = true
    error.value = null
    
    try {
      // 先获取基础数据
      const baseResponse = await energyPoolExtendedAPI.validateTronAddress({
        address: address,
        private_key: '', // 空私钥，只获取账户信息
        network_id: networkId
      })

      if (baseResponse.data.success && baseResponse.data.data) {
        const data: RealTimeAccountData = {
          balance: baseResponse.data.data.balance,
          usdtBalance: baseResponse.data.data.usdtBalance || 0,
          energy: baseResponse.data.data.energy,
          bandwidth: baseResponse.data.data.bandwidth,
          estimatedCostPerEnergy: baseResponse.data.data.estimatedCostPerEnergy || 0.0001,
          estimatedCostPerBandwidth: (baseResponse.data.data as any).estimatedCostPerBandwidth || 0.001,
          usdtInfo: baseResponse.data.data.usdtInfo,
          contractInfo: (baseResponse.data.data as any).contractInfo
        }

        // 如果需要质押状态，单独获取
        if (includeStakeStatus) {
          try {
            const stakeResponse = await energyPoolExtendedAPI.getAccountStakeStatus(address, networkId)
            if (stakeResponse.data.success && stakeResponse.data.data) {
              data.stakeStatus = stakeResponse.data.data.stakeStatus
              console.log('✅ [useRealTimeAccountData] 质押状态获取成功:', data.stakeStatus)
            } else {
              // 提供默认质押状态数据
              data.stakeStatus = {
                unlockingTrx: 0,
                withdrawableTrx: 0,
                stakedEnergy: 0,
                stakedBandwidth: 0,
                delegatedEnergy: 0,
                delegatedBandwidth: 0
              }
              console.log('⚠️ [useRealTimeAccountData] 质押状态获取失败，使用默认值')
            }
          } catch (stakeError) {
            console.warn('🔍 [useRealTimeAccountData] 质押状态获取失败，使用默认值:', stakeError)
            data.stakeStatus = {
              unlockingTrx: 0,
              withdrawableTrx: 0,
              stakedEnergy: 0,
              stakedBandwidth: 0,
              delegatedEnergy: 0,
              delegatedBandwidth: 0
            }
          }
        }
        
        realTimeData.value = data
        console.log('✅ [useRealTimeAccountData] 实时数据获取成功')
        return data
      } else {
        const errorMsg = baseResponse.data.message || '获取实时数据失败'
        error.value = errorMsg
        if (showToast) {
          showError(errorMsg)
        }
        return null
      }
    } catch (err) {
      const errorMsg = '获取实时数据失败，请检查网络连接'
      error.value = errorMsg
      console.error('❌ [useRealTimeAccountData] 获取实时数据失败:', err)
      if (showToast) {
        showError(errorMsg)
      }
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 只获取质押状态数据
   * @param address TRON地址
   * @param networkId 网络ID
   * @param showToast 是否显示错误提示，默认true
   */
  const fetchStakeStatus = async (
    address: string,
    networkId?: string,
    showToast: boolean = true
  ): Promise<RealTimeAccountData['stakeStatus'] | null> => {
    if (!address) {
      if (showToast) {
        showError('地址不能为空')
      }
      return null
    }

    console.log('🔍 [useRealTimeAccountData] 开始获取质押状态:', {
      address,
      networkId
    })

    try {
      const response = await energyPoolExtendedAPI.getAccountStakeStatus(address, networkId)

      if (response.data.success && response.data.data) {
        const stakeStatus = response.data.data.stakeStatus
        
        // 更新现有数据中的质押状态
        if (realTimeData.value) {
          realTimeData.value.stakeStatus = stakeStatus
        }
        
        console.log('✅ [useRealTimeAccountData] 质押状态获取成功:', stakeStatus)
        return stakeStatus
      } else {
        const errorMsg = response.data.message || '获取质押状态失败'
        if (showToast) {
          showError(errorMsg)
        }
        return null
      }
    } catch (err) {
      const errorMsg = '获取质押状态失败，请检查网络连接'
      console.error('❌ [useRealTimeAccountData] 获取质押状态失败:', err)
      if (showToast) {
        showError(errorMsg)
      }
      return null
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
   * 智能格式化TRX数值（sun转TRX）
   */
  const formatTrx = (trx: number): string => {
    if (trx == null || isNaN(trx) || typeof trx !== 'number') {
      return '0'
    }
    
    const trxValue = trx / 1000000
    return formatTrxValue(trxValue)
  }

  /**
   * 智能格式化质押状态TRX数值（已经是TRX单位）
   */
  const formatStakeTrx = (trx: number): string => {
    if (trx == null || isNaN(trx) || typeof trx !== 'number') {
      return '0'
    }
    
    return formatTrxValue(trx)
  }

  /**
   * 统一的TRX数值格式化逻辑
   */
  const formatTrxValue = (trxValue: number): string => {
    if (trxValue === 0) return '0'
    
    // 对于大数值，显示2位小数
    if (trxValue >= 1000) {
      return trxValue.toLocaleString('zh-CN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
    }
    // 对于中等数值，显示必要的小数位，最多6位
    else if (trxValue >= 1) {
      return trxValue.toLocaleString('zh-CN', { maximumFractionDigits: 6, minimumFractionDigits: 0 })
    }
    // 对于小数值，保留6位小数但去掉末尾的0
    else {
      return parseFloat(trxValue.toFixed(6)).toString()
    }
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
    fetchStakeStatus,
    clearData,
    
    // 格式化函数
    formatEnergy,
    formatBandwidth,
    formatTrx,
    formatStakeTrx,
    formatAddress
  }
}
