import { useToast } from '@/composables/useToast'
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { reactive, ref } from 'vue'

interface EnergyPoolAccount {
  id: string
  name: string
  tron_address: string
  private_key_encrypted: string
  total_energy: number
  available_energy: number
  total_bandwidth: number
  available_bandwidth: number
  cost_per_energy: number
  status: 'active' | 'inactive' | 'maintenance'
  last_updated_at: string
  created_at: string
  updated_at: string
  account_type: 'own_energy' | 'agent_energy' | 'third_party'
  priority: number
  description?: string
  contact_info?: any
  daily_limit?: number
  monthly_limit?: number
  associated_networks?: Array<{ id: string; name: string }>
  network_config?: {
    id: string
    name: string
    type: string
    rpc_url: string
    chain_id?: string
  }
}

interface EnergyPoolStatistics {
  totalAccounts: number
  activeAccounts: number
  totalEnergy: number
  availableEnergy: number
  totalBandwidth: number
  availableBandwidth: number
  averageCost: number
  utilizationRate: number
  bandwidthUtilizationRate: number
}

export function useEnergyPool() {
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

  const accounts = ref<EnergyPoolAccount[]>([])
  
  const loading = reactive({
    statistics: false,
    accounts: false,
    refresh: false,
    batch: false
  })



  // 加载统计信息
  const loadStatistics = async (networkId?: string) => {
    loading.statistics = true
    try {
      console.log('📊 [useEnergyPool] 加载统计信息:', { networkId });
      const response = await energyPoolExtendedAPI.getStatistics(networkId)
      if (response.data.success && response.data.data) {
        Object.assign(statistics, response.data.data)
        console.log('✅ [useEnergyPool] 统计信息加载完成:', statistics);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error)
      toast.error('加载统计信息失败')
    } finally {
      loading.statistics = false
    }
  }

  // 加载账户列表（支持指定网络）
  const loadAccounts = async (networkId?: string) => {
    loading.accounts = true
    try {
      console.log('🔍 [useEnergyPool] 加载账户列表, 网络ID:', networkId);
      const response = await energyPoolExtendedAPI.getAccounts(networkId)
      if (response.data.success && response.data.data) {
        // 转换API数据以匹配EnergyPoolAccount类型
        accounts.value = response.data.data.map((account: any) => {
          return {
            ...account,
            account_type: account.account_type || 'own_energy',
            priority: account.priority || 50
          }
        })
        console.log(`✅ [useEnergyPool] 加载了 ${accounts.value.length} 个账户${networkId ? `（网络ID: ${networkId}）` : ''}`);
        
        // 如果有网络ID，为每个账户获取实时能量数据
        if (networkId) {
          await loadRealTimeEnergyData(networkId)
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
      toast.error('加载账户列表失败')
    } finally {
      loading.accounts = false
    }
  }

  // 加载实时能量数据
  const loadRealTimeEnergyData = async (networkId: string) => {
    try {
      console.log('🔍 [useEnergyPool] 开始加载实时能量数据, 网络ID:', networkId);
      
      // 并行获取所有账户的实时能量数据
      const energyDataPromises = accounts.value.map(async (account, index) => {
        try {
          const response = await energyPoolExtendedAPI.getAccountEnergyData(account.id, networkId)
          if (response.data.success && response.data.data) {
            const energyData = response.data.data
            // 使用响应式更新方式更新账户的实时能量数据
            accounts.value[index] = {
              ...accounts.value[index],
              total_energy: energyData.energy.total,
              available_energy: energyData.energy.available,
              total_bandwidth: energyData.bandwidth.total,
              available_bandwidth: energyData.bandwidth.available,
              last_updated_at: energyData.lastUpdated
            }
            
            console.log(`✅ [useEnergyPool] 账户 ${account.name} 实时数据更新:`, {
              total_energy: energyData.energy.total,
              available_energy: energyData.energy.available
            })
          }
        } catch (error) {
          console.warn(`⚠️ [useEnergyPool] 获取账户 ${account.name} 实时数据失败:`, error)
        }
      })
      
      await Promise.all(energyDataPromises)
      console.log('✅ [useEnergyPool] 实时能量数据加载完成')
    } catch (error) {
      console.error('Failed to load real-time energy data:', error)
      toast.error('获取实时能量数据失败')
    }
  }

  // 防抖相关状态
  const refreshDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const isRefreshing = ref(false)

  // 刷新能量池状态（带防抖）
  const refreshStatus = async () => {
    // 防抖检查：如果已经在刷新中或防抖定时器存在，直接返回
    if (isRefreshing.value || refreshDebounceTimer.value) {
      console.log('🚫 [useEnergyPool] 防抖拦截：刷新状态正在进行中')
      toast.info('刷新操作进行中，请稍候...')
      return
    }

    // 设置防抖状态
    isRefreshing.value = true
    loading.refresh = true

    // 设置防抖定时器（1000ms内不允许重复刷新）
    refreshDebounceTimer.value = setTimeout(async () => {
      try {
        console.log('✅ [useEnergyPool] 执行状态刷新操作')
        const response = await energyPoolExtendedAPI.refreshStatus()
        if (response.data.success) {
          toast.success('状态刷新成功')
          // 重新加载数据
          await Promise.all([
            loadStatistics(),
            loadAccounts()
          ])
        }
      } catch (error) {
        console.error('Failed to refresh status:', error)
        toast.error('刷新状态失败')
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
      toast.error('优化能量分配失败')
      throw error
    }
  }

  // 添加账户
  const addAccount = async (accountData: {
    name: string
    tron_address: string
    private_key_encrypted: string
    total_energy: number
    account_type?: string
    priority?: number
    description?: string
    daily_limit?: number
    monthly_limit?: number
    status?: string
  }) => {
    try {
      // 添加缺失的字段，使其符合EnergyPoolAccount类型
      const completeAccountData = {
        ...accountData,
        status: accountData.status || 'active',
        available_energy: accountData.total_energy,
        reserved_energy: 0
      };
      const response = await energyPoolExtendedAPI.addAccount(completeAccountData)
      if (response.data.success) {
        toast.success('账户添加成功')
        return response.data.data
      }
      throw new Error('添加账户失败')
    } catch (error) {
      console.error('Failed to add account:', error)
      toast.error('添加账户失败')
      throw error
    }
  }

  // 更新账户
  const updateAccount = async (id: string, updates: Partial<{
    name: string
    tron_address: string
    private_key_encrypted: string
    status: 'active' | 'inactive' | 'maintenance'
    account_type: 'own_energy' | 'agent_energy' | 'third_party'
    priority: number
    description: string
    contact_info: any
    daily_limit: number
    monthly_limit: number
  }>) => {
    try {
      const response = await energyPoolExtendedAPI.updateAccount(id, updates)
      if (response.data.success) {
        toast.success('账户更新成功')
        return true
      }
      throw new Error('更新账户失败')
    } catch (error) {
      console.error('Failed to update account:', error)
      toast.error('更新账户失败')
      throw error
    }
  }

  // 启用账户
  const enableAccount = async (id: string) => {
    try {
      const response = await energyPoolExtendedAPI.enableAccount(id)
      if (response.data.success) {
        toast.success('账户已启用')
        // 重新加载账户列表和统计信息
        await Promise.all([
          loadAccounts(),
          loadStatistics()
        ])
        return true
      }
      throw new Error('启用账户失败')
    } catch (error) {
      console.error('Failed to enable account:', error)
      toast.error('启用账户失败')
      throw error
    }
  }

  // 停用账户
  const disableAccount = async (id: string) => {
    try {
      const response = await energyPoolExtendedAPI.disableAccount(id)
      if (response.data.success) {
        toast.success('账户已停用')
        // 重新加载账户列表和统计信息
        await Promise.all([
          loadAccounts(),
          loadStatistics()
        ])
        return true
      }
      throw new Error('停用账户失败')
    } catch (error) {
      console.error('Failed to disable account:', error)
      toast.error('停用账户失败')
      throw error
    }
  }

  // 删除账户
  const deleteAccount = async (id: string) => {
    try {
      const response = await energyPoolExtendedAPI.deleteAccount(id)
      if (response.data.success) {
        toast.success('账户已删除')
        return true
      }
      throw new Error('删除账户失败')
    } catch (error) {
      console.error('Failed to delete account:', error)
      toast.error('删除账户失败')
      throw error
    }
  }

  // 获取今日统计（基于订单记录）
  const todayConsumption = ref<any>(null)
  const loadTodayConsumption = async () => {
    loading.statistics = true
    try {
      console.log('📈 [useEnergyPool] 加载今日订单统计');
      
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
          console.log('✅ [useEnergyPool] 今日订单统计加载完成:', todayConsumption.value);
          return;
        }
      } catch (orderError) {
        console.warn('📊 [useEnergyPool] 订单统计接口暂不可用:', orderError);
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
      console.log('📊 [useEnergyPool] 使用默认统计数据');
      
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

  // 获取状态样式类
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取状态文本
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'active':
        return '已启用'
      case 'inactive':
        return '已停用'
      case 'maintenance':
        return '维护中'
      default:
        return '未知'
    }
  }

  // 获取账户类型文本
  const getAccountTypeText = (type: string): string => {
    switch (type) {
      case 'own_energy':
        return '自有能量源'
      case 'agent_energy':
        return '代理商能量源'
      case 'third_party':
        return '第三方供应商'
      default:
        return '未知类型'
    }
  }

  // 获取账户类型样式类
  const getAccountTypeClass = (type: string): string => {
    switch (type) {
      case 'own_energy':
        return 'bg-blue-100 text-blue-800'
      case 'agent_energy':
        return 'bg-purple-100 text-purple-800'
      case 'third_party':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取启用状态样式类
  const getEnabledClass = (isEnabled: boolean): string => {
    return isEnabled 
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }

  // 获取启用状态文本
  const getEnabledText = (isEnabled: boolean): string => {
    return isEnabled ? '已启用' : '已停用'
  }

  // 加载可用网络列表
  const loadNetworks = async () => {
    try {
      console.log('🌐 [useEnergyPool] 加载网络列表');
      const response = await energyPoolExtendedAPI.getNetworks()
      if (response.data.success && response.data.data) {
        const networks = response.data.data.map((network: any) => ({
          id: network.id,
          name: network.name,
          type: network.type,
          rpc_url: network.rpc_url,
          is_active: network.is_active,
          health_status: network.health_status
        }));
        console.log(`🌐 [useEnergyPool] 加载了 ${networks.length} 个网络`);
        return networks;
      }
      return [];
    } catch (error) {
      console.error('Failed to load networks:', error)
      toast.error('加载网络列表失败')
      return [];
    }
  }

  return {
    statistics,
    accounts,
    loading,
    todayConsumption,
    loadStatistics,
    loadAccounts,
    loadRealTimeEnergyData,
    loadNetworks,
    loadTodayConsumption,
    refreshStatus,
    optimizeAllocation,
    addAccount,
    updateAccount,
    enableAccount,
    disableAccount,
    deleteAccount,
    formatEnergy,
    formatAddress,
    formatDate,
    getStatusClass,
    getStatusText,
    getAccountTypeText,
    getAccountTypeClass,
    getEnabledClass,
    getEnabledText
  }
}

export type { EnergyPoolAccount, EnergyPoolStatistics }
