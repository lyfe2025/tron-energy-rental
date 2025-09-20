/**
 * 解锁提交逻辑
 */

import { stakeAPI } from '@/services/api'
import { ref } from 'vue'
import type { UnstakeFormData, UnstakeOperationProps, UnstakeTransactionData } from '../types'

export function useUnstakeSubmit(props: UnstakeOperationProps) {
  // 交易确认弹窗状态
  const showTransactionConfirm = ref(false)
  const transactionData = ref<UnstakeTransactionData | null>(null)

  // 准备交易数据
  const prepareTransactionData = (form: UnstakeFormData): UnstakeTransactionData => {
    const amount = parseFloat(form.amount)
    
    const data: UnstakeTransactionData = {
      amount: amount,
      resourceType: form.resourceType,
      accountAddress: props.accountAddress || '',
      poolId: props.poolId,
      accountId: props.accountId
    }

    console.log('🔍 [useUnstakeSubmit] 创建解锁交易数据:', {
      props: {
        poolId: props.poolId,
        accountId: props.accountId,
        accountAddress: props.accountAddress,
        accountName: props.accountName
      },
      transactionData: data,
      表单数据: form
    })

    return data
  }

  // 显示交易确认弹窗
  const showConfirmModal = (form: UnstakeFormData) => {
    transactionData.value = prepareTransactionData(form)
    showTransactionConfirm.value = true
  }

  // 执行解锁交易
  const executeUnstakeTransaction = async (data: UnstakeTransactionData): Promise<void> => {
    try {
      console.log('🔍 [useUnstakeSubmit] 执行解锁交易:', data)
      
      // 调用解质押API
      const result = await stakeAPI.unfreezeTrx({
        networkId: data.poolId,
        poolAccountId: data.accountId || '',
        accountAddress: data.accountAddress,
        amount: data.amount,
        resourceType: data.resourceType
      })

      if (result.data.success) {
        console.log('✅ [useUnstakeSubmit] 解锁成功:', result.data)
        
        // 关闭确认弹窗
        hideConfirmModal()
        
        // 格式化金额显示
        const formatAmount = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })
        
        // 显示成功消息
        const message = `解质押成功！解质押金额: ${formatAmount(data.amount)} TRX，等待期后可提取`
        alert(message)
        
        return Promise.resolve()
      } else {
        throw new Error(result.data.message || '解质押失败')
      }
    } catch (err: any) {
      console.error('❌ [useUnstakeSubmit] 解质押失败:', err)
      throw new Error(err.message || '解质押失败，请重试')
    }
  }

  // 隐藏交易确认弹窗
  const hideConfirmModal = () => {
    showTransactionConfirm.value = false
    transactionData.value = null
  }

  // 处理交易确认
  const handleTransactionConfirm = async (data: UnstakeTransactionData): Promise<void> => {
    try {
      await executeUnstakeTransaction(data)
    } catch (error) {
      // 错误已经在 executeUnstakeTransaction 中处理
      throw error
    }
  }

  // 处理交易拒绝
  const handleTransactionReject = () => {
    hideConfirmModal()
  }

  return {
    // 状态
    showTransactionConfirm,
    transactionData,
    
    // 方法
    prepareTransactionData,
    showConfirmModal,
    executeUnstakeTransaction,
    hideConfirmModal,
    handleTransactionConfirm,
    handleTransactionReject
  }
}
