import { useToast } from '@/composables/useToast'
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { useNetworkStore } from '@/stores/useNetworkStore'
import type { TronNetwork } from '@/types/network'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useNetworkOperations() {
  const route = useRoute()
  const router = useRouter()
  const networkStore = useNetworkStore()
  const { success, error, info } = useToast()

  // 状态管理
  const loading = ref({
    networks: false,
    switching: false
  })

  // 计算属性
  const currentNetworkId = computed(() => {
    const networkId = route.params.networkId as string
    console.log('🔍 [useNetworkOperations] 获取路由参数:', {
      routeParams: route.params,
      networkId: networkId,
      routePath: route.path,
      routeName: route.name
    })
    return networkId
  })

  const currentNetwork = computed(() => {
    const networkId = currentNetworkId.value
    if (!networkId) {
      console.log('🔍 [useNetworkOperations] 当前网络ID为空')
      return undefined
    }
    
    // 确保网络ID类型匹配（支持字符串和数字类型的比较）
    const network = networkStore.getNetworkById(networkId)
    
    console.log('🔍 [useNetworkOperations] 查找网络:', {
      currentNetworkId: networkId,
      availableNetworks: networkStore.networks.length,
      allNetworks: networkStore.networks.map(n => ({ id: n.id, name: n.name, type: String(n.id) })),
      foundNetwork: !!network,
      networkName: network?.name
    })
    
    return network
  })

  const availableNetworks = computed(() => 
    networkStore.activeNetworks
  )

  // 网络加载
  const loadNetworks = async () => {
    loading.value.networks = true
    try {
      console.log('🌐 [useNetworkOperations] 加载网络列表')
      const response = await energyPoolExtendedAPI.getNetworks()
      if (response.data.success && response.data.data) {
        const networks = response.data.data.map((network: any) => ({
          id: network.id,
          name: network.name,
          type: network.type,
          rpc_url: network.rpc_url,
          is_active: network.is_active,
          health_status: network.health_status
        }))
        console.log(`🌐 [useNetworkOperations] 加载了 ${networks.length} 个网络`)
        return networks
      }
      return []
    } catch (err) {
      console.error('Failed to load networks:', err)
      error('加载网络列表失败')
      return []
    } finally {
      loading.value.networks = false
    }
  }

  // 网络切换
  const switchNetwork = async (networkId: string) => {
    if (loading.value.switching) return
    
    loading.value.switching = true
    try {
      if (networkId !== currentNetworkId.value) {
        // 检查当前路由，决定跳转目标
        const currentRoute = route.name
        if (currentRoute === 'config-energy-pools-network') {
          // 从配置管理进入，跳转到配置管理的其他网络页面
          await router.push(`/config/energy-pools/${networkId}`)
        } else {
          // 从能量池管理进入，跳转到能量池管理的其他网络页面
          await router.push(`/energy-pool/${networkId}/accounts`)
        }
        
        // 更新store中的当前网络
        networkStore.selectNetwork(networkId)
        success(`已切换到网络: ${getNetworkName(networkId)}`)
      }
    } catch (err) {
      console.error('Failed to switch network:', err)
      error('网络切换失败')
    } finally {
      loading.value.switching = false
    }
  }

  // 网络状态检查
  const checkNetworkHealth = async (networkId?: string) => {
    const targetNetworkId = networkId || currentNetworkId.value
    if (!targetNetworkId) return false

    try {
      // 由于API中没有checkNetworkHealth方法，暂时返回活跃状态
      const network = networkStore.getNetworkById(targetNetworkId)
      return network?.is_active || false
    } catch (err) {
      console.error('Failed to check network health:', err)
      return false
    }
  }

  // 初始化网络状态
  const initializeNetworks = async () => {
    try {
      // 使用 networkStore 的 fetchNetworks 方法加载网络数据
      await networkStore.fetchNetworks()
      
      // 如果有当前网络ID，设置为当前网络
      if (currentNetworkId.value) {
        networkStore.selectNetwork(currentNetworkId.value)
      }
    } catch (err) {
      console.error('Failed to initialize networks:', err)
      error('网络初始化失败')
    }
  }

  // 获取网络名称
  const getNetworkName = (networkId: string): string => {
    const network = networkStore.getNetworkById(networkId)
    return network?.name || '未知网络'
  }

  // 获取网络状态文本
  const getNetworkStatusText = (network: TronNetwork): string => {
    if (!network.is_active) return '已停用'
    
    switch (network.health_status) {
      case 'healthy':
        return '正常'
      case 'unhealthy':
        return '警告'
      case 'error':
        return '错误'
      default:
        return '未知'
    }
  }

  // 获取网络状态样式类
  const getNetworkStatusClass = (network: TronNetwork): string => {
    if (!network.is_active) return 'bg-gray-100 text-gray-800'
    
    switch (network.health_status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'unhealthy':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 验证网络连接
  const validateNetworkConnection = async (networkId: string): Promise<boolean> => {
    try {
      // 由于API中没有validateNetworkConnection方法，暂时返回网络是否活跃
      const network = networkStore.getNetworkById(networkId)
      return network?.is_active || false
    } catch (err) {
      console.error('Failed to validate network connection:', err)
      return false
    }
  }

  // 获取网络统计信息
  const getNetworkStats = async (networkId?: string) => {
    const targetNetworkId = networkId || currentNetworkId.value
    if (!targetNetworkId) return null

    try {
      // 由于API中没有getNetworkStats方法，返回基本网络信息
      const network = networkStore.getNetworkById(targetNetworkId)
      if (network) {
        return {
          networkId: network.id,
          name: network.name,
          isActive: network.is_active,
          healthStatus: network.health_status || 'unknown'
        }
      }
    } catch (err) {
      console.error('Failed to get network stats:', err)
    }
    return null
  }

  // 重新连接网络
  const reconnectNetwork = async (networkId?: string) => {
    const targetNetworkId = networkId || currentNetworkId.value
    if (!targetNetworkId) return false

    try {
      // 重新加载网络数据
      await networkStore.fetchNetworks()
      success('网络重连成功')
      return true
    } catch (err) {
      console.error('Failed to reconnect network:', err)
      error('网络重连失败')
    }
    return false
  }

  return {
    // 状态
    loading,
    
    // 计算属性
    currentNetworkId,
    currentNetwork,
    availableNetworks,
    
    // 网络操作
    loadNetworks,
    switchNetwork,
    checkNetworkHealth,
    initializeNetworks,
    validateNetworkConnection,
    reconnectNetwork,
    
    // 网络统计
    getNetworkStats,
    
    // 工具函数
    getNetworkName,
    getNetworkStatusText,
    getNetworkStatusClass
  }
}
