/**
 * 能源池主composable（分离重构版）
 * 整合所有模块，提供统一的API接口
 */

import { usePoolAccounts } from './modules/usePoolAccounts'
import { usePoolOperations } from './modules/usePoolOperations'
import { usePoolStats } from './modules/usePoolStats'
import { usePoolValidation } from './modules/usePoolValidation'

export function useEnergyPool() {
  // 导入各个模块
  const accountsModule = usePoolAccounts()
  const statsModule = usePoolStats()
  const operationsModule = usePoolOperations()
  const validationModule = usePoolValidation()

  // 重新加载数据的便捷方法
  const reloadData = async (networkId?: string) => {
    await Promise.all([
      statsModule.loadStatistics(networkId),
      accountsModule.loadAccounts(networkId)
    ])
  }

  // 启用/停用账户后的数据刷新
  const refreshAfterAccountAction = async (networkId?: string) => {
    await Promise.all([
      accountsModule.loadAccounts(networkId),
      statsModule.loadStatistics(networkId)
    ])
  }

  // 导出所有功能
  return {
    // 统计数据相关
    statistics: statsModule.statistics,
    todayConsumption: statsModule.todayConsumption,
    loadStatistics: statsModule.loadStatistics,
    loadTodayConsumption: statsModule.loadTodayConsumption,
    
    // 账户管理相关
    accounts: accountsModule.accounts,
    loadAccounts: accountsModule.loadAccounts,
    loadRealTimeEnergyData: accountsModule.loadRealTimeEnergyData,
    addAccount: accountsModule.addAccount,
    updateAccount: accountsModule.updateAccount,
    enableAccount: async (id: string, networkId?: string) => {
      const result = await accountsModule.enableAccount(id)
      if (result) {
        await refreshAfterAccountAction(networkId)
      }
      return result
    },
    disableAccount: async (id: string, networkId?: string) => {
      const result = await accountsModule.disableAccount(id)
      if (result) {
        await refreshAfterAccountAction(networkId)
      }
      return result
    },
    deleteAccount: accountsModule.deleteAccount,
    
    // 操作相关
    refreshStatus: async (networkId?: string) => {
      try {
        await operationsModule.refreshStatus()
        await reloadData(networkId)
      } catch (error) {
        // 错误已在模块内部处理
        throw error
      }
    },
    optimizeAllocation: operationsModule.optimizeAllocation,
    loadNetworks: operationsModule.loadNetworks,
    
    // 加载状态
    loading: accountsModule.loading, // 使用账户模块的loading状态，与原版兼容
    
    // 格式化工具
    formatEnergy: statsModule.formatEnergy,
    formatAddress: statsModule.formatAddress,
    formatDate: statsModule.formatDate,
    
    // 样式工具
    getStatusClass: accountsModule.getStatusClass,
    getStatusText: accountsModule.getStatusText,
    getAccountTypeText: accountsModule.getAccountTypeText,
    getAccountTypeClass: accountsModule.getAccountTypeClass,
    getEnabledClass: accountsModule.getEnabledClass,
    getEnabledText: accountsModule.getEnabledText,
    
    // 验证工具
    validateTronAddress: validationModule.validateTronAddress,
    validatePrivateKey: validationModule.validatePrivateKey,
    validateAccountName: validationModule.validateAccountName,
    validateEnergyAmount: validationModule.validateEnergyAmount,
    validatePriority: validationModule.validatePriority,
    validateAccountAddData: validationModule.validateAccountAddData,
    validateAccountUpdateData: validationModule.validateAccountUpdateData,
    isAccountAvailable: validationModule.isAccountAvailable,
    needsMaintenance: validationModule.needsMaintenance,
    calculateUtilization: validationModule.calculateUtilization,

    // 便捷方法
    reloadData
  }
}

// 导出类型定义
export type {
  AccountAddData,
  AccountUpdateData, EnergyPoolAccount,
  EnergyPoolStatistics, NetworkInfo, TodayConsumption
} from './types/energy-pool.types'

