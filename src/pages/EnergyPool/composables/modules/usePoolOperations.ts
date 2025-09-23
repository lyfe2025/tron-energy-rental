/**
 * 能源池操作逻辑模块
 * 负责能量分配优化、状态刷新等操作
 */

import { useToast } from '@/composables/useToast'
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { reactive, ref } from 'vue'
import type { LoadingStates, NetworkInfo } from '../types/energy-pool.types'

export function usePoolOperations() {
  const { success, error, info } = useToast()
  
  const loading = reactive<LoadingStates>({
    statistics: false,
    accounts: false,
    refresh: false,
    batch: false
  })

  // 防抖相关状态
  const refreshDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const isRefreshing = ref(false)

  // 刷新能量池状态（带防抖）
  const refreshStatus = async () => {
    // 防抖检查：如果已经在刷新中或防抖定时器存在，直接返回
    if (isRefreshing.value || refreshDebounceTimer.value) {
      console.log('🚫 [usePoolOperations] 防抖拦截：刷新状态正在进行中')
      info('刷新操作进行中，请稍候...')
      return
    }

    // 设置防抖状态
    isRefreshing.value = true
    loading.refresh = true

    // 设置防抖定时器（1000ms内不允许重复刷新）
    refreshDebounceTimer.value = setTimeout(async () => {
      try {
        console.log('✅ [usePoolOperations] 执行状态刷新操作')
        const response = await energyPoolExtendedAPI.refreshStatus()
        if (response.data.success) {
          success('状态刷新成功')
          return true
        }
        throw new Error('刷新失败')
      } catch (error) {
        console.error('Failed to refresh status:', error)
        error('刷新状态失败')
        throw error
      } finally {
        loading.refresh = false
        // 延迟清理防抖状态，给用户足够的反馈时间
        setTimeout(() => {
          isRefreshing.value = false
          refreshDebounceTimer.value = null
        }, 1500)
      }
    }, 500)
  }

  // 优化能量分配
  const optimizeAllocation = async (requiredEnergy: number) => {
    try {
      const response = await energyPoolExtendedAPI.optimizeAllocation(requiredEnergy)
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      throw new Error('优化分配失败')
    } catch (error) {
      console.error('Failed to optimize allocation:', error)
      error('优化能量分配失败')
      throw error
    }
  }

  // 加载可用网络列表
  const loadNetworks = async (): Promise<NetworkInfo[]> => {
    try {
      console.log('🌐 [usePoolOperations] 加载网络列表')
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
        console.log(`🌐 [usePoolOperations] 加载了 ${networks.length} 个网络`)
        return networks
      }
      return []
    } catch (error) {
      console.error('Failed to load networks:', error)
      error('加载网络列表失败')
      return []
    }
  }

  return {
    loading,
    refreshStatus,
    optimizeAllocation,
    loadNetworks,
    isRefreshing
  }
}
