/**
 * 能源池统计数据管理模块
 * 负责统计信息和今日消费数据的处理
 */

import { useToast } from '@/composables/useToast'
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { reactive, ref } from 'vue'
import type { EnergyPoolStatistics, LoadingStates, TodayConsumption } from '../types/energy-pool.types'

export function usePoolStats() {
  const toast = useToast()
  
  const statistics = reactive<EnergyPoolStatistics>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalEnergy: 0,
    availableEnergy: 0,
    totalBandwidth: 0,
    availableBandwidth: 0,
    averageCost: 0,
    utilizationRate: 0,
    bandwidthUtilizationRate: 0
  })

  const todayConsumption = ref<TodayConsumption | null>(null)
  
  const loading = reactive<LoadingStates>({
    statistics: false,
    accounts: false,
    refresh: false,
    batch: false
  })

  // 加载统计信息
  const loadStatistics = async (networkId?: string) => {
    loading.statistics = true
    try {
      console.log('📊 [usePoolStats] 加载统计信息:', { networkId })
      const response = await energyPoolExtendedAPI.getStatistics(networkId)
      if (response.data.success && response.data.data) {
        Object.assign(statistics, response.data.data)
        console.log('✅ [usePoolStats] 统计信息加载完成:', statistics)
      }
    } catch (error) {
      console.error('Failed to load statistics:', error)
      toast.error('加载统计信息失败')
    } finally {
      loading.statistics = false
    }
  }

  // 获取今日统计（基于订单记录）
  const loadTodayConsumption = async () => {
    loading.statistics = true
    try {
      console.log('📈 [usePoolStats] 加载今日订单统计')
      
      // 尝试加载基于订单的统计数据
      try {
        const orderResponse = await energyPoolExtendedAPI.getOrderBasedStats()
        if (orderResponse.data.success) {
          // 将新的数据结构映射到原有的格式，保持兼容性
          todayConsumption.value = {
            total_consumed_energy: orderResponse.data.data.totalEnergyDelegated || 0,
            total_revenue: orderResponse.data.data.totalRevenue || 0,
            total_transactions: orderResponse.data.data.completedOrders || 0,
            average_price: orderResponse.data.data.averageOrderValue || 0,
            success_rate: orderResponse.data.data.successRate || 0,
            // 兼容旧格式的字段名
            total_cost: orderResponse.data.data.totalRevenue || 0
          }
          console.log('✅ [usePoolStats] 今日订单统计加载完成:', todayConsumption.value)
          return
        }
      } catch (orderError) {
        console.warn('📊 [usePoolStats] 订单统计接口暂不可用:', orderError)
      }

      // 如果订单统计失败，使用默认空数据
      todayConsumption.value = {
        total_consumed_energy: 0,
        total_revenue: 0,
        total_transactions: 0,
        average_price: 0,
        success_rate: 0,
        total_cost: 0
      }
      console.log('📊 [usePoolStats] 使用默认统计数据')
      
    } catch (error) {
      console.error('Failed to load today statistics:', error)
      // 提供友好的错误提示，不显示技术性错误
      toast.error('暂时无法获取今日统计，显示默认数据')
      
      // 设置默认值避免界面出错
      todayConsumption.value = {
        total_consumed_energy: 0,
        total_revenue: 0,
        total_transactions: 0,
        average_price: 0,
        success_rate: 0,
        total_cost: 0
      }
    } finally {
      loading.statistics = false
    }
  }

  // 格式化能量数值 - 直观显示，无小数点
  const formatEnergy = (energy: number): string => {
    // 检查energy是否为有效数字
    if (energy == null || isNaN(energy) || typeof energy !== 'number') {
      return '0'
    }
    
    // 直接显示完整数字，不使用K/M后缀，不显示小数点
    return Math.floor(energy).toLocaleString('zh-CN')
  }

  // 格式化地址
  const formatAddress = (address: string): string => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // 格式化日期
  const formatDate = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return {
    statistics,
    todayConsumption,
    loading,
    loadStatistics,
    loadTodayConsumption,
    formatEnergy,
    formatAddress,
    formatDate
  }
}
