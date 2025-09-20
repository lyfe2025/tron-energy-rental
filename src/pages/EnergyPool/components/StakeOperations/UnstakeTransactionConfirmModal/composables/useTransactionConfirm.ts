/**
 * 交易确认逻辑
 */

import { computed, onMounted, ref } from 'vue'
import type {
    TransactionConfirmState,
    UnstakeTransactionConfirmProps
} from '../types'
import { useTransactionFees } from './useTransactionFees'

export function useTransactionConfirm(
  props: UnstakeTransactionConfirmProps,
  emit: (event: string, ...args: any[]) => void
) {
  // 基础状态
  const loading = ref(false)
  const showDetails = ref(false)

  // 交易费用逻辑
  const {
    feeState,
    estimatedBandwidthFee,
    estimatedServiceFee,
    fetchTransactionFees,
    retryFetchFees
  } = useTransactionFees(props.transactionData)

  // 组合状态
  const state = computed<TransactionConfirmState>(() => ({
    loading: loading.value,
    showDetails: showDetails.value,
    feeState: feeState.value
  }))

  // 计算属性
  const networkName = computed(() => {
    return props.networkParams?.networkName || 'TRON 网络'
  })

  // 地址截断
  const truncateAddress = (address: string) => {
    if (!address) return ''
    if (address.length <= 20) return address
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  // 格式化资源
  const formatResource = (amount: number) => {
    return Math.round(amount).toLocaleString()
  }

  // 切换详情显示
  const toggleDetails = () => {
    showDetails.value = !showDetails.value
  }

  // 处理拒绝
  const handleReject = () => {
    emit('reject')
  }

  // 处理确认
  const handleConfirm = async () => {
    loading.value = true
    
    // 🔍 详细调试信息
    console.log('🔍 [useTransactionConfirm] 用户点击解锁并提取按钮');
    console.log('🔍 [useTransactionConfirm] props.transactionData:', JSON.stringify(props.transactionData, null, 2));
    console.log('🔍 [useTransactionConfirm] 解锁交易数据详情:', {
      amount: props.transactionData?.amount,
      amountType: typeof props.transactionData?.amount,
      resourceType: props.transactionData?.resourceType,
      accountAddress: props.transactionData?.accountAddress,
      accountAddressLength: props.transactionData?.accountAddress?.length,
      poolId: props.transactionData?.poolId,
      accountId: props.transactionData?.accountId,
      完整数据: props.transactionData
    });
    
    // 验证关键数据
    if (!props.transactionData?.accountAddress) {
      console.error('🔍 [useTransactionConfirm] ❌ accountAddress 缺失！');
    } else if (!props.transactionData.accountAddress.startsWith('T') || props.transactionData.accountAddress.length !== 34) {
      console.error('🔍 [useTransactionConfirm] ❌ 无效的TRON地址格式:', props.transactionData.accountAddress);
    } else {
      console.log('🔍 [useTransactionConfirm] ✅ TRON地址格式正确');
    }
    
    if (!props.transactionData?.amount || props.transactionData.amount <= 0) {
      console.error('🔍 [useTransactionConfirm] ❌ 解锁金额无效:', props.transactionData?.amount);
    } else {
      console.log('🔍 [useTransactionConfirm] ✅ 解锁金额有效:', props.transactionData.amount, 'TRX');
      console.log('🔍 [useTransactionConfirm] 🔢 转换为SUN:', props.transactionData.amount * 1000000);
    }
    
    try {
      console.log('🔍 [useTransactionConfirm] 即将发送confirm事件...');
      emit('confirm', props.transactionData)
    } finally {
      loading.value = false
    }
  }

  // 生命周期
  onMounted(() => {
    fetchTransactionFees()
  })

  return {
    // 状态
    state,
    loading,
    showDetails,
    
    // 费用相关
    feeState,
    estimatedBandwidthFee,
    estimatedServiceFee,
    retryFetchFees,
    
    // 计算属性
    networkName,
    
    // 方法
    truncateAddress,
    formatResource,
    toggleDetails,
    handleReject,
    handleConfirm
  }
}
