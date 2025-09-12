/**
 * 表单验证逻辑
 * 职责：处理机器人编辑表单的验证规则和验证状态
 */
import { computed, ref } from 'vue'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

export interface ValidationRules {
  [key: string]: ValidationRule[]
}

export interface ValidationErrors {
  [key: string]: string[]
}

export function useFormValidation() {
  // 验证错误状态
  const validationErrors = ref<ValidationErrors>({})
  
  // 定义验证规则
  const validationRules: ValidationRules = {
    name: [
      { required: true },
      { minLength: 1 },
      { maxLength: 100 }
    ],
    username: [
      { required: true },
      { minLength: 5 },
      { maxLength: 32 },
      { 
        pattern: /^[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]$|^[a-zA-Z]$/,
        custom: (value: string) => {
          if (!value) return true
          if (value.length < 5) return '用户名至少需要5个字符'
          if (!/^[a-zA-Z]/.test(value)) return '用户名必须以字母开头'
          if (!/[a-zA-Z0-9]$/.test(value)) return '用户名必须以字母或数字结尾'
          if (!/^[a-zA-Z0-9_]+$/.test(value)) return '用户名只能包含字母、数字和下划线'
          return true
        }
      }
    ],
    token: [
      { required: true },
      { minLength: 45 },
      { maxLength: 50 },
      {
        pattern: /^\d+:[a-zA-Z0-9_-]+$/,
        custom: (value: string) => {
          if (!value) return true
          const parts = value.split(':')
          if (parts.length !== 2) return 'Token 格式应为 BOT_ID:BOT_TOKEN'
          if (!parts[0] || !parts[1]) return 'Token 格式不完整'
          if (!/^\d+$/.test(parts[0])) return 'Bot ID 应为纯数字'
          return true
        }
      }
    ],
    webhook_url: [
      {
        custom: (value: string) => {
          if (!value) return true
          try {
            const url = new URL(value)
            if (!['http:', 'https:'].includes(url.protocol)) {
              return 'Webhook URL 必须使用 HTTP 或 HTTPS 协议'
            }
            return true
          } catch {
            return '请输入有效的 URL 地址'
          }
        }
      }
    ],
    max_connections: [
      {
        custom: (value: number) => {
          if (value === null || value === undefined) return true
          if (value < 1 || value > 100) return '最大连接数应在 1-100 之间'
          return true
        }
      }
    ]
  }

  // 验证单个字段
  const validateField = (fieldName: string, value: any): string[] => {
    const rules = validationRules[fieldName]
    if (!rules) return []
    
    const errors: string[] = []
    
    for (const rule of rules) {
      // 必填验证
      if (rule.required && (!value || value.toString().trim() === '')) {
        errors.push(`${getFieldDisplayName(fieldName)}为必填项`)
        continue
      }
      
      // 如果值为空且不是必填，跳过其他验证
      if (!value || value.toString().trim() === '') {
        continue
      }
      
      const stringValue = value.toString()
      
      // 最小长度验证
      if (rule.minLength && stringValue.length < rule.minLength) {
        errors.push(`${getFieldDisplayName(fieldName)}至少需要${rule.minLength}个字符`)
      }
      
      // 最大长度验证
      if (rule.maxLength && stringValue.length > rule.maxLength) {
        errors.push(`${getFieldDisplayName(fieldName)}不能超过${rule.maxLength}个字符`)
      }
      
      // 正则验证
      if (rule.pattern && !rule.pattern.test(stringValue)) {
        errors.push(`${getFieldDisplayName(fieldName)}格式不正确`)
      }
      
      // 自定义验证
      if (rule.custom) {
        const result = rule.custom(value)
        if (result !== true) {
          errors.push(typeof result === 'string' ? result : `${getFieldDisplayName(fieldName)}验证失败`)
        }
      }
    }
    
    return errors
  }

  // 验证整个表单
  const validateForm = (formData: any): boolean => {
    const newErrors: ValidationErrors = {}
    let hasErrors = false
    
    // 验证所有定义了规则的字段
    for (const fieldName of Object.keys(validationRules)) {
      const fieldErrors = validateField(fieldName, formData[fieldName])
      if (fieldErrors.length > 0) {
        newErrors[fieldName] = fieldErrors
        hasErrors = true
      }
    }
    
    validationErrors.value = newErrors
    return !hasErrors
  }

  // 验证特定字段并更新错误状态
  const validateSingleField = (fieldName: string, value: any): boolean => {
    const fieldErrors = validateField(fieldName, value)
    
    if (fieldErrors.length > 0) {
      validationErrors.value = {
        ...validationErrors.value,
        [fieldName]: fieldErrors
      }
      return false
    } else {
      // 移除该字段的错误
      const newErrors = { ...validationErrors.value }
      delete newErrors[fieldName]
      validationErrors.value = newErrors
      return true
    }
  }

  // 清除所有验证错误
  const clearValidationErrors = () => {
    validationErrors.value = {}
  }

  // 清除特定字段的验证错误
  const clearFieldErrors = (fieldName: string) => {
    const newErrors = { ...validationErrors.value }
    delete newErrors[fieldName]
    validationErrors.value = newErrors
  }

  // 获取字段显示名称
  const getFieldDisplayName = (fieldName: string): string => {
    const displayNames: { [key: string]: string } = {
      name: '机器人名称',
      username: '用户名',
      token: 'Token',
      description: '描述',
      short_description: '简短描述',
      webhook_url: 'Webhook URL',
      webhook_secret: 'Webhook 密钥',
      max_connections: '最大连接数',
      welcome_message: '欢迎消息',
      help_message: '帮助消息'
    }
    return displayNames[fieldName] || fieldName
  }

  // 检查字段是否有错误
  const hasFieldError = (fieldName: string): boolean => {
    return !!(validationErrors.value[fieldName] && validationErrors.value[fieldName].length > 0)
  }

  // 获取字段错误信息
  const getFieldErrors = (fieldName: string): string[] => {
    return validationErrors.value[fieldName] || []
  }

  // 计算属性：表单是否有效
  const isValid = computed(() => {
    return Object.keys(validationErrors.value).length === 0
  })

  // 计算属性：错误总数
  const errorCount = computed(() => {
    return Object.values(validationErrors.value).reduce((count, errors) => count + errors.length, 0)
  })

  return {
    validationErrors,
    validationRules,
    validateField,
    validateForm,
    validateSingleField,
    clearValidationErrors,
    clearFieldErrors,
    hasFieldError,
    getFieldErrors,
    getFieldDisplayName,
    isValid,
    errorCount
  }
}
