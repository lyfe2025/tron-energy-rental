/**
 * 解锁模态框主逻辑
 */

import { computed } from 'vue'
import { useStakeModal } from '../../shared/useStakeModal'
import type { UnstakeModalState, UnstakeOperationProps } from '../types'
import { useUnstakeForm } from './useUnstakeForm'
import { useUnstakeResources } from './useUnstakeResources'
import { useUnstakeSubmit } from './useUnstakeSubmit'
import { useUnstakeValidation } from './useUnstakeValidation'

export function useUnstakeModal(props: UnstakeOperationProps) {
  // 使用共享的模态框逻辑
  const {
    state: baseState,
    isFormValid: baseFormValid,
    formatResource,
    calculateEstimatedResource,
    loadNetworkParams
  } = useStakeModal(props)

  // 解锁表单逻辑
  const {
    form,
    isFormValid: formValid,
    validateNumberInput,
    formatTrxAmount,
    getCurrentResourceStaked,
    getCurrentResourceStakedByType,
    getCurrentResourceStakedAmount,
    getDelegatingResources,
    resetForm,
    setResourceType
  } = useUnstakeForm()

  // 资源处理逻辑
  const {
    accountBalance,
    withdrawableAmount,
    loadAccountBalance,
    setMaxAmount
  } = useUnstakeResources(props)

  // 验证逻辑
  const {
    validateUnstakeForm,
    validateMinimumAmount,
    validateAccountStatus,
    validateNetworkParams
  } = useUnstakeValidation(props)

  // 提交逻辑
  const {
    showTransactionConfirm,
    transactionData,
    showConfirmModal,
    handleTransactionConfirm,
    handleTransactionReject,
    // 成功弹窗状态和方法
    showSuccessModal,
    successData,
    hideSuccessModal,
    handleViewTransaction
  } = useUnstakeSubmit(props, computed(() => baseState.value.networkParams))

  // 扩展的模态框状态
  const state = computed<UnstakeModalState>(() => ({
    ...baseState.value,
    showTransactionConfirm: showTransactionConfirm.value,
    transactionData: transactionData.value
  }))

  // 扩展的表单验证
  const isFormValid = computed(() => {
    return baseFormValid.value && 
           formValid.value && 
           !!accountBalance.value &&
           getCurrentResourceStakedAmount(accountBalance.value) > 0
  })

  // 账户名
  const accountName = computed(() => {
    return props.accountName || '未知账户'
  })

  // 设置最大金额的包装方法
  const handleSetMaxAmount = async () => {
    try {
      const maxAmountStr = await setMaxAmount(form.value.resourceType)
      form.value.amount = maxAmountStr
      baseState.value.error = '' // 清空错误信息
    } catch (error: any) {
      baseState.value.error = error.message
    }
  }

  // 处理表单提交
  const handleSubmit = async () => {
    if (!isFormValid.value) return

    try {
      // 清空错误信息
      baseState.value.error = ''

      // 验证网络参数
      const networkValidation = validateNetworkParams(baseState.value.networkParams)
      if (!networkValidation.valid) {
        baseState.value.error = networkValidation.error || '网络参数验证失败'
        return
      }

      // 验证账户状态
      const accountValidation = validateAccountStatus(accountBalance.value)
      if (!accountValidation.valid) {
        baseState.value.error = accountValidation.error || '账户状态验证失败'
        return
      }

      // 验证表单数据
      const formValidation = await validateUnstakeForm(form.value, accountBalance.value)
      if (!formValidation.valid) {
        baseState.value.error = formValidation.error || '表单验证失败'
        return
      }

      // 验证最小金额
      const amount = parseFloat(form.value.amount)
      const amountValidation = validateMinimumAmount(amount)
      if (!amountValidation.valid) {
        baseState.value.error = amountValidation.error || '金额验证失败'
        return
      }

      // 显示交易确认弹窗
      showConfirmModal(form.value)

    } catch (error: any) {
      console.error('❌ [useUnstakeModal] 表单提交失败:', error)
      baseState.value.error = error.message || '表单提交失败，请重试'
    }
  }

  // 监听资源类型变化
  const handleResourceTypeChange = (resourceType: 'ENERGY' | 'BANDWIDTH') => {
    setResourceType(resourceType)
    baseState.value.error = '' // 清空错误信息
  }

  // 创建包装方法以匹配UnstakeForm的期望类型
  const getCurrentResourceStakedWrapper = (resourceType: 'ENERGY' | 'BANDWIDTH') => {
    return getCurrentResourceStakedByType(resourceType, accountBalance.value)
  }

  return {
    // 状态
    state,
    form,
    accountBalance,
    withdrawableAmount,
    
    // 计算属性
    isFormValid,
    accountName,
    
    // 表单相关方法
    validateNumberInput,
    formatTrxAmount,
    getCurrentResourceStaked: getCurrentResourceStakedWrapper,
    getCurrentResourceStakedAmount,
    getDelegatingResources,
    resetForm,
    handleSetMaxAmount,
    handleResourceTypeChange,
    
    // 资源相关方法
    formatResource,
    calculateEstimatedResource,
    loadNetworkParams,
    loadAccountBalance,
    
    // 提交相关方法
    handleSubmit,
    handleTransactionConfirm,
    handleTransactionReject,
    
    // 确认弹窗状态
    showTransactionConfirm,
    transactionData,
    
    // 成功弹窗状态和方法
    showSuccessModal,
    successData,
    hideSuccessModal,
    handleViewTransaction
  }
}
