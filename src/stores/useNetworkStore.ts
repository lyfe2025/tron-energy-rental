/**
 * 网络状态管理 Store
 * 用于全局管理网络选择状态，支持能量池管理等模块的网络选择功能
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { networkApi } from '@/api/network'
import type { TronNetwork } from '@/types/network'
import { useToast } from '@/composables/useToast'

export const useNetworkStore = defineStore('network', () => {
  const toast = useToast()
  
  // 状态数据
  const networks = ref<TronNetwork[]>([])
  const selectedNetworkId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // 计算属性
  const selectedNetwork = computed(() => {
    if (!selectedNetworkId.value) return null
    return networks.value.find(n => n.id === selectedNetworkId.value) || null
  })
  
  const activeNetworks = computed(() => {
    return networks.value.filter(n => n.is_active)
  })
  
  const networkOptions = computed(() => {
    return activeNetworks.value.map(network => ({
      value: network.id,
      label: network.name,
      type: network.type,
      isActive: network.is_active,
      healthStatus: network.health_status
    }))
  })
  
  // Actions
  const fetchNetworks = async () => {
    if (loading.value) return
    
    try {
      loading.value = true
      error.value = null
      
      console.log('🌐 [NetworkStore] 开始加载网络列表...')
      const response = await networkApi.getNetworks()
      
      // 处理API响应数据结构
      if (response.data?.networks) {
        networks.value = response.data.networks
      } else if (Array.isArray(response.data)) {
        networks.value = response.data
      } else {
        networks.value = []
      }
      
      console.log(`✅ [NetworkStore] 网络列表加载完成，共 ${networks.value.length} 个网络`)
      
      // 如果当前没有选择网络且有可用网络，自动选择第一个活跃网络
      if (!selectedNetworkId.value && activeNetworks.value.length > 0) {
        const defaultNetwork = activeNetworks.value.find(n => n.is_default) || activeNetworks.value[0]
        selectNetwork(defaultNetwork.id)
      }
      
    } catch (err: any) {
      error.value = err.message || '加载网络列表失败'
      console.error('❌ [NetworkStore] 加载网络列表失败:', err)
      toast.error('加载网络列表失败')
    } finally {
      loading.value = false
    }
  }
  
  const selectNetwork = (networkId: string | null) => {
    if (networkId && !networks.value.find(n => n.id === networkId)) {
      console.warn(`⚠️ [NetworkStore] 尝试选择不存在的网络: ${networkId}`)
      return
    }
    
    const oldNetworkId = selectedNetworkId.value
    selectedNetworkId.value = networkId
    
    console.log('🔄 [NetworkStore] 网络选择变更:', {
      from: oldNetworkId,
      to: networkId,
      networkName: selectedNetwork.value?.name
    })
  }
  
  const clearSelection = () => {
    selectedNetworkId.value = null
    console.log('🔄 [NetworkStore] 清除网络选择')
  }
  
  const refreshNetworks = async () => {
    console.log('🔄 [NetworkStore] 刷新网络列表')
    await fetchNetworks()
  }
  
  const getNetworkById = (networkId: string): TronNetwork | null => {
    return networks.value.find(n => n.id === networkId) || null
  }
  
  const isNetworkActive = (networkId: string): boolean => {
    const network = getNetworkById(networkId)
    return network?.is_active || false
  }
  
  const getNetworkDisplayName = (networkId: string): string => {
    const network = getNetworkById(networkId)
    return network?.name || '未知网络'
  }
  
  // 重置状态
  const reset = () => {
    networks.value = []
    selectedNetworkId.value = null
    loading.value = false
    error.value = null
    console.log('🔄 [NetworkStore] 状态已重置')
  }
  
  return {
    // 状态
    networks,
    selectedNetworkId,
    loading,
    error,
    
    // 计算属性
    selectedNetwork,
    activeNetworks,
    networkOptions,
    
    // Actions
    fetchNetworks,
    selectNetwork,
    clearSelection,
    refreshNetworks,
    getNetworkById,
    isNetworkActive,
    getNetworkDisplayName,
    reset
  }
})

// 导出类型
export interface NetworkOption {
  value: string
  label: string
  type: string
  isActive: boolean
  healthStatus?: string
}