import { useToast } from '@/composables/useToast'
import { energyPoolAPI } from '@/services/api'
import { reactive, ref } from 'vue'

interface EnergyPoolAccount {
  id: string
  name: string
  tron_address: string
  private_key_encrypted: string
  total_energy: number
  available_energy: number
  reserved_energy: number
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
    chain_id: string
  }
}

interface EnergyPoolStatistics {
  totalAccounts: number
  activeAccounts: number
  totalEnergy: number
  availableEnergy: number
  reservedEnergy: number
  averageCost: number
}

export function useEnergyPool() {
  const toast = useToast()
  
  const statistics = reactive<EnergyPoolStatistics>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalEnergy: 0,
    availableEnergy: 0,
    reservedEnergy: 0,
    averageCost: 0
  })

  const accounts = ref<EnergyPoolAccount[]>([])
  
  const loading = reactive({
    statistics: false,
    accounts: false,
    refresh: false,
    sync: false,
    batch: false
  })



  // 加载统计信息
  const loadStatistics = async () => {
    loading.statistics = true
    try {
      const response = await energyPoolAPI.getStatistics()
      if (response.data.success && response.data.data) {
        Object.assign(statistics, response.data.data)
      }
    } catch (error) {
      console.error('Failed to load statistics:', error)
      toast.error('加载统计信息失败')
    } finally {
      loading.statistics = false
    }
  }

  // 加载账户列表
  const loadAccounts = async () => {
    loading.accounts = true
    try {
      const response = await energyPoolAPI.getAccounts()
      if (response.data.success && response.data.data) {
        // 转换API数据以匹配EnergyPoolAccount类型
        accounts.value = response.data.data.map((account: any) => {
          return {
            ...account,
            account_type: account.account_type || 'own_energy',
            priority: account.priority || 50
          }
        })
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
      toast.error('加载账户列表失败')
    } finally {
      loading.accounts = false
    }
  }

  // 刷新能量池状态
  const refreshStatus = async () => {
    loading.refresh = true
    try {
      const response = await energyPoolAPI.refreshStatus()
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
    }
  }









  // 优化能量分配
  const optimizeAllocation = async (requiredEnergy: number) => {
    try {
      const response = await energyPoolAPI.optimizeAllocation(requiredEnergy)
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
  }) => {
    try {
      // 添加缺失的字段，使其符合EnergyPoolAccount类型
      const completeAccountData = {
        ...accountData,
        status: 'active' as const,
        available_energy: accountData.total_energy,
        reserved_energy: 0
      };
      const response = await energyPoolAPI.addAccount(completeAccountData)
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
      const response = await energyPoolAPI.updateAccount(id, updates)
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
      const response = await energyPoolAPI.enableAccount(id)
      if (response.data.success) {
        toast.success('账户已启用')
        await loadAccounts() // 重新加载账户列表
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
      const response = await energyPoolAPI.disableAccount(id)
      if (response.data.success) {
        toast.success('账户已停用')
        await loadAccounts() // 重新加载账户列表
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
      const response = await energyPoolAPI.deleteAccount(id)
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

  // 获取今日消耗统计
  const todayConsumption = ref<any>(null)
  const loadTodayConsumption = async () => {
    loading.statistics = true
    try {
      const response = await energyPoolAPI.getTodayConsumption()
      if (response.data.success) {
        todayConsumption.value = response.data.data
      }
    } catch (error) {
      console.error('Failed to load today consumption:', error)
      toast.error('获取今日消耗统计失败')
    } finally {
      loading.statistics = false
    }
  }

  // 格式化能量数值
  const formatEnergy = (energy: number): string => {
    if (energy >= 1000000) {
      return `${(energy / 1000000).toFixed(1)}M`
    } else if (energy >= 1000) {
      return `${(energy / 1000).toFixed(1)}K`
    }
    return energy.toString()
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

  return {
    statistics,
    accounts,
    loading,
    todayConsumption,
    loadStatistics,
    loadAccounts,
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
