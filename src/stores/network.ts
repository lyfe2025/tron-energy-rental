import { useToast } from '@/composables/useToast'
import { apiClient } from '@/services/api/core/apiClient'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface Network {
  id: string
  name: string
  type: string
  rpc_url: string
  explorer_url?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export const useNetworkStore = defineStore('network', () => {
  const { success, error } = useToast()
  // 状态
  const networks = ref<Network[]>([])
  const currentNetwork = ref<Network | null>(null)
  const loading = ref(false)

  // 计算属性
  const activeNetworks = computed(() => 
    networks.value.filter(network => network.is_active)
  )

  const currentNetworkId = computed(() => currentNetwork.value?.id || null)

  const isNetworkSelected = computed(() => currentNetwork.value !== null)

  // 获取网络图标
  const getNetworkIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      'mainnet': 'M',
      'testnet': 'T',
      'shasta': 'S',
      'nile': 'N'
    }
    return iconMap[type.toLowerCase()] || 'N'
  }

  // 获取网络图标样式
  const getNetworkIconClass = (type: string): string => {
    const classMap: Record<string, string> = {
      'mainnet': 'bg-green-500',
      'testnet': 'bg-blue-500',
      'shasta': 'bg-purple-500',
      'nile': 'bg-orange-500'
    }
    return classMap[type.toLowerCase()] || 'bg-gray-500'
  }

  // 加载网络列表
  const loadNetworks = async (): Promise<void> => {
    try {
      loading.value = true
      const response = await apiClient.get('/api/tron-networks')
      if (response.data.success && response.data.data) {
        networks.value = response.data.data.networks || []
      } else {
        throw new Error(response.data.message || '获取网络列表失败')
      }
    } catch (error) {
      console.error('加载网络列表失败:', error)
      error('加载网络列表失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 根据ID获取网络
  const getNetworkById = (id: string): Network | undefined => {
    return networks.value.find(network => network.id === id)
  }

  // 设置当前网络
  const setCurrentNetwork = (networkId: string): boolean => {
    const network = getNetworkById(networkId)
    if (!network) {
      console.error(`网络 ID ${networkId} 不存在`)
      error('网络不存在')
      return false
    }
    
    if (!network.is_active) {
      console.error(`网络 ${network.name} 当前不可用`)
      error(`网络 ${network.name} 当前不可用`)
      return false
    }
    
    currentNetwork.value = network
    // 保存到本地存储
    localStorage.setItem('currentNetworkId', networkId)
    return true
  }

  // 切换网络
  const switchNetwork = async (networkId: string): Promise<boolean> => {
    if (currentNetwork.value?.id === networkId) {
      return true // 已经是当前网络
    }
    
    const isSuccess = setCurrentNetwork(networkId)
    if (isSuccess) {
      success(`已切换到 ${currentNetwork.value?.name} 网络`)
    }
    return isSuccess
  }

  // 从本地存储恢复网络状态
  const restoreNetworkFromStorage = (): void => {
    const savedNetworkId = localStorage.getItem('currentNetworkId')
    if (savedNetworkId) {
      setCurrentNetwork(savedNetworkId)
    }
  }

  // 清除当前网络
  const clearCurrentNetwork = (): void => {
    currentNetwork.value = null
    localStorage.removeItem('currentNetworkId')
  }

  // 初始化网络状态
  const initializeNetworks = async (): Promise<void> => {
    await loadNetworks()
    restoreNetworkFromStorage()
  }

  // 验证网络是否可用
  const validateNetwork = (networkId: string): boolean => {
    const network = getNetworkById(networkId)
    return network ? network.is_active : false
  }

  // 获取网络显示名称
  const getNetworkDisplayName = (network: Network): string => {
    return `${network.name} (${network.type})`
  }

  return {
    // 状态
    networks,
    currentNetwork,
    loading,
    
    // 计算属性
    activeNetworks,
    currentNetworkId,
    isNetworkSelected,
    
    // 方法
    loadNetworks,
    getNetworkById,
    setCurrentNetwork,
    switchNetwork,
    clearCurrentNetwork,
    initializeNetworks,
    validateNetwork,
    getNetworkDisplayName,
    getNetworkIcon,
    getNetworkIconClass,
    restoreNetworkFromStorage
  }
})