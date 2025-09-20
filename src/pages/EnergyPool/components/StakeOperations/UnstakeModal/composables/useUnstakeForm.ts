/**
 * 解锁表单逻辑
 */

import { useNumberInput } from '@/composables/useNumberInput'
import { computed, ref } from 'vue'
import type { ResourceType, UnstakeAccountBalance, UnstakeFormData } from '../types'

export function useUnstakeForm() {
  // 数字输入验证
  const { validateNumberInput } = useNumberInput()

  // 表单数据
  const form = ref<UnstakeFormData>({
    resourceType: 'ENERGY',
    amount: ''
  })

  // 格式化TRX数量显示
  const formatTrxAmount = (amount: number) => {
    if (amount === 0) return '0'
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })
  }

  // 获取当前选择资源类型的可解质押数量（用于显示）
  const getCurrentResourceStaked = (accountBalance: UnstakeAccountBalance | null) => {
    const amount = getCurrentResourceStakedAmount(accountBalance)
    return formatTrxAmount(amount)
  }

  // 根据资源类型获取可解质押数量（用于显示）
  const getCurrentResourceStakedByType = (resourceType: ResourceType, accountBalance: UnstakeAccountBalance | null) => {
    if (!accountBalance) return '0'
    
    let amount = 0
    if (resourceType === 'ENERGY') {
      amount = accountBalance.energyDirectStaked || 0
    } else {
      amount = accountBalance.bandwidthDirectStaked || 0
    }
    return formatTrxAmount(amount)
  }

  // 获取当前选择资源类型的可解质押数量（数值）
  // 解质押只能解锁直接质押的数量，不包括代理给他人的
  const getCurrentResourceStakedAmount = (accountBalance: UnstakeAccountBalance | null) => {
    if (!accountBalance) return 0
    
    if (form.value.resourceType === 'ENERGY') {
      return accountBalance.energyDirectStaked || 0
    } else {
      return accountBalance.bandwidthDirectStaked || 0
    }
  }

  // 获取正在代理中的资源总量
  const getDelegatingResources = (accountBalance: UnstakeAccountBalance | null) => {
    if (!accountBalance) return 0
    
    // 获取真实的代理给他人的数量（delegatedOut）
    const energyDelegated = accountBalance.energyDelegatedOut || 0
    const bandwidthDelegated = accountBalance.bandwidthDelegatedOut || 0
    return energyDelegated + bandwidthDelegated
  }

  // 表单验证
  const isFormValid = computed(() => {
    const amount = parseFloat(form.value.amount)
    return form.value.amount.trim() !== '' && 
           !isNaN(amount) && 
           amount > 0
  })

  // 重置表单
  const resetForm = () => {
    form.value = {
      resourceType: 'ENERGY',
      amount: ''
    }
  }

  // 设置资源类型
  const setResourceType = (resourceType: ResourceType) => {
    form.value.resourceType = resourceType
    form.value.amount = '' // 清空金额
  }

  return {
    // 状态
    form,
    
    // 计算属性
    isFormValid,
    
    // 方法
    validateNumberInput,
    formatTrxAmount,
    getCurrentResourceStaked,
    getCurrentResourceStakedByType,
    getCurrentResourceStakedAmount,
    getDelegatingResources,
    resetForm,
    setResourceType
  }
}
