import { useToast } from '@/composables/useToast'
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { computed, ref } from 'vue'
import type {
    AccountFormData,
    AccountUpdateData,
    EnergyPoolAccount,
    FilterState
} from '../types/energy-pool.types'

export function useAccountManagement() {
  const toast = useToast()
  
  // 状态管理
  const accounts = ref<EnergyPoolAccount[]>([])
  const selectedAccounts = ref<string[]>([])
  const selectedAccount = ref<EnergyPoolAccount | null>(null)
  
  // 筛选状态
  const filterState = ref<FilterState>({
    searchQuery: '',
    statusFilter: ''
  })
  
  // 加载状态
  const loading = ref({
    accounts: false,
    operations: false,
    batch: false
  })

  // 计算属性
  const filteredAccounts = computed(() => {
    let filtered = accounts.value

    // 搜索过滤
    if (filterState.value.searchQuery) {
      const query = filterState.value.searchQuery.toLowerCase()
      filtered = filtered.filter(account => 
        account.name.toLowerCase().includes(query) ||
        account.tron_address.toLowerCase().includes(query)
      )
    }

    // 状态过滤
    if (filterState.value.statusFilter) {
      filtered = filtered.filter(account => account.status === filterState.value.statusFilter)
    }

    return filtered
  })

  const isAllSelected = computed(() => {
    return filteredAccounts.value.length > 0 && 
      filteredAccounts.value.every(account => selectedAccounts.value.includes(account.id))
  })

  // 账户加载
  const loadAccounts = async (networkId?: string) => {
    loading.value.accounts = true
    try {
      console.log('🔍 [useAccountManagement] 加载账户列表, 网络ID:', networkId)
      const response = await energyPoolExtendedAPI.getAccounts(networkId)
      if (response.data.success && response.data.data) {
        accounts.value = response.data.data.map((account: any) => ({
          ...account,
          account_type: account.account_type || 'own_energy',
          priority: account.priority || 50
        }))
        console.log(`✅ [useAccountManagement] 加载了 ${accounts.value.length} 个账户${networkId ? `（网络ID: ${networkId}）` : ''}`)
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
      toast.error('加载账户列表失败')
    } finally {
      loading.value.accounts = false
    }
  }

  // 添加账户
  const addAccount = async (accountData: AccountFormData) => {
    loading.value.operations = true
    try {
      const completeAccountData = {
        ...accountData,
        status: accountData.status || 'active',
        available_energy: accountData.total_energy,
        reserved_energy: 0
      }
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
    } finally {
      loading.value.operations = false
    }
  }

  // 更新账户
  const updateAccount = async (id: string, updates: AccountUpdateData) => {
    loading.value.operations = true
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
    } finally {
      loading.value.operations = false
    }
  }

  // 删除账户
  const deleteAccount = async (id: string) => {
    loading.value.operations = true
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
    } finally {
      loading.value.operations = false
    }
  }

  // 启用账户
  const enableAccount = async (id: string, networkId?: string) => {
    loading.value.operations = true
    try {
      const response = await energyPoolExtendedAPI.enableAccount(id)
      if (response.data.success) {
        toast.success('账户已启用')
        await loadAccounts(networkId)
        return true
      }
      throw new Error('启用账户失败')
    } catch (error) {
      console.error('Failed to enable account:', error)
      toast.error('启用账户失败')
      throw error
    } finally {
      loading.value.operations = false
    }
  }

  // 停用账户
  const disableAccount = async (id: string, networkId?: string) => {
    loading.value.operations = true
    try {
      const response = await energyPoolExtendedAPI.disableAccount(id)
      if (response.data.success) {
        toast.success('账户已停用')
        await loadAccounts(networkId)
        return true
      }
      throw new Error('停用账户失败')
    } catch (error) {
      console.error('Failed to disable account:', error)
      toast.error('停用账户失败')
      throw error
    } finally {
      loading.value.operations = false
    }
  }

  // 批量启用账户
  const batchEnableAccounts = async (accountIds: string[], networkId?: string) => {
    loading.value.batch = true
    try {
      for (const accountId of accountIds) {
        await enableAccount(accountId, networkId)
      }
      selectedAccounts.value = []
      toast.success(`成功启用 ${accountIds.length} 个账户`)
    } catch (error) {
      console.error('Failed to batch enable accounts:', error)
      toast.error('批量启用失败')
    } finally {
      loading.value.batch = false
    }
  }

  // 批量停用账户
  const batchDisableAccounts = async (accountIds: string[], networkId?: string) => {
    loading.value.batch = true
    try {
      for (const accountId of accountIds) {
        await disableAccount(accountId, networkId)
      }
      selectedAccounts.value = []
      toast.success(`成功停用 ${accountIds.length} 个账户`)
    } catch (error) {
      console.error('Failed to batch disable accounts:', error)
      toast.error('批量停用失败')
    } finally {
      loading.value.batch = false
    }
  }

  // 选择管理
  const toggleSelectAll = () => {
    if (isAllSelected.value) {
      selectedAccounts.value = []
    } else {
      selectedAccounts.value = filteredAccounts.value.map(account => account.id)
    }
  }

  const toggleAccountSelection = (accountId: string) => {
    const index = selectedAccounts.value.indexOf(accountId)
    if (index > -1) {
      selectedAccounts.value.splice(index, 1)
    } else {
      selectedAccounts.value.push(accountId)
    }
  }

  // 筛选管理
  const resetFilters = () => {
    filterState.value.searchQuery = ''
    filterState.value.statusFilter = ''
  }

  const setSearchQuery = (query: string) => {
    filterState.value.searchQuery = query
  }

  const setStatusFilter = (status: string) => {
    filterState.value.statusFilter = status
  }

  // 格式化工具函数
  const formatEnergy = (energy: number): string => {
    if (energy >= 1000000) {
      return `${(energy / 1000000).toFixed(1)}M`
    } else if (energy >= 1000) {
      return `${(energy / 1000).toFixed(1)}K`
    }
    return energy.toString()
  }

  const formatAddress = (address: string): string => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

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

  // 状态样式工具函数
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

  return {
    // 状态
    accounts,
    selectedAccounts,
    selectedAccount,
    filterState,
    loading,
    
    // 计算属性
    filteredAccounts,
    isAllSelected,
    
    // 账户操作
    loadAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    enableAccount,
    disableAccount,
    batchEnableAccounts,
    batchDisableAccounts,
    
    // 选择管理
    toggleSelectAll,
    toggleAccountSelection,
    
    // 筛选管理
    resetFilters,
    setSearchQuery,
    setStatusFilter,
    
    // 格式化工具
    formatEnergy,
    formatAddress,
    formatDate,
    getStatusClass,
    getStatusText,
    getAccountTypeText,
    getAccountTypeClass
  }
}
