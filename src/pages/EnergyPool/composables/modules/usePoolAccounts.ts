/**
 * 能源池账户管理模块
 * 负责账户的CRUD操作和状态管理
 */

import { useToast } from '@/composables/useToast'
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { reactive, ref } from 'vue'
import type { AccountAddData, AccountUpdateData, EnergyPoolAccount, LoadingStates } from '../types/energy-pool.types'

export function usePoolAccounts() {
  const toast = useToast()
  
  const accounts = ref<EnergyPoolAccount[]>([])
  const loading = reactive<LoadingStates>({
    statistics: false,
    accounts: false,
    refresh: false,
    batch: false
  })

  // 加载账户列表（支持指定网络）
  const loadAccounts = async (networkId?: string) => {
    loading.accounts = true
    try {
      console.log('🔍 [usePoolAccounts] 加载账户列表, 网络ID:', networkId)
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
        console.log(`✅ [usePoolAccounts] 加载了 ${accounts.value.length} 个账户${networkId ? `（网络ID: ${networkId}）` : ''}`)
        
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
      console.log('🔍 [usePoolAccounts] 开始加载实时能量数据, 网络ID:', networkId)
      
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
            
            console.log(`✅ [usePoolAccounts] 账户 ${account.name} 实时数据更新:`, {
              total_energy: energyData.energy.total,
              available_energy: energyData.energy.available
            })
          }
        } catch (error) {
          console.warn(`⚠️ [usePoolAccounts] 获取账户 ${account.name} 实时数据失败:`, error)
        }
      })
      
      await Promise.all(energyDataPromises)
      console.log('✅ [usePoolAccounts] 实时能量数据加载完成')
    } catch (error) {
      console.error('Failed to load real-time energy data:', error)
      toast.error('获取实时能量数据失败')
    }
  }

  // 添加账户
  const addAccount = async (accountData: AccountAddData) => {
    try {
      // 添加缺失的字段，使其符合EnergyPoolAccount类型
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
    }
  }

  // 更新账户
  const updateAccount = async (id: string, updates: AccountUpdateData) => {
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
        // 重新加载账户列表
        await loadAccounts()
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
        // 重新加载账户列表
        await loadAccounts()
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
    accounts,
    loading,
    loadAccounts,
    loadRealTimeEnergyData,
    addAccount,
    updateAccount,
    enableAccount,
    disableAccount,
    deleteAccount,
    getStatusClass,
    getStatusText,
    getAccountTypeText,
    getAccountTypeClass,
    getEnabledClass,
    getEnabledText
  }
}
