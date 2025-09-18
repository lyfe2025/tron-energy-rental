/**
 * 代理表单验证逻辑 Composable
 */
import { TronAddressValidator, type TronAddressValidationResult } from '@/utils/tronAddressValidator'
import { ref, watch } from 'vue'

export function useDelegateValidation() {
  // 代理期限验证错误
  const lockPeriodError = ref('')
  
  // 代理数量验证错误
  const amountError = ref('')
  
  // 地址验证状态
  const addressValidation = ref<TronAddressValidationResult | null>(null)
  const isValidatingAddress = ref(false)

  // 验证TRON地址
  const validateAddress = async (address: string) => {
    if (!address || !address.trim()) {
      addressValidation.value = null
      return
    }

    try {
      isValidatingAddress.value = true
      
      // 使用我们的地址验证工具
      const result = TronAddressValidator.validateAddress(address.trim())
      addressValidation.value = result
      
      console.log('🔍 地址验证结果:', {
        address: address.trim(),
        isValid: result.isValid,
        errors: result.errors,
        confidence: result.confidence
      })
      
    } catch (error: any) {
      console.error('❌ 地址验证失败:', error)
      addressValidation.value = {
        isValid: false,
        errors: [`验证过程出错: ${error.message || '未知错误'}`],
        confidence: 'low'
      }
    } finally {
      isValidatingAddress.value = false
    }
  }

  // 验证代理期限
  const validateLockPeriod = (enableLockPeriod: boolean, lockPeriod: number | undefined, lockPeriodRange: any) => {
    lockPeriodError.value = ''
    
    // 如果未启用代理期限，则跳过验证
    if (!enableLockPeriod) {
      return true
    }
    
    if (!lockPeriod) {
      lockPeriodError.value = '请输入代理期限'
      return false
    }

    const period = Number(lockPeriod)
    const range = lockPeriodRange.value

    if (isNaN(period) || period <= 0) {
      lockPeriodError.value = '代理期限必须是正数'
      return false
    }

    // 检查精度（最多2位小数）
    if (Number(period.toFixed(2)) !== period) {
      lockPeriodError.value = '代理期限最多支持2位小数'
      return false
    }

    if (period < range.min) {
      lockPeriodError.value = `代理期限不能少于 ${range.min} 小时（3秒）`
      return false
    }

    if (period > range.max) {
      lockPeriodError.value = `代理期限不能超过 ${range.max} 小时`
      return false
    }

    return true
  }

  // 验证代理数量（增强版）
  const validateAmount = (amount: string, resourceType: 'ENERGY' | 'BANDWIDTH', availableAmount: number) => {
    amountError.value = ''
    
    if (!amount || amount.trim() === '') {
      amountError.value = '请输入代理数量'
      return false
    }

    const numAmount = parseFloat(amount)
    
    if (isNaN(numAmount)) {
      amountError.value = '❌ 请输入有效的数字'
      return false
    }

    if (numAmount <= 0) {
      amountError.value = '❌ 代理数量必须大于0'
      return false
    }

    if (numAmount < 1) {
      amountError.value = '❌ 代理数量至少为1 TRX (TRON网络最小限制)'
      return false
    }

    // 检查小数位数（最多2位小数）
    if (Number(numAmount.toFixed(2)) !== numAmount) {
      amountError.value = '❌ 代理数量最多支持2位小数'
      return false
    }

    const resourceName = resourceType === 'ENERGY' ? 'ENERGY' : 'BANDWIDTH'
    
    // 检查可用余额
    if (availableAmount <= 0) {
      amountError.value = `❌ 当前账户没有可代理的${resourceName}，请先质押TRX获得${resourceName}资源`
      return false
    }

    if (numAmount > availableAmount) {
      amountError.value = `❌ 代理数量(${numAmount.toLocaleString()} 个 ${resourceName})超过可用资源(${availableAmount.toLocaleString()} 个 ${resourceName})，请减少代理数量或先质押更多TRX`
      return false
    }

    // 成功验证，显示友好提示
    const remaining = availableAmount - numAmount
    amountError.value = `✅ 可以代理 ${numAmount.toLocaleString()} 个 ${resourceName} (剩余: ${remaining.toLocaleString()} 个 ${resourceName})`

    return true
  }

  // 设置地址验证监听器
  const setupAddressValidation = (form: any) => {
    watch(() => form.value.receiverAddress, (newAddress) => {
      if (newAddress && newAddress.trim()) {
        // 使用防抖，避免频繁验证
        setTimeout(() => {
          if (form.value.receiverAddress === newAddress) {
            validateAddress(newAddress)
          }
        }, 500)
      } else {
        addressValidation.value = null
      }
    }, { immediate: true })
  }

  // 设置数量验证监听器
  const setupAmountValidation = (form: any, availableEnergy: any, availableBandwidth: any) => {
    // 监听数量变化
    watch(() => form.value.amount, (newAmount) => {
      if (newAmount && newAmount.trim()) {
        // 使用防抖，避免频繁验证
        setTimeout(() => {
          if (form.value.amount === newAmount) {
            const currentAvailable = form.value.resourceType === 'ENERGY' ? availableEnergy.value : availableBandwidth.value
            validateAmount(newAmount, form.value.resourceType, currentAvailable)
          }
        }, 300)
      } else {
        amountError.value = ''
      }
    })

    // 监听资源类型变化，重新验证数量
    watch(() => form.value.resourceType, () => {
      if (form.value.amount && form.value.amount.trim()) {
        const currentAvailable = form.value.resourceType === 'ENERGY' ? availableEnergy.value : availableBandwidth.value
        validateAmount(form.value.amount, form.value.resourceType, currentAvailable)
      }
    })

    // 监听可用资源变化，重新验证数量
    watch([availableEnergy, availableBandwidth], () => {
      if (form.value.amount && form.value.amount.trim()) {
        const currentAvailable = form.value.resourceType === 'ENERGY' ? availableEnergy.value : availableBandwidth.value
        validateAmount(form.value.amount, form.value.resourceType, currentAvailable)
      }
    })
  }

  return {
    lockPeriodError,
    amountError,
    addressValidation,
    isValidatingAddress,
    validateAddress,
    validateLockPeriod,
    validateAmount,
    setupAddressValidation,
    setupAmountValidation
  }
}
