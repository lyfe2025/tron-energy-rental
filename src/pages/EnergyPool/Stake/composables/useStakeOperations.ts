/**
 * 质押操作逻辑composable
 * 从 Stake.vue 中安全分离的操作逻辑和事件处理
 */

import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI'
// 使用网络store的实际类型
import type { Network } from '@/stores/network'
import type { useStakeData } from './useStakeData'
type NetworkStoreNetwork = Network

type StakeDataState = ReturnType<typeof useStakeData>

interface StakeOperationsState {
  // 账户操作
  onAccountSelect: (account: EnergyPoolAccount) => Promise<void>
  switchAccount: () => void
  
  // 网络操作
  switchNetwork: (networkId: string) => Promise<void>
  getNetworkIcon: (networkId: string) => string
  getNetworkIconClass: (networkId: string) => string
  getNetworkStatusClass: (status: string) => string
  getNetworkStatusText: (status: string) => string
  
  // 数据刷新
  refreshData: () => Promise<void>
  
  // 质押操作
  handleWithdraw: () => Promise<void>
  onOperationSuccess: () => Promise<void>
}

export function useStakeOperations(stakeData: StakeDataState): StakeOperationsState {
  // 账户选择处理
  const onAccountSelect = async (account: EnergyPoolAccount) => {
    stakeData.selectedAccount.value = account
    stakeData.selectedAccountId.value = account.id
    
    // 刷新数据
    await refreshData()
  }

  // 切换账户
  const switchAccount = () => {
    stakeData.selectedAccount.value = null
    stakeData.selectedAccountId.value = null
  }

  // 刷新数据
  const refreshData = async () => {
    if (!stakeData.selectedAccount.value || !stakeData.selectedAccountId.value) return
    
    try {
      stakeData.isRefreshing.value = true
      
      // 获取质押概览数据
      if (stakeData.stakeComposable.loadOverview) {
        await stakeData.stakeComposable.loadOverview(stakeData.selectedAccountId.value)
      }
      
      // 获取质押统计数据（如果需要）
      if (stakeData.stakeComposable.loadStatistics) {
        await stakeData.stakeComposable.loadStatistics(stakeData.selectedAccountId.value)
      }
      
    } catch (error) {
      console.error('刷新数据失败:', error)
    } finally {
      stakeData.isRefreshing.value = false
    }
  }

  // 网络相关方法
  const getNetworkIcon = (networkId: string) => {
    const iconMap: Record<string, string> = {
      'mainnet': 'M',
      'shasta': 'S',
      'nile': 'N'
    }
    return iconMap[networkId] || 'T'
  }

  const getNetworkIconClass = (networkId: string) => {
    const classMap: Record<string, string> = {
      'mainnet': 'bg-green-500',
      'shasta': 'bg-blue-500', 
      'nile': 'bg-purple-500'
    }
    return classMap[networkId] || 'bg-gray-500'
  }

  const getNetworkStatusClass = (status: string) => {
    const classMap: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'maintenance': 'bg-yellow-100 text-yellow-800'
    }
    return classMap[status] || 'bg-gray-100 text-gray-800'
  }

  const getNetworkStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      'active': '正常',
      'inactive': '停用',
      'maintenance': '维护中'
    }
    return textMap[status] || '未知'
  }

  const switchNetwork = async (networkId: string) => {
    stakeData.showNetworkSwitcher.value = false
    
    // 设置当前网络到store
    stakeData.networkStore.setCurrentNetwork(networkId)
    
    // 导航到新的网络路由
    await stakeData.router.push(`/energy-pool/${networkId}/stake`)
    
    // 重置账户选择
    stakeData.selectedAccount.value = null
    stakeData.selectedAccountId.value = null
  }

  const handleWithdraw = async () => {
    if (!stakeData.currentNetworkId.value) return
    
    try {
      // 这里实现具体的提取逻辑
      console.log('处理提取操作，网络ID:', stakeData.currentNetworkId.value)
      // const result = await withdrawUnfrozen(selectedAccountId.value)
      // if (result) {
      //   await onOperationSuccess()
      // }
    } catch (error) {
      console.error('提取失败:', error)
    }
  }

  const onOperationSuccess = async () => {
    // 关闭所有模态框
    stakeData.showStakeModal.value = false
    stakeData.showUnstakeModal.value = false
    stakeData.showDelegateModal.value = false
    
    // 刷新数据
    await refreshData()
  }

  return {
    // 账户操作
    onAccountSelect,
    switchAccount,
    
    // 网络操作
    switchNetwork,
    getNetworkIcon,
    getNetworkIconClass,
    getNetworkStatusClass,
    getNetworkStatusText,
    
    // 数据刷新
    refreshData,
    
    // 质押操作
    handleWithdraw,
    onOperationSuccess
  }
}
