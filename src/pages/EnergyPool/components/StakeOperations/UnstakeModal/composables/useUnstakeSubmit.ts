/**
 * 解锁提交逻辑
 */

import { stakeAPI } from '@/services/api'
import { ref } from 'vue'
import type { UnstakeSuccessData } from '../../UnstakeSuccessModal.vue'
import type { UnstakeFormData, UnstakeOperationProps, UnstakeTransactionData } from '../types'

import type { NetworkParameters } from '@/services/networkParametersService'
import type { Ref } from 'vue'

export function useUnstakeSubmit(
  props: UnstakeOperationProps, 
  networkParams?: Ref<NetworkParameters | null>
) {
  // 交易确认弹窗状态
  const showTransactionConfirm = ref(false)
  const transactionData = ref<UnstakeTransactionData | null>(null)

  // 成功弹窗状态
  const showSuccessModal = ref(false)
  const successData = ref<UnstakeSuccessData | null>(null)

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
        
        // 准备成功弹窗数据
        const resultData = result.data.data
        
        // 计算预估失去的资源量（简化估算：能量约为TRX*365，带宽约为TRX*600）
        const estimatedLostResource = data.resourceType === 'ENERGY' 
          ? data.amount * 365 
          : data.amount * 600
        
        // 设置成功弹窗数据
        successData.value = {
          amount: data.amount,
          resourceType: data.resourceType,
          lostResource: estimatedLostResource,
          unfreezeTime: resultData?.unfreezeTime || new Date().toISOString(),
          unlockPeriodText: networkParams?.value?.unlockPeriodText || '14天',
          transactionHash: resultData?.txid
        }
        
        // 显示成功弹窗
        showSuccessModal.value = true
        
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

  // 隐藏成功弹窗
  const hideSuccessModal = () => {
    showSuccessModal.value = false
    successData.value = null
  }

  // 处理查看交易
  const handleViewTransaction = (txHash: string) => {
    // 根据网络类型构建交易查看链接
    const explorerUrl = 'https://tronscan.org/#/transaction/' + txHash
    window.open(explorerUrl, '_blank')
    console.log('🔍 [useUnstakeSubmit] 查看交易:', txHash)
  }

  return {
    // 确认弹窗状态
    showTransactionConfirm,
    transactionData,
    
    // 成功弹窗状态
    showSuccessModal,
    successData,
    
    // 方法
    prepareTransactionData,
    showConfirmModal,
    executeUnstakeTransaction,
    hideConfirmModal,
    handleTransactionConfirm,
    handleTransactionReject,
    
    // 成功弹窗方法
    hideSuccessModal,
    handleViewTransaction
  }
}
