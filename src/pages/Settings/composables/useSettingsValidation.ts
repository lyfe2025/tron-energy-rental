/**
 * 设置验证管理组合式函数
 * 从 useSettings.ts 中分离的验证逻辑
 */

import type { SystemSettings } from '../types/settings.types'

export function useSettingsValidation() {
  // 验证邮箱格式
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 验证手机号格式
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^(\+\d{1,3}[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}$/
    return phoneRegex.test(phone)
  }

  // 验证IP地址格式
  const validateIpAddress = (ip: string): boolean => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(ip)
  }

  // 验证数字范围
  const validateNumberRange = (value: number, min: number, max: number): boolean => {
    return !isNaN(value) && value >= min && value <= max
  }

  // 验证必填字段
  const validateRequired = (value: any): boolean => {
    if (typeof value === 'string') {
      return value.trim().length > 0
    }
    return value !== null && value !== undefined
  }

  // 验证设置表单
  const validateSettingsForm = (settings: Partial<SystemSettings>, tabId: string): string[] => {
    const errors: string[] = []

    switch (tabId) {
      case 'basic':
        if (settings.basic) {
          if (!validateRequired(settings.basic.systemName)) {
            errors.push('系统名称不能为空')
          }
          if (!validateRequired(settings.basic.contactEmail)) {
            errors.push('联系邮箱不能为空')
          } else if (!validateEmail(settings.basic.contactEmail)) {
            errors.push('联系邮箱格式不正确')
          }
          if (settings.basic.supportPhone && !validatePhone(settings.basic.supportPhone)) {
            errors.push('支持电话格式不正确')
          }
        }
        break

      case 'security':
        if (settings.security) {
          if (!validateNumberRange(settings.security.sessionTimeout, 5, 1440)) {
            errors.push('会话超时时间必须在5-1440分钟之间')
          }
          if (!validateNumberRange(settings.security.passwordMinLength, 6, 20)) {
            errors.push('密码最小长度必须在6-20位之间')
          }
          if (!validateNumberRange(settings.security.maxLoginAttempts, 3, 10)) {
            errors.push('最大登录尝试次数必须在3-10次之间')
          }
          if (settings.security.ipWhitelist) {
            for (const ip of settings.security.ipWhitelist) {
              if (!validateIpAddress(ip)) {
                errors.push(`IP地址 ${ip} 格式不正确`)
              }
            }
          }
        }
        break

      case 'pricing':
        if (settings.pricing) {
          if (settings.pricing.energyBasePrice <= 0) {
            errors.push('能量基础价格必须大于0')
          }
          if (settings.pricing.bandwidthBasePrice <= 0) {
            errors.push('带宽基础价格必须大于0')
          }
          if (!validateNumberRange(settings.pricing.emergencyFeeMultiplier, 1, 5)) {
            errors.push('紧急费用倍数必须在1-5之间')
          }
        }
        break

      case 'advanced':
        if (settings.advanced) {
          if (!validateNumberRange(settings.advanced.redisTtlSeconds, 60, 86400)) {
            errors.push('Redis TTL必须在60-86400秒之间')
          }
          if (!validateNumberRange(settings.advanced.logRetentionDays, 1, 365)) {
            errors.push('日志保留天数必须在1-365天之间')
          }
        }
        break
    }

    return errors
  }

  return {
    validateEmail,
    validatePhone,
    validateIpAddress,
    validateNumberRange,
    validateRequired,
    validateSettingsForm
  }
}
