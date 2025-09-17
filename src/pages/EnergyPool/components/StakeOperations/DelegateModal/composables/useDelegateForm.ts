/**
 * 代理表单数据管理 Composable
 */
import { ref, watch } from 'vue'
import type { DelegateFormData } from '../../shared/types'

export function useDelegateForm(lockPeriodRange: any) {
  // 表单数据
  const form = ref<DelegateFormData>({
    resourceType: 'ENERGY',
    amount: '',
    receiverAddress: '',
    enableLockPeriod: false,  // 默认不启用代理期限
    lockPeriod: 1.0
  })

  // 当网络参数变化时，更新默认的代理期限
  watch(() => lockPeriodRange.value, (newRange) => {
    if (newRange && (!form.value.lockPeriod || form.value.lockPeriod < newRange.min || form.value.lockPeriod > newRange.max)) {
      // 设置为推荐范围的较小值作为默认值，支持小数
      const recommendedMin = parseFloat(newRange.recommended.split('-')[0]) || newRange.min
      form.value.lockPeriod = Math.max(recommendedMin, 1.0) // 至少1天，便于用户理解
    }
  }, { immediate: true })

  // 设置最大数量
  const setMaxAmount = (availableEnergy: number, availableBandwidth: number) => {
    const maxAmount = form.value.resourceType === 'ENERGY' ? availableEnergy : availableBandwidth
    form.value.amount = maxAmount.toString()
  }

  return {
    form,
    setMaxAmount
  }
}
