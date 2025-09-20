import { ref } from 'vue'
import { api } from '../utils/api'

export interface TronNetwork {
  id: string
  name: string
  network_type: 'mainnet' | 'testnet' | 'private'
  is_active: boolean
  has_flash_config?: boolean
}

export function useNetworks() {
  const networks = ref<TronNetwork[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedNetworkId = ref<string | null>(null)

  // 加载所有可用网络
  const loadNetworks = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/tron-networks')
      networks.value = response.data.filter((n: TronNetwork) => n.is_active)
      
      // 如果没有选中网络，选择第一个主网
      if (!selectedNetworkId.value && networks.value.length > 0) {
        const mainnet = networks.value.find(n => n.network_type === 'mainnet')
        selectedNetworkId.value = mainnet?.id || networks.value[0].id
      }
    } catch (err: any) {
      error.value = err.message || '加载网络列表失败'
      console.error('Load networks error:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取闪租配置专用的网络列表
  const loadFlashRentNetworks = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/system/flash-rent-config/networks')
      networks.value = response.data
      
      // 如果没有选中网络，选择第一个主网
      if (!selectedNetworkId.value && networks.value.length > 0) {
        const mainnet = networks.value.find(n => n.network_type === 'mainnet')
        selectedNetworkId.value = mainnet?.id || networks.value[0].id
      }
    } catch (err: any) {
      error.value = err.message || '加载网络列表失败'
      console.error('Load flash rent networks error:', err)
    } finally {
      loading.value = false
    }
  }

  // 选择网络
  const selectNetwork = (networkId: string) => {
    selectedNetworkId.value = networkId
  }

  // 获取当前选中的网络
  const getSelectedNetwork = (): TronNetwork | null => {
    if (!selectedNetworkId.value) return null
    return networks.value.find(n => n.id === selectedNetworkId.value) || null
  }

  return {
    networks,
    loading,
    error,
    selectedNetworkId,
    loadNetworks,
    loadFlashRentNetworks,
    selectNetwork,
    getSelectedNetwork
  }
}
