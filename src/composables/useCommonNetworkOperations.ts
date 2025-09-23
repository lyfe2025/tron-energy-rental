import { useToast } from '@/composables/useToast'
import { useNetworkStore } from '@/stores/useNetworkStore'
import { computed, ref } from 'vue'

export interface CommonNetwork {
  id: string
  name: string
  network_type?: string
  type?: string
  rpc_url: string
  is_active: boolean
  health_status?: string
}

export function useCommonNetworkOperations() {
  const networkStore = useNetworkStore()
  const { success, error: showError } = useToast()

  // 状态管理
  const loading = ref({
    networks: false,
    switching: false
  })
  
  const currentNetworkId = ref<string | null>(null)

  // 计算属性
  const currentNetwork = computed(() => {
    if (!currentNetworkId.value) return null
    return networkStore.networks.find(network => network.id === currentNetworkId.value) || null
  })

  const availableNetworks = computed(() => 
    networkStore.activeNetworks.filter(network => network.is_active)
  )

  // 网络切换
  const switchNetwork = async (networkId: string) => {
    if (loading.value.switching) return
    
    loading.value.switching = true
    try {
      if (networkId !== currentNetworkId.value) {
        // 设置当前网络
        currentNetworkId.value = networkId
        
        // 更新store中的当前网络（如果store支持）
        if (networkStore.selectNetwork) {
          networkStore.selectNetwork(networkId)
        }
        
        const networkName = getNetworkName(networkId)
        success(`已切换到网络: ${networkName}`)
        
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to switch network:', error)
      showError('网络切换失败')
      return false
    } finally {
      loading.value.switching = false
    }
  }

  // 初始化网络状态
  const initializeNetworks = async () => {
    try {
      loading.value.networks = true
      await networkStore.fetchNetworks()
      
      // 如果没有当前网络，自动选择第一个活跃网络
      if (!currentNetworkId.value && availableNetworks.value.length > 0) {
        const defaultNetwork = availableNetworks.value.find(n => n.is_default) || availableNetworks.value[0]
        currentNetworkId.value = defaultNetwork.id
      }
    } catch (error) {
      console.error('Failed to initialize networks:', error)
      showError('网络初始化失败')
    } finally {
      loading.value.networks = false
    }
  }

  // 获取网络名称
  const getNetworkName = (networkId: string): string => {
    const network = networkStore.networks.find(n => n.id === networkId)
    return network?.name || '未知网络'
  }

  // 获取网络状态文本
  const getNetworkStatusText = (network: CommonNetwork): string => {
    if (!network.is_active) return '已停用'
    
    switch (network.health_status) {
      case 'healthy':
        return '正常'
      case 'warning':
        return '警告'
      case 'error':
        return '错误'
      default:
        return '未知'
    }
  }

  // 获取网络状态样式类
  const getNetworkStatusClass = (network: CommonNetwork): string => {
    if (!network.is_active) return 'bg-gray-100 text-gray-800'
    
    switch (network.health_status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 设置当前网络（供外部调用）
  const setCurrentNetworkId = (networkId: string | null) => {
    currentNetworkId.value = networkId
  }

  return {
    // 状态
    loading,
    currentNetworkId,
    
    // 计算属性
    currentNetwork,
    availableNetworks,
    
    // 网络操作
    switchNetwork,
    initializeNetworks,
    setCurrentNetworkId,
    
    // 工具函数
    getNetworkName,
    getNetworkStatusText,
    getNetworkStatusClass
  }
}
