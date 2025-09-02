// 导入子模块
import { computed } from 'vue'
import { useDelegateOperations } from './useDelegateOperations'
import { useStakeData } from './useStakeData'
import { useStakeFormatters } from './useStakeFormatters'
import { useStakeOperations } from './useStakeOperations'

// 导出类型定义以保持向后兼容
export type {
    AccountInfo, AccountResources, DelegateParams, DelegateRecord, DelegateRecordQueryParams, FreezeParams, StakeOverview, StakePagination, StakeRecord, StakeRecordQueryParams, StakeStatistics, UndelegateParams, UnfreezeParams, UnfreezeRecord, UnfreezeRecordQueryParams
} from '../types/stake.types'

/**
 * 质押管理主 Composable
 * 整合了数据管理、质押操作、委托操作和格式化工具
 */
export function useStake() {
  // 获取各个子模块
  const {
    loading: dataLoading,
    error: dataError,
    overview,
    statistics,
    stakeRecords,
    delegateRecords,
    unfreezeRecords,
    accountResources,
    accountInfo,
    pagination,
    loadOverview,
    loadStatistics,
    loadStakeRecords,
    loadDelegateRecords,
    loadUnfreezeRecords,
    loadAccountResources,
    loadAccountInfo
  } = useStakeData()

  const {
    loading: stakeLoading,
    error: stakeError,
    freezeTrx,
    unfreezeTrx,
    withdrawUnfrozen
  } = useStakeOperations()

  const {
    loading: delegateLoading,
    error: delegateError,
    delegateResource,
    undelegateResource
  } = useDelegateOperations()

  const {
    formatTrx,
    formatEnergy,
    formatAddress,
    formatDate,
    getStatusClass,
    getStatusText,
    getResourceTypeText,
    getOperationTypeText
  } = useStakeFormatters()

  // 合并加载状态 - 任何一个模块在加载时都显示加载状态
  const loading = computed(() => dataLoading.value || stakeLoading.value || delegateLoading.value)
  
  // 合并错误状态 - 优先显示最新的错误
  const error = computed(() => stakeError.value || delegateError.value || dataError.value)

  return {
    // 响应式状态
    loading,
    error,
    overview,
    statistics,
    stakeRecords,
    delegateRecords,
    unfreezeRecords,
    accountResources,
    accountInfo,
    pagination,
    
    // 数据获取方法
    loadOverview,
    loadStatistics,
    loadStakeRecords,
    loadDelegateRecords,
    loadUnfreezeRecords,
    loadAccountResources,
    loadAccountInfo,
    
    // 质押操作方法
    freezeTrx,
    unfreezeTrx,
    withdrawUnfrozen,
    
    // 委托操作方法
    delegateResource,
    undelegateResource,
    
    // 格式化工具方法
    formatTrx,
    formatEnergy,
    formatAddress,
    formatDate,
    getStatusClass,
    getStatusText,
    getResourceTypeText,
    getOperationTypeText
  }
}