import { ref } from 'vue'
import { api } from '../utils/api'

export interface PriceConfig {
  id: string
  mode_type: 'energy_flash' | 'transaction_package' | 'trx_exchange'
  name: string
  description: string
  config: any
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface EnergyFlashConfig {
  single_price: number
  max_transactions: number
  expiry_hours: number
  payment_address: string
  double_energy_for_no_usdt: boolean
  currency: string
}

export interface TransactionPackageConfig {
  daily_fee: number
  transferable: boolean
  proxy_purchase: boolean
  packages: Array<{
    name: string
    transaction_count: number
    price: number
    currency: string
  }>
}


export interface TrxExchangeConfig {
  exchange_address: string
  min_amount: number
  usdt_to_trx_rate: number
  trx_to_usdt_rate: number
  rate_update_interval: number
  notes: string[]
  is_auto_exchange: boolean
}

export function usePriceConfig() {
  const configs = ref<PriceConfig[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 加载所有价格配置
  const loadConfigs = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/price-configs')
      configs.value = response.data
    } catch (err: any) {
      error.value = err.message || '加载配置失败'
      console.error('Load configs error:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取指定模式的配置
  const getConfig = (modeType: string): PriceConfig | undefined => {
    return configs.value.find(config => config.mode_type === modeType)
  }

  // 更新配置
  const updateConfig = async (modeType: string, configData: any) => {
    try {
      const response = await api.put(`/price-configs/${modeType}`, {
        config: configData
      })
      
      // 更新本地数据
      const index = configs.value.findIndex(c => c.mode_type === modeType)
      if (index !== -1) {
        configs.value[index] = response.data
      }
      
      return response.data
    } catch (err: any) {
      error.value = err.message || '更新配置失败'
      throw err
    }
  }

  // 切换配置状态
  const toggleConfigStatus = async (modeType: string) => {
    try {
      const config = getConfig(modeType)
      if (!config) throw new Error('配置不存在')

      const response = await api.patch(`/price-configs/${modeType}/toggle`, {
        is_active: !config.is_active
      })
      
      // 更新本地数据
      const index = configs.value.findIndex(c => c.mode_type === modeType)
      if (index !== -1) {
        configs.value[index].is_active = response.data.is_active
      }
      
      return response.data
    } catch (err: any) {
      error.value = err.message || '切换状态失败'
      throw err
    }
  }

  // 创建新配置
  const createConfig = async (modeType: string, name: string, description: string, configData: any) => {
    try {
      const response = await api.post('/price-configs', {
        mode_type: modeType,
        name,
        description,
        config: configData,
        is_active: true
      })
      
      configs.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.message || '创建配置失败'
      throw err
    }
  }

  // 删除配置
  const deleteConfig = async (modeType: string) => {
    try {
      await api.delete(`/price-configs/${modeType}`)
      
      // 从本地数据中移除
      const index = configs.value.findIndex(c => c.mode_type === modeType)
      if (index !== -1) {
        configs.value.splice(index, 1)
      }
    } catch (err: any) {
      error.value = err.message || '删除配置失败'
      throw err
    }
  }

  // 获取能量闪租配置
  const getEnergyFlashConfig = (): EnergyFlashConfig | null => {
    const config = getConfig('energy_flash')
    return config ? config.config : null
  }

  // 获取笔数套餐配置
  const getTransactionPackageConfig = (): TransactionPackageConfig | null => {
    const config = getConfig('transaction_package')
    return config ? config.config : null
  }


  // 获取TRX闪兑配置
  const getTrxExchangeConfig = (): TrxExchangeConfig | null => {
    const config = getConfig('trx_exchange')
    return config ? config.config : null
  }

  return {
    configs,
    loading,
    error,
    loadConfigs,
    getConfig,
    updateConfig,
    toggleConfigStatus,
    createConfig,
    deleteConfig,
    getEnergyFlashConfig,
    getTransactionPackageConfig,
    getTrxExchangeConfig
  }
}