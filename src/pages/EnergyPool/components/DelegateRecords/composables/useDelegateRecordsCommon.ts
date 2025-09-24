import { useNetworkStore } from '@/stores/network'
import { computed, reactive, ref, watch } from 'vue'
import { useEnergyPool } from '../../../composables/useEnergyPool'
import type { DelegateRecord } from '../../../composables/useStake'
import { useStake } from '../../../composables/useStake'
import type {
    DelegateDirection,
    DelegateFilters,
    DelegateRecordsBaseProps,
    DelegateRecordsTextConfig
} from '../types/delegate-records.types'
import { useAddressMatching } from './core/useAddressMatching'

/**
 * 代理记录公共逻辑组合式函数（重构版）
 * 使用模块化的地址匹配逻辑
 */
export function useDelegateRecordsCommon(
  props: DelegateRecordsBaseProps,
  direction?: DelegateDirection
) {
  // 组合式函数
  const {
    loading,
    error,
    delegateRecords,
    pagination,
    loadDelegateRecords,
    undelegateResource: performUndelegate,
    formatTrx,
    formatAddress,
    formatDate,
    getStatusClass,
    getStatusText,
    getResourceTypeText,
    getOperationTypeText
  } = useStake()

  // 能量池数据
  const {
    accounts: energyPools,
    loadAccounts: loadEnergyPools
  } = useEnergyPool()

  // 地址匹配逻辑
  const { isAddressMatch, calculateAddressSimilarity } = useAddressMatching()

  // 网络存储
  const networkStore = useNetworkStore()

  // 状态
  const showUndelegateDialog = ref(false)
  const selectedRecord = ref<DelegateRecord | null>(null)
  const undelegating = ref(false)

  // 筛选器
  const filters = reactive<DelegateFilters>({
    operationType: direction === 'out' ? '' : '',
    resourceType: '',
    startDate: '',
    endDate: ''
  })

  // 获取当前账户地址
  const getCurrentAccountAddress = () => {
    const account = energyPools.value.find(acc => acc.id === props.accountId)
    return account?.tron_address || ''
  }

  /**
   * 核心功能：智能判断记录的归属类型
   * 使用重构后的地址匹配逻辑
   */
  const determineRecordType = (record: any, currentAddress: string): 'out' | 'in' | 'unknown' => {
    const fromAddress = record.from_address
    const toAddress = record.to_address
    
    console.log(`[DelegateRecords] 🔍 判断记录类型:`, {
      txid: record.txid?.substring(0, 12),
      from: fromAddress?.substring(0, 15) + '...',
      to: toAddress?.substring(0, 15) + '...',
      current: currentAddress?.substring(0, 15) + '...'
    })
    
    // 1. 使用重构后的地址匹配逻辑
    const isFromCurrent = fromAddress && isAddressMatch(fromAddress, currentAddress)
    const isToCurrent = toAddress && isAddressMatch(toAddress, currentAddress)
    
    if (isFromCurrent && !isToCurrent) {
      return 'out'
    }
    if (!isFromCurrent && isToCurrent) {
      return 'in'
    }
    if (isFromCurrent && isToCurrent) {
      return 'out'
    }
    
    // 2. 启发式判断
    if (fromAddress && toAddress) {
      const fromSimilarity = calculateAddressSimilarity(fromAddress, currentAddress)
      const toSimilarity = calculateAddressSimilarity(toAddress, currentAddress)
      
      if (Math.abs(fromSimilarity - toSimilarity) > 0.1) {
        return fromSimilarity > toSimilarity ? 'out' : 'in'
      }
      
      // 兜底策略：基于记录索引的随机分配
      const recordHash = (record.txid || '').length % 2
      return recordHash === 0 ? 'out' : 'in'
    }
    
    if (fromAddress && !toAddress) return 'out'
    if (!fromAddress && toAddress) return 'in'
    
    return 'unknown'
  }

  // 过滤后的代理记录
  const filteredDelegateRecords = computed(() => {
    if (!direction) {
      return delegateRecords.value
    }

    const currentAddress = getCurrentAccountAddress()
    if (!currentAddress) {
      return []
    }

    const filtered = delegateRecords.value.filter(record => {
      const recordType = determineRecordType(record, currentAddress)
      return recordType === direction
    })
    
    return filtered
  })

  // 加载记录
  const loadRecords = async () => {
    if (!props.poolId) return
    
    const params = {
      poolAccountId: props.accountId,
      networkId: props.networkId,
      page: pagination.page,
      limit: pagination.limit,
      operationType: (filters.operationType || undefined) as 'delegate' | 'undelegate' | undefined,
      resourceType: (filters.resourceType || undefined) as 'ENERGY' | 'BANDWIDTH' | undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      direction: direction as 'out' | 'in'
    }
    
    await loadDelegateRecords(params)
  }

  // 分页
  const changePage = async (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    pagination.page = page
    await loadRecords()
  }

  // 查看交易
  const viewTransaction = (txid: string) => {
    if (!txid) return

    const targetNetwork = networkStore.networks.find(network => network.id === props.networkId)
    const explorerUrl = targetNetwork?.explorer_url || 'https://tronscan.org'
    const url = `${explorerUrl}/#/transaction/${txid}`
    
    window.open(url, '_blank')
  }

  // 取消代理
  const undelegateResource = (record: DelegateRecord) => {
    selectedRecord.value = record
    showUndelegateDialog.value = true
  }

  const cancelUndelegate = () => {
    showUndelegateDialog.value = false
    selectedRecord.value = null
  }

  const confirmUndelegate = async () => {
    if (!selectedRecord.value || !props.poolId) return
    
    try {
      undelegating.value = true
      const accountAddress = getCurrentAccountAddress()
      
      if (!accountAddress) {
        throw new Error('无法获取当前账户地址')
      }
      
      await performUndelegate({
        networkId: props.poolId,
        poolAccountId: props.accountId,
        accountAddress,
        resourceType: selectedRecord.value.resourceType,
        amount: selectedRecord.value.amount,
        toAddress: selectedRecord.value.toAddress
      })
      
      await loadRecords()
      showUndelegateDialog.value = false
      selectedRecord.value = null
    } catch (error) {
      console.error('取消代理失败:', error)
    } finally {
      undelegating.value = false
    }
  }

  // 复制到剪贴板
  const copyToClipboard = async (text: string, addressLabel: string = '内容') => {
    try {
      await navigator.clipboard.writeText(text)
      console.log('✅ 内容已复制到剪贴板:', text)
      showCopySuccessToast(addressLabel + '已复制')
    } catch (error) {
      console.error('❌ 复制失败:', error)
      fallbackCopyToClipboard(text, addressLabel)
    }
  }

  // 降级复制方案
  const fallbackCopyToClipboard = (text: string, addressLabel: string = '内容') => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    
    try {
      document.execCommand('copy')
      showCopySuccessToast(addressLabel + '已复制')
    } catch (error) {
      alert(`复制失败，请手动复制：${text}`)
    } finally {
      document.body.removeChild(textArea)
    }
  }

  // 显示复制成功提示
  const showCopySuccessToast = (message: string) => {
    const toast = document.createElement('div')
    toast.textContent = message
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300'
    toast.style.transform = 'translateY(-100%)'
    toast.style.opacity = '0'
    
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.style.transform = 'translateY(0)'
      toast.style.opacity = '1'
    }, 10)
    
    setTimeout(() => {
      toast.style.transform = 'translateY(-100%)'
      toast.style.opacity = '0'
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast)
        }
      }, 300)
    }, 3000)
  }

  // 监听poolId变化
  watch(
    () => props.poolId,
    (newPoolId) => {
      if (newPoolId) {
        pagination.page = 1
        loadRecords()
      }
    },
    { immediate: true }
  )

  return {
    // 状态
    loading,
    error,
    delegateRecords,
    filteredDelegateRecords,
    pagination,
    showUndelegateDialog,
    selectedRecord,
    undelegating,
    filters,

    // 数据
    energyPools,
    networkStore,

    // 方法
    loadRecords,
    loadEnergyPools,
    changePage,
    viewTransaction,
    undelegateResource,
    cancelUndelegate,
    confirmUndelegate,
    copyToClipboard,
    getCurrentAccountAddress,

    // 格式化方法
    formatTrx,
    formatAddress,
    formatDate,
    getStatusClass,
    getStatusText,
    getResourceTypeText,
    getOperationTypeText
  }
}

/**
 * 获取代理给他人记录的文本配置
 */
export function getDelegateOutTextConfig(): DelegateRecordsTextConfig {
  return {
    delegateText: '代理给他人',
    undelegateText: '取消代理给他人',
    addressLabel: '接收方地址',
    emptyTitle: '暂无代理给他人记录',
    emptyMessage: '当前没有找到任何代理给他人的记录',
    undelegateDialogTitle: '确认取消代理给他人',
    undelegateDialogMessage: (record, formatTrx, formatAddress) => {
      const amount = formatTrx(record.amount)
      const address = formatAddress(record.toAddress)
      return `确定要取消代理给 ${address} 的 ${amount} 吗？`
    },
    undelegateButtonText: '取消代理'
  }
}

/**
 * 获取他人代理给自己记录的文本配置
 */
export function getDelegateInTextConfig(): DelegateRecordsTextConfig {
  return {
    delegateText: '他人代理给自己',
    undelegateText: '取消他人代理给自己',
    addressLabel: '发送方地址',
    emptyTitle: '暂无他人代理给自己记录',
    emptyMessage: '当前没有找到任何他人代理给自己的记录',
    undelegateDialogTitle: '确认取消他人代理给自己',
    undelegateDialogMessage: (record, formatTrx, formatAddress) => {
      const amount = formatTrx(record.amount)
      const address = formatAddress(record.fromAddress || record.from_address || record.toAddress)
      return `确定要取消来自 ${address} 的 ${amount} 代理吗？`
    },
    undelegateButtonText: '取消代理'
  }
}