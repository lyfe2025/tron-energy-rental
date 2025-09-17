/**
 * 代理模态框主逻辑 Composable
 * 整合所有子 composable 函数
 */
import { useDelegateForm } from './useDelegateForm'
import { useDelegateResources } from './useDelegateResources'
import { useDelegateSubmit } from './useDelegateSubmit'
import { useDelegateValidation } from './useDelegateValidation'

export function useDelegateModal(props: any, state: any, isFormValid: any, emit: any) {
  // 1. 资源管理
  const {
    accountResources,
    loadingResources,
    availableEnergy,
    availableBandwidth,
    lockPeriodRange,
    fetchAccountResources,
    setupResourceWatchers
  } = useDelegateResources(props, state)

  // 2. 表单管理
  const { form, setMaxAmount } = useDelegateForm(lockPeriodRange)

  // 3. 验证逻辑
  const {
    lockPeriodError,
    amountError,
    addressValidation,
    isValidatingAddress,
    validateAddress,
    validateLockPeriod,
    validateAmount,
    setupAddressValidation,
    setupAmountValidation
  } = useDelegateValidation()

  // 4. 提交处理
  const { handleSubmit, setupFormWatchers } = useDelegateSubmit()

  // 包装验证函数，提供必要的参数
  const wrappedValidateLockPeriod = () => {
    return validateLockPeriod(form.value.enableLockPeriod, form.value.lockPeriod, lockPeriodRange)
  }

  // 包装数量验证函数
  const wrappedValidateAmount = () => {
    const currentAvailable = form.value.resourceType === 'ENERGY' ? availableEnergy.value : availableBandwidth.value
    return validateAmount(form.value.amount, form.value.resourceType, currentAvailable)
  }

  // 包装设置最大数量函数
  const wrappedSetMaxAmount = () => {
    setMaxAmount(availableEnergy.value, availableBandwidth.value)
  }

  // 包装提交函数
  const wrappedHandleSubmit = () => {
    return handleSubmit(
      form,
      state,
      isFormValid,
      addressValidation,
      wrappedValidateLockPeriod,
      wrappedValidateAmount,
      emit
    )
  }

  // 初始化所有监听器
  const initializeWatchers = () => {
    setupResourceWatchers()
    setupAddressValidation(form)
    setupAmountValidation(form, availableEnergy, availableBandwidth)
    setupFormWatchers(form, wrappedValidateLockPeriod)
  }

  // 自动初始化
  initializeWatchers()

  return {
    // 表单数据
    form,
    
    // 资源数据
    accountResources,
    loadingResources,
    availableEnergy,
    availableBandwidth,
    lockPeriodRange,
    
    // 验证数据
    lockPeriodError,
    amountError,
    addressValidation,
    isValidatingAddress,
    
    // 方法
    validateAddress,
    validateLockPeriod: wrappedValidateLockPeriod,
    validateAmount: wrappedValidateAmount,
    setMaxAmount: wrappedSetMaxAmount,
    handleSubmit: wrappedHandleSubmit,
    fetchAccountResources
  }
}
