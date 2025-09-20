/**
 * 交易费用计算逻辑
 */

import { transactionFeeService } from '@/services/transactionFeeService'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { TransactionFeeState, UnstakeTransactionData } from '../types'

export function useTransactionFees(transactionData: UnstakeTransactionData) {
  const route = useRoute()
  
  // 费用状态
  const feeState = ref<TransactionFeeState>({
    fees: null,
    loading: false,
    error: null
  })

  // 获取网络ID
  const networkId = computed(() => route.params.networkId as string)

  // 计算属性 - 预估带宽费用
  const estimatedBandwidthFee = computed(() => {
    if (feeState.value.loading) {
      return '获取中...'
    }
    if (feeState.value.error) {
      return '获取失败'
    }
    if (feeState.value.fees === null) {
      return '未知'
    }
    return feeState.value.fees.bandwidthFee?.toString() || '0'
  })

  // 计算属性 - 预估服务费
  const estimatedServiceFee = computed(() => {
    if (feeState.value.loading) {
      return '获取中...'
    }
    if (feeState.value.error) {
      return '获取失败'
    }
    if (feeState.value.fees === null) {
      return '未知'
    }
    return feeState.value.fees.serviceFee?.toString() || '0'
  })

  // 获取交易费用 - 从TRON官方API
  const fetchTransactionFees = async () => {
    if (!transactionData || !networkId.value) return
    
    feeState.value.loading = true
    feeState.value.error = null
    
    try {
      console.log('[useTransactionFees] 获取TRON官方解锁交易费用...')
      const fees = await transactionFeeService.calculateUnstakingFees({
        amount: transactionData.amount,
        resourceType: transactionData.resourceType,
        networkId: networkId.value,
        accountAddress: transactionData.accountAddress
      })
      
      feeState.value.fees = fees
      console.log('[useTransactionFees] TRON官方解锁费用获取成功:', fees)
      
    } catch (error) {
      console.error('[useTransactionFees] TRON官方解锁费用获取失败:', error)
      feeState.value.error = 'TRON网络数据获取失败'
      // 不设置默认值，保持真实性
    } finally {
      feeState.value.loading = false
    }
  }

  // 重试获取费用
  const retryFetchFees = async () => {
    await fetchTransactionFees()
  }

  return {
    // 状态
    feeState,
    
    // 计算属性
    estimatedBandwidthFee,
    estimatedServiceFee,
    
    // 方法
    fetchTransactionFees,
    retryFetchFees
  }
}
