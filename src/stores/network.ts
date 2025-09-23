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
        // 映射API返回的数据结构到Network接口
        const apiNetworks = response.data.data.networks || []
        networks.value = apiNetworks.map((apiNetwork: any) => ({
          id: apiNetwork.id,
          name: apiNetwork.name,
          type: apiNetwork.network_type || apiNetwork.type, // 映射network_type到type字段
          rpc_url: apiNetwork.rpc_url,
          explorer_url: apiNetwork.block_explorer_url || apiNetwork.explorer_url,
          is_active: apiNetwork.is_active,
          created_at: apiNetwork.created_at,
          updated_at: apiNetwork.updated_at
        }))
        
        console.log('✅ [NetworkStore] 网络数据映射完成:', {
          totalNetworks: networks.value.length,
          networks: networks.value.map(n => ({ id: n.id, name: n.name, type: n.type }))
        })
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
    // 支持字符串和数字类型的ID比较
    return networks.value.find(network => String(network.id) === String(id))
  }

  // 设置当前网络
  const setCurrentNetwork = (networkId: string): boolean => {
    console.log('🔌 [NetworkStore] 设置当前网络:', {
      networkId,
      availableNetworks: networks.value.length,
      allNetworkIds: networks.value.map(n => ({ id: n.id, name: n.name, type: typeof n.id }))
    })
    
    const network = getNetworkById(networkId)
    if (!network) {
      console.error(`网络 ID ${networkId} 不存在`)
      console.error('可用网络:', networks.value.map(n => ({ id: n.id, name: n.name })))
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
    localStorage.setItem('currentNetworkId', String(networkId))
    console.log('✅ [NetworkStore] 网络设置成功:', {
      networkId: network.id,
      networkName: network.name,
      isActive: network.is_active
    })
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
    const network = getNetworkById(String(networkId))
    const isValid = network ? network.is_active : false
    console.log('🔍 [NetworkStore] 验证网络:', {
      networkId,
      foundNetwork: !!network,
      networkName: network?.name,
      isActive: network?.is_active,
      isValid
    })
    return isValid
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