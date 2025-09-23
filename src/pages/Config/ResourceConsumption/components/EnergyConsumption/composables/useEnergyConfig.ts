/**
 * 能量配置管理逻辑
 */

import { useToast } from '@/composables/useToast'
import { reactive, ref, watch } from 'vue'
import type { EnergyConfig } from '../../../types/resource-consumption.types'
import {
    RealTimeValidator,
    ResourceConsumptionValidator,
    ValidationErrorHandler,
    type FormValidationResult
} from '../../../utils/validation'

export function useEnergyConfig(props: { config: EnergyConfig }, emits: any) {
  const { success, error, warning } = useToast()
  
  // 本地配置副本
  const localConfig = reactive<EnergyConfig>({ ...props.config })

  // 验证相关状态
  const validationResult = ref<FormValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  })
  const fieldErrors = ref<Record<string, string>>({})
  const isValidating = ref(false)

  // 监听props变化
  watch(() => props.config, (newConfig) => {
    Object.assign(localConfig, newConfig)
  }, { deep: true })

  // 验证方法
  const validateConfig = async () => {
    isValidating.value = true
    
    try {
      // 执行验证，传递动态验证规则
      const result = ResourceConsumptionValidator.validateEnergyConfig(
        localConfig, 
        props.config.validation_rules
      )
      validationResult.value = result
      
      // 更新字段错误
      fieldErrors.value = ValidationErrorHandler.toElementPlusErrors(result.errors)
      
      // 显示警告信息
      if (result.warnings.length > 0) {
        result.warnings.forEach(msg => {
          warning(msg)
        })
      }
      
      return result.isValid
    } catch (error) {
      console.error('验证配置时出错:', error)
      error('配置验证失败')
      return false
    } finally {
      isValidating.value = false
    }
  }

  // 实时验证单个字段
  const validateField = (fieldName: keyof EnergyConfig) => {
    RealTimeValidator.debounceValidate(
      `energy-${fieldName}`,
      () => {
        const partialConfig = { [fieldName]: localConfig[fieldName] }
        const result = ResourceConsumptionValidator.validateEnergyConfig(
          partialConfig, 
          props.config.validation_rules
        )
        
        // 更新该字段的错误状态
        const fieldError = result.errors.find(error => error.field === fieldName)
        if (fieldError) {
          fieldErrors.value[fieldName] = fieldError.message
        } else {
          delete fieldErrors.value[fieldName]
        }
      },
      300
    )
  }

  // 提交更新
  const emitUpdate = async () => {
    // 先进行验证
    const isValid = await validateConfig()
    
    if (isValid) {
      emits('update', { ...localConfig })
    } else {
      // 显示验证错误
      const firstError = ValidationErrorHandler.getFirstErrorMessage(validationResult.value.errors)
      if (firstError) {
        error(firstError)
      }
    }
  }

  return {
    localConfig,
    validationResult,
    fieldErrors,
    isValidating,
    validateConfig,
    validateField,
    emitUpdate
  }
}
