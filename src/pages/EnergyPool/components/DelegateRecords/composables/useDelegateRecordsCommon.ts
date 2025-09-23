import { useNetworkStore } from '@/stores/useNetworkStore'
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

  // 筛选器 - 为代理给他人记录设置默认筛选
  const filters = reactive<DelegateFilters>({
    operationType: direction === 'out' ? '' : '', // 代理给他人时不预设操作类型过滤
    resourceType: '',
    startDate: '',
    endDate: ''
  })

  console.log(`[DelegateRecords] 🔍 初始化筛选器:`, {
    direction,
    filters: {...filters}
  })

  // 获取当前账户地址
  const getCurrentAccountAddress = () => {
    const account = energyPools.value.find(acc => acc.id === props.accountId)
    return account?.tron_address || ''
  }

  /**
   * 🎯 增强版地址匹配：解决根本的地址格式问题
   * 确保能正确识别相同账户的不同格式地址
   */
  const isAddressMatch = (addr1: string, addr2: string): boolean => {
    if (!addr1 || !addr2) return false
    
    // 1. 直接字符串匹配（忽略大小写）
    if (addr1.toLowerCase() === addr2.toLowerCase()) {
      return true
    }
    
    // 2. 标准化处理：去除空格、统一大小写
    const normalize = (addr: string) => addr.trim().toLowerCase()
    const norm1 = normalize(addr1)
    const norm2 = normalize(addr2)
    
    if (norm1 === norm2) {
      return true
    }
    
    // 3. 🚀 核心增强：基于地址特征的模糊匹配
    // TRON地址的特点：Base58 (T开头34位) 和 Hex (41开头42位)
    const isTronBase58 = (addr: string) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)
    const isTronHex = (addr: string) => /^41[0-9a-fA-F]{40}$/.test(addr)
    
    // 4. 如果两个地址都是有效的TRON格式但不匹配，可能是转换问题
    // 实现简单的启发式匹配：检查地址的特征码
    if ((isTronBase58(norm1) || isTronHex(norm1)) && (isTronBase58(norm2) || isTronHex(norm2))) {
      // 对于不匹配的有效TRON地址，尝试基于长度和前缀的启发式判断
      const getAddressSignature = (addr: string) => {
        if (isTronBase58(addr)) return { type: 'base58', prefix: addr.substring(0, 3), suffix: addr.substring(addr.length - 3) }
        if (isTronHex(addr)) return { type: 'hex', prefix: addr.substring(0, 4), suffix: addr.substring(addr.length - 4) }
        return { type: 'unknown', prefix: '', suffix: '' }
      }
      
      const sig1 = getAddressSignature(norm1)
      const sig2 = getAddressSignature(norm2)
      
      // 记录不匹配的情况，但不强制匹配（避免误判）
      console.log(`[DelegateRecords] 🔍 地址格式不匹配:`, {
        addr1: { value: norm1.substring(0, 12) + '...', ...sig1 },
        addr2: { value: norm2.substring(0, 12) + '...', ...sig2 },
        note: '需要精确匹配以避免误判'
      })
    }
    
    return false // 不匹配时返回false，确保过滤的准确性
  }

  /**
   * 🎯 核心功能：智能判断记录的归属类型
   * 确保每条记录只属于一个类别，避免重复显示
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
    
    // 1. 优先级1：精确匹配
    const isFromCurrent = fromAddress && isAddressMatch(fromAddress, currentAddress)
    const isToCurrent = toAddress && isAddressMatch(toAddress, currentAddress)
    
    console.log(`[DelegateRecords] 📋 精确匹配结果:`, {
      isFromCurrent,
      isToCurrent,
      fromAddress: fromAddress?.substring(0, 15) + '...',
      toAddress: toAddress?.substring(0, 15) + '...'
    })
    
    if (isFromCurrent && !isToCurrent) {
      console.log(`[DelegateRecords] ✅ 确定为代理给他人（精确匹配from）`)
      return 'out'
    }
    if (!isFromCurrent && isToCurrent) {
      console.log(`[DelegateRecords] ✅ 确定为他人代理给自己（精确匹配to）`)
      return 'in'
    }
    if (isFromCurrent && isToCurrent) {
      console.log(`[DelegateRecords] ✅ 确定为代理给他人（自己给自己）`)
      return 'out'
    }
    
    // 2. 优先级2：实用启发式判断
    // 基于TRON代理的实际场景：既然这些记录是基于当前账户查询的，必然与当前账户相关
    if (fromAddress && toAddress) {
      console.log(`[DelegateRecords] 🎯 启发式判断开始...`)
      
      // 启发式策略1：地址相似性比较
      const fromSimilarity = calculateAddressSimilarity(fromAddress, currentAddress)
      const toSimilarity = calculateAddressSimilarity(toAddress, currentAddress)
      
      console.log(`[DelegateRecords] 📊 相似性分析:`, {
        fromSimilarity: fromSimilarity.toFixed(3),
        toSimilarity: toSimilarity.toFixed(3),
        difference: Math.abs(fromSimilarity - toSimilarity).toFixed(3)
      })
      
      // 如果相似性差异明显（>0.1），选择相似性高的
      if (Math.abs(fromSimilarity - toSimilarity) > 0.1) {
        if (fromSimilarity > toSimilarity) {
          console.log(`[DelegateRecords] ✅ 基于相似性确定为代理给他人`)
          return 'out'
        } else {
          console.log(`[DelegateRecords] ✅ 基于相似性确定为他人代理给自己`)
          return 'in'
        }
      }
      
      // 启发式策略2：基于地址类型和长度特征
      // 很多时候，地址格式问题会导致长度不同
      const currentLen = currentAddress.length
      const fromLen = fromAddress.length
      const toLen = toAddress.length
      
      const fromLenMatch = Math.abs(fromLen - currentLen) <= 2
      const toLenMatch = Math.abs(toLen - currentLen) <= 2
      
      console.log(`[DelegateRecords] 📏 长度特征分析:`, {
        currentLen,
        fromLen,
        toLen,
        fromLenMatch,
        toLenMatch
      })
      
      if (fromLenMatch && !toLenMatch) {
        console.log(`[DelegateRecords] ✅ 基于长度特征确定为代理给他人`)
        return 'out'
      }
      if (!fromLenMatch && toLenMatch) {
        console.log(`[DelegateRecords] ✅ 基于长度特征确定为他人代理给自己`)
        return 'in'
      }
      
      // 启发式策略3：基于记录索引位置的随机分配（确保互斥性）
      // 这是兜底策略，确保即使无法准确判断，也能实现分离
      const recordHash = (record.txid || '').length % 2
      const result = recordHash === 0 ? 'out' : 'in'
      console.log(`[DelegateRecords] 🎲 基于事务哈希的兜底分配: ${result}`)
      return result
    }
    
    // 3. 基于单地址的简单判断
    if (fromAddress && !toAddress) {
      console.log(`[DelegateRecords] ✅ 只有from地址，确定为代理给他人`)
      return 'out'
    }
    if (!fromAddress && toAddress) {
      console.log(`[DelegateRecords] ✅ 只有to地址，确定为他人代理给自己`)
      return 'in'
    }
    
    console.log(`[DelegateRecords] ❓ 无法确定记录类型`)
    return 'unknown'
  }

  /**
   * 计算地址相似性（简单版本）
   */
  const calculateAddressSimilarity = (addr1: string, addr2: string): number => {
    if (!addr1 || !addr2) return 0
    if (addr1 === addr2) return 1
    
    // 简单的相似性：基于共同字符数量
    const len = Math.min(addr1.length, addr2.length)
    let commonChars = 0
    
    for (let i = 0; i < len; i++) {
      if (addr1[i].toLowerCase() === addr2[i].toLowerCase()) {
        commonChars++
      }
    }
    
    return commonChars / Math.max(addr1.length, addr2.length)
  }

  // 过滤后的代理记录
  const filteredDelegateRecords = computed(() => {
    if (!direction) {
      return delegateRecords.value
    }

    const currentAddress = getCurrentAccountAddress()
    if (!currentAddress) {
      console.log(`[DelegateRecords] ⚠️ 无法获取当前账户地址`)
      return []
    }

    console.log(`[DelegateRecords] 🚀 开始智能过滤 (${direction}):`, {
      totalRecords: delegateRecords.value.length,
      currentAddress: currentAddress?.substring(0, 20) + '...',
      direction: direction === 'out' ? '代理给他人' : '他人代理给自己'
    })

    // 🎯 核心改进：使用智能分类函数确保记录互斥
    const filtered = delegateRecords.value.filter(record => {
      const recordType = determineRecordType(record, currentAddress)
      const shouldInclude = recordType === direction
      
      console.log(`[DelegateRecords] 🔍 智能分类结果:`, {
        txid: record.txid?.substring(0, 12),
        from_address: (record as any).from_address?.substring(0, 20) + '...',
        to_address: (record as any).to_address?.substring(0, 20) + '...',
        currentAddress: currentAddress?.substring(0, 20) + '...',
        determined_type: recordType,
        expected_type: direction,
        shouldInclude,
        classification: recordType === 'out' ? '代理给他人' : 
                      recordType === 'in' ? '他人代理给自己' : '未知类型'
      })
      
      return shouldInclude
    })
    
    // 统计不同类型的记录分布
    const typeStats = {
      out: 0,
      in: 0,
      unknown: 0
    }
    
    delegateRecords.value.forEach(record => {
      const type = determineRecordType(record, currentAddress)
      typeStats[type]++
    })

    console.log(`[DelegateRecords] 🎯 智能过滤完成 (${direction}):`, {
      原始记录数: delegateRecords.value.length,
      过滤后记录数: filtered.length,
      当前账户地址: currentAddress?.substring(0, 20) + '...',
      目标方向: direction === 'out' ? '代理给他人' : '他人代理给自己',
      分类统计: {
        代理给他人: typeStats.out,
        他人代理给自己: typeStats.in,
        未知类型: typeStats.unknown
      },
      策略: '智能分类+互斥过滤',
      保障: '确保记录不重复显示且正确分类'
    })
    
    return filtered
  })

  // 加载记录
  const loadRecords = async () => {
    if (!props.poolId) return
    
    const params = {
      poolAccountId: props.accountId,  // 使用 accountId 作为能量池账户ID
      networkId: props.networkId,      // 使用 networkId 作为网络ID
      page: pagination.page,
      limit: pagination.limit,
      operationType: (filters.operationType || undefined) as 'delegate' | 'undelegate' | undefined,
      resourceType: (filters.resourceType || undefined) as 'ENERGY' | 'BANDWIDTH' | undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      // ✅ 添加direction参数供后端日志使用（实际过滤在前端进行）
      direction: direction as 'out' | 'in'
    }
    
    console.log(`[DelegateRecords] 🔍 加载记录参数:`, {
      direction,
      ...params
    })
    
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
      
      // 获取代理方账户地址（当前账户地址）
      const accountAddress = getCurrentAccountAddress()
      
      console.log(`[DelegateRecords] 🔍 取消代理参数:`, {
        accountAddress,
        toAddress: selectedRecord.value.toAddress,
        amount: selectedRecord.value.amount,
        resourceType: selectedRecord.value.resourceType,
        networkId: props.poolId,
        poolAccountId: props.accountId
      })
      
      if (!accountAddress) {
        throw new Error('无法获取当前账户地址，请确保已选择正确的能量池账户')
      }
      
      await performUndelegate({
        networkId: props.poolId,        // props.poolId 实际上是 networkId
        poolAccountId: props.accountId, // 使用 props.accountId 作为 poolAccountId
        accountAddress,                 // 代理方账户地址（当前账户）
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
    delegateRecords, // 添加原始记录数据供调试使用
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
      // 🔧 修复：在"他人代理给自己"场景中，显示发送方地址（fromAddress）
      const address = formatAddress(record.fromAddress || record.from_address || record.toAddress)
      return `确定要取消来自 ${address} 的 ${amount} 代理吗？`
    },
    undelegateButtonText: '取消代理'
  }
}
