import { computed, onMounted, reactive } from 'vue'
import type {
    DateRange,
    ExportOptions,
    StatisticsFilters,
    StatisticsState
} from '../types/statistics.types'

export function useStatistics() {
  // 状态管理
  const state = reactive<StatisticsState>({
    overview: {
      totalRevenue: 0,
      totalOrders: 0,
      totalUsers: 0,
      totalEnergyRented: 0,
      averageOrderValue: 0,
      conversionRate: 0,
      growthRate: 0,
      activeUsers: 0
    },
    revenueData: [],
    orderStatusData: [],
    userGrowthData: [],
    energyUsageData: [],
    topUsersData: [],
    filters: {
      timeRange: 'month',
      category: 'all',
      userType: 'all'
    },
    isLoading: false,
    lastUpdated: null
  })

  // 计算属性
  const totalRevenue = computed(() => state.overview.totalRevenue)
  const totalOrders = computed(() => state.overview.totalOrders)
  const revenueGrowth = computed(() => state.overview.growthRate)
  const isDataLoaded = computed(() => state.lastUpdated !== null)

  // 方法
  const loadStatistics = async () => {
    state.isLoading = true
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 生成模拟数据
      generateMockData()
      
      state.lastUpdated = new Date()
      console.log('Statistics loaded successfully')
    } catch (error) {
      console.error('Failed to load statistics:', error)
    } finally {
      state.isLoading = false
    }
  }

  const generateMockData = () => {
    // 概览数据
    state.overview = {
      totalRevenue: 125600.50,
      totalOrders: 1248,
      totalUsers: 892,
      totalEnergyRented: 2450000,
      averageOrderValue: 100.64,
      conversionRate: 12.5,
      growthRate: 15.3,
      activeUsers: 567
    }

    // 收入数据
    state.revenueData = generateRevenueData()
    
    // 订单状态数据
    state.orderStatusData = [
      { status: '已完成', count: 856, percentage: 68.6, color: '#10B981' },
      { status: '进行中', count: 234, percentage: 18.8, color: '#3B82F6' },
      { status: '待处理', count: 98, percentage: 7.9, color: '#F59E0B' },
      { status: '已取消', count: 60, percentage: 4.8, color: '#EF4444' }
    ]

    // 用户增长数据
    state.userGrowthData = generateUserGrowthData()
    
    // 能量使用数据
    state.energyUsageData = generateEnergyUsageData()
    
    // 顶级用户数据
    state.topUsersData = [
      {
        id: '1',
        username: 'user001',
        email: 'user001@example.com',
        totalSpent: 12500,
        ordersCount: 45,
        lastOrderDate: '2024-01-15'
      },
      {
        id: '2',
        username: 'user002',
        email: 'user002@example.com',
        totalSpent: 8900,
        ordersCount: 32,
        lastOrderDate: '2024-01-14'
      }
      // 更多数据...
    ]
  }

  const generateRevenueData = () => {
    const data = []
    const now = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 5000) + 1000,
        orders: Math.floor(Math.random() * 50) + 10,
        energy: Math.floor(Math.random() * 100000) + 20000,
        bandwidth: Math.floor(Math.random() * 50000) + 10000
      })
    }
    
    return data
  }

  const generateUserGrowthData = () => {
    const data = []
    const now = new Date()
    let totalUsers = 500
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      const newUsers = Math.floor(Math.random() * 20) + 5
      totalUsers += newUsers
      
      data.push({
        date: date.toISOString().split('T')[0],
        newUsers,
        totalUsers,
        activeUsers: Math.floor(totalUsers * 0.6)
      })
    }
    
    return data
  }

  const generateEnergyUsageData = () => {
    const data = []
    const now = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      data.push({
        date: date.toISOString().split('T')[0],
        energy: Math.floor(Math.random() * 80000) + 20000,
        bandwidth: Math.floor(Math.random() * 40000) + 10000,
        transactions: Math.floor(Math.random() * 200) + 50
      })
    }
    
    return data
  }

  const updateFilters = (newFilters: Partial<StatisticsFilters>) => {
    state.filters = { ...state.filters, ...newFilters }
    loadStatistics()
  }

  const setTimeRange = (timeRange: StatisticsFilters['timeRange']) => {
    state.filters.timeRange = timeRange
    
    // 根据时间范围设置日期范围
    const now = new Date()
    let start: Date
    
    switch (timeRange) {
      case 'today':
        start = new Date(now)
        break
      case 'yesterday':
        start = new Date(now)
        start.setDate(start.getDate() - 1)
        break
      case 'week':
        start = new Date(now)
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start = new Date(now)
        start.setMonth(start.getMonth() - 1)
        break
      case 'quarter':
        start = new Date(now)
        start.setMonth(start.getMonth() - 3)
        break
      case 'year':
        start = new Date(now)
        start.setFullYear(start.getFullYear() - 1)
        break
      default:
        return
    }
    
    state.filters.dateRange = {
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    }
    
    loadStatistics()
  }

  const setCustomDateRange = (dateRange: DateRange) => {
    state.filters.timeRange = 'custom'
    state.filters.dateRange = dateRange
    loadStatistics()
  }

  const refreshData = () => {
    loadStatistics()
  }

  const exportReport = async (options: ExportOptions) => {
    try {
      console.log('Exporting report with options:', options)
      
      // 模拟导出过程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 创建下载链接
      const filename = `statistics-report-${new Date().toISOString().split('T')[0]}.${options.format}`
      const link = document.createElement('a')
      link.href = '#'
      link.download = filename
      link.click()
      
      console.log('Report exported successfully')
    } catch (error) {
      console.error('Failed to export report:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('zh-CN').format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getGrowthIcon = (value: number) => {
    if (value > 0) return 'trending-up'
    if (value < 0) return 'trending-down'
    return 'minus'
  }

  // 生命周期
  onMounted(() => {
    loadStatistics()
  })

  return {
    // 响应式数据
    overview: computed(() => state.overview),
    revenueData: computed(() => state.revenueData),
    orderStatusData: computed(() => state.orderStatusData),
    userGrowthData: computed(() => state.userGrowthData),
    energyUsageData: computed(() => state.energyUsageData),
    topUsersData: computed(() => state.topUsersData),
    filters: computed(() => state.filters),
    isLoading: computed(() => state.isLoading),
    lastUpdated: computed(() => state.lastUpdated),
    
    // 计算属性
    totalRevenue,
    totalOrders,
    revenueGrowth,
    isDataLoaded,
    
    // 方法
    loadStatistics,
    updateFilters,
    setTimeRange,
    setCustomDateRange,
    refreshData,
    exportReport,
    formatCurrency,
    formatNumber,
    formatPercentage,
    getGrowthColor,
    getGrowthIcon
  }
}
