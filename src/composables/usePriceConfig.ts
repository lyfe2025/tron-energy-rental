import { ref } from 'vue'
import { api } from '../utils/api'

export interface PriceConfig {
  id: string
  mode_type: 'energy_flash' | 'transaction_package' | 'trx_exchange'
  name: string
  description: string
  config: any
  inline_keyboard_config?: any
  image_url?: string
  image_alt?: string
  enable_image: boolean
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  network_id?: string
  network_name?: string
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

  // 加载所有价格配置（支持按网络ID筛选）
  const loadConfigs = async (networkId?: string) => {
    loading.value = true
    error.value = null
    try {
      const params = networkId ? { network_id: networkId } : {}
      const response = await api.get('/price-configs', { params })
      configs.value = response.data
    } catch (err: any) {
      error.value = err.message || '加载配置失败'
      console.error('Load configs error:', err)
    } finally {
      loading.value = false
    }
  }

  // 加载闪租配置（支持网络筛选）
  const loadFlashRentConfigs = async (networkId?: string) => {
    loading.value = true
    error.value = null
    try {
      const params = networkId ? { network_id: networkId } : {}
      const response = await api.get('/system/flash-rent-config', { params })
      
      // 更新configs数组，替换闪租配置
      const flashConfigs = response.data.data || response.data
      
      // 移除现有的闪租配置
      configs.value = configs.value.filter(c => c.mode_type !== 'energy_flash')
      
      // 添加新的闪租配置
      if (flashConfigs && flashConfigs.length > 0) {
        configs.value.push(...flashConfigs)
      }
    } catch (err: any) {
      error.value = err.message || '加载闪租配置失败'
      console.error('Load flash rent configs error:', err)
    } finally {
      loading.value = false
    }
  }

  // 更新闪租配置
  const updateFlashRentConfig = async (configId: string, configData: any) => {
    try {
      const response = await api.put(`/system/flash-rent-config/${configId}`, {
        name: configData.name,
        description: configData.description,
        config: configData.config,
        is_active: configData.is_active,
        enable_image: configData.enable_image,
        image_url: configData.image_url,
        image_alt: configData.image_alt
      })
      
      // 更新本地数据
      const index = configs.value.findIndex(c => c.id == configId) // 使用 == 进行类型转换比较
      if (index !== -1) {
        configs.value[index] = response.data
      }
      
      return response.data
    } catch (err: any) {
      error.value = err.message || '更新闪租配置失败'
      throw err
    }
  }

  // 创建闪租配置
  const createFlashRentConfig = async (networkId: string, name: string, description: string, configData: any) => {
    try {
      const response = await api.post('/system/flash-rent-config', {
        name,
        description,
        config: configData,
        network_id: networkId
      })
      
      configs.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.message || '创建闪租配置失败'
      throw err
    }
  }

  // 获取指定模式的配置
  const getConfig = (modeType: string): PriceConfig | undefined => {
    return configs.value.find(config => config.mode_type === modeType)
  }

  // 更新配置
  const updateConfig = async (modeType: string, configData: any, fullConfigObject?: any) => {
    try {
      // 如果传递了完整的配置对象，使用它来提取图片相关字段
      const requestData: any = {
        config: configData
      }
      
      // 如果有完整配置对象，添加图片相关字段
      if (fullConfigObject) {
        if (fullConfigObject.enable_image !== undefined) {
          requestData.enable_image = fullConfigObject.enable_image
        }
        if (fullConfigObject.image_url !== undefined) {
          requestData.image_url = fullConfigObject.image_url
        }
        if (fullConfigObject.image_alt !== undefined) {
          requestData.image_alt = fullConfigObject.image_alt
        }
        if (fullConfigObject.inline_keyboard_config !== undefined) {
          requestData.inline_keyboard_config = fullConfigObject.inline_keyboard_config
        }
      }
      
      const response = await api.put(`/price-configs/${modeType}`, requestData)
      
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
    loadFlashRentConfigs,
    updateFlashRentConfig,
    createFlashRentConfig,
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