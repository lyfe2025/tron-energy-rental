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

/**
 * 代理记录公共逻辑组合式函数
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

  // 网络存储
  const networkStore = useNetworkStore()

  // 状态
  const showUndelegateDialog = ref(false)
  const selectedRecord = ref<DelegateRecord | null>(null)
  const undelegating = ref(false)

  // 筛选器
  const filters = reactive<DelegateFilters>({
    operationType: '',
    resourceType: '',
    startDate: '',
    endDate: ''
  })

  // 获取当前账户地址
  const getCurrentAccountAddress = () => {
    const account = energyPools.value.find(acc => acc.id === props.accountId)
    return account?.tron_address || ''
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

  return delegateRecords.value.filter(record => {
    if (direction === 'out') {
      // 代理出去：当前地址是发起方（from_address）
      // 检查 from_address 字段，如果不存在则回退到原逻辑
      if ((record as any).from_address) {
        return (record as any).from_address.toLowerCase() === currentAddress.toLowerCase()
      } else {
        // 回退逻辑：toAddress 不是当前地址（旧版本数据）
        return record.toAddress.toLowerCase() !== currentAddress.toLowerCase()
      }
    } else {
      // 代理获得：当前地址是接收方（to_address）
      if ((record as any).to_address) {
        return (record as any).to_address.toLowerCase() === currentAddress.toLowerCase()
      } else {
        // 回退逻辑：toAddress 是当前地址（旧版本数据）
        return record.toAddress.toLowerCase() === currentAddress.toLowerCase()
      }
    }
  })
  })

  // 加载记录
  const loadRecords = async () => {
    if (!props.poolId) return
    
    await loadDelegateRecords({
      poolAccountId: props.accountId,  // 使用 accountId 作为能量池账户ID
      networkId: props.networkId,      // 使用 networkId 作为网络ID
      page: pagination.page,
      limit: pagination.limit,
      operationType: (filters.operationType || undefined) as 'delegate' | 'undelegate' | undefined,
      resourceType: (filters.resourceType || undefined) as 'ENERGY' | 'BANDWIDTH' | undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    })
  }

  // 分页
  const changePage = async (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    pagination.page = page
    await loadRecords()
  }

  // 查看交易
  const viewTransaction = (txid: string) => {
    console.log('🔍 [DelegateRecords] viewTransaction 被调用:', {
      txid: txid,
      poolId: props.poolId,
      networkId: props.networkId,
      availableNetworks: networkStore.networks.length
    })
    
    if (!txid) {
      console.warn('[DelegateRecords] ⚠️ 交易ID为空，无法查看')
      return
    }

    // 根据传入的 networkId 找到对应的网络配置
    const targetNetwork = networkStore.networks.find(network => network.id === props.networkId)
    let explorerUrl = 'https://tronscan.org' // 默认主网浏览器

    if (targetNetwork?.explorer_url) {
      explorerUrl = targetNetwork.explorer_url
      console.log('✅ [DelegateRecords] 使用目标网络的浏览器URL:', explorerUrl, '网络:', targetNetwork.name)
    } else {
      console.log('⚠️ [DelegateRecords] 目标网络没有配置浏览器URL或网络不存在，使用默认浏览器URL', {
        networkId: props.networkId,
        foundNetwork: !!targetNetwork
      })
    }

    const url = `${explorerUrl}/#/transaction/${txid}`
    console.log('🚀 [DelegateRecords] 最终URL:', url)
    
    const newWindow = window.open(url, '_blank')
    if (!newWindow) {
      console.error('❌ [DelegateRecords] 弹窗被浏览器阻止！')
      alert(`弹窗被阻止，请手动打开: ${url}`)
    }
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
      await performUndelegate({
        networkId: props.poolId,        // props.poolId 实际上是 networkId
        poolAccountId: props.accountId, // 使用 props.accountId 作为 poolAccountId
        resourceType: selectedRecord.value.resourceType,
        amount: selectedRecord.value.amount,
        toAddress: selectedRecord.value.toAddress
      })
      
      // 刷新记录列表
      await loadRecords()
      
      // 关闭对话框
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
      
      // 根据内容类型显示不同提示
      let message = '已复制'
      if (text.startsWith('T') && text.length === 34) {
        message = `${addressLabel}已复制`
      }
      
      showCopySuccessToast(message)
    } catch (error) {
      console.error('❌ 复制失败:', error)
      // 降级方案：使用传统的复制方法
      fallbackCopyToClipboard(text, addressLabel)
    }
  }

  // 降级复制方案
  const fallbackCopyToClipboard = (text: string, addressLabel: string = '内容') => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      
      // 根据内容类型显示不同提示
      let message = '已复制'
      if (text.startsWith('T') && text.length === 34) {
        message = `${addressLabel}已复制`
      }
      
      showCopySuccessToast(message)
      console.log('✅ 内容已复制到剪贴板 (降级方案):', text)
    } catch (error) {
      console.error('❌ 降级复制也失败:', error)
      alert(`复制失败，请手动复制：${text}`)
    } finally {
      document.body.removeChild(textArea)
    }
  }

  // 显示复制成功提示
  const showCopySuccessToast = (message: string) => {
    // 创建提示元素
    const toast = document.createElement('div')
    toast.textContent = message
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300'
    toast.style.transform = 'translateY(-100%)'
    toast.style.opacity = '0'
    
    document.body.appendChild(toast)
    
    // 动画显示
    setTimeout(() => {
      toast.style.transform = 'translateY(0)'
      toast.style.opacity = '1'
    }, 10)
    
    // 3秒后移除
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
 * 获取代理出去记录的文本配置
 */
export function getDelegateOutTextConfig(): DelegateRecordsTextConfig {
  return {
    delegateText: '代理出去',
    undelegateText: '取消代理出去',
    addressLabel: '接收方地址',
    emptyTitle: '暂无代理出去记录',
    emptyMessage: '当前没有找到任何代理出去的记录',
    undelegateDialogTitle: '确认取消代理出去',
    undelegateDialogMessage: (record, formatTrx, formatAddress) => {
      const amount = formatTrx(record.amount)
      const address = formatAddress(record.toAddress)
      return `确定要取消代理给 ${address} 的 ${amount} 吗？`
    },
    undelegateButtonText: '取消代理'
  }
}

/**
 * 获取代理获得记录的文本配置
 */
export function getDelegateInTextConfig(): DelegateRecordsTextConfig {
  return {
    delegateText: '代理获得',
    undelegateText: '取消代理获得',
    addressLabel: '代理方地址',
    emptyTitle: '暂无代理获得记录',
    emptyMessage: '当前没有找到任何代理获得的记录',
    undelegateDialogTitle: '确认取消代理获得',
    undelegateDialogMessage: (record, formatTrx, formatAddress) => {
      const amount = formatTrx(record.amount)
      const address = formatAddress(record.toAddress)
      return `确定要取消来自 ${address} 的 ${amount} 代理吗？`
    },
    undelegateButtonText: '取消代理'
  }
}
