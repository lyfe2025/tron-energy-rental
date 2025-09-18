/**
 * 范围显示工具函数
 */

import type { ValidationRule } from '../types/resource-consumption.types'

/**
 * 格式化配置项的范围信息显示
 */
export function formatConfigRange(fieldKey: string, validationRules?: Record<string, ValidationRule>): string {
  const rule = validationRules?.[fieldKey]
  if (!rule || !rule.min || !rule.max) {
    return ''
  }

  // 根据字段类型决定单位
  const unit = getFieldUnit(fieldKey)
  const { min, max } = rule

  if (fieldKey.includes('percentage')) {
    return `范围：${min}% - ${max}%`
  } else if (fieldKey.includes('energy')) {
    return `范围：${min.toLocaleString()} - ${max.toLocaleString()} ${unit}`
  } else if (fieldKey.includes('bandwidth')) {
    return `范围：${min} - ${max} ${unit}`
  } else {
    return `范围：${min} - ${max} ${unit}`
  }
}

/**
 * 获取配置项的单位
 */
export function getFieldUnit(fieldKey: string): string {
  if (fieldKey.includes('percentage')) {
    return ''
  } else if (fieldKey.includes('energy')) {
    return '能量'
  } else if (fieldKey.includes('bandwidth')) {
    return 'bytes'
  } else if (fieldKey.includes('limit')) {
    return 'bytes'
  }
  return ''
}

/**
 * 获取输入框的最小值
 */
export function getFieldMin(fieldKey: string, validationRules?: Record<string, ValidationRule>): number | undefined {
  return validationRules?.[fieldKey]?.min
}

/**
 * 获取输入框的最大值
 */
export function getFieldMax(fieldKey: string, validationRules?: Record<string, ValidationRule>): number | undefined {
  return validationRules?.[fieldKey]?.max
}

/**
 * 获取输入框的步长
 */
export function getFieldStep(fieldKey: string): number {
  if (fieldKey.includes('percentage')) {
    return 1
  } else if (fieldKey.includes('energy')) {
    return 100
  } else if (fieldKey.includes('bandwidth')) {
    return 10
  } else if (fieldKey.includes('account_create')) {
    return 50
  } else if (fieldKey.includes('limit')) {
    return 100
  }
  return 1
}
