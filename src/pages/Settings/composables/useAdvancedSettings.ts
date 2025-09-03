/**
 * 高级设置管理组合式函数
 * 从 useSettings.ts 中分离的高级设置逻辑
 */

import { reactive } from 'vue'

export interface AdvancedSettings {
  enableQueryCache: boolean
  redisTtlSeconds: number
  enableFileLog: boolean
  logLevel: string
  logRetentionDays: number
  enableCors: boolean
  enableEnergyTrading: boolean
  enableReferralSystem: boolean
  enableUserRegistration: boolean
  enableAgentApplication: boolean
}

export function useAdvancedSettings() {
  const advancedSettings = reactive<AdvancedSettings>({
    enableQueryCache: true,
    redisTtlSeconds: 3600,
    enableFileLog: true,
    logLevel: 'info',
    logRetentionDays: 30,
    enableCors: true,
    enableEnergyTrading: true,
    enableReferralSystem: true,
    enableUserRegistration: true,
    enableAgentApplication: true
  })

  const updateAdvancedSetting = <K extends keyof AdvancedSettings>(key: K, value: AdvancedSettings[K]) => {
    advancedSettings[key] = value
  }

  const getLogLevelOptions = () => [
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warning' },
    { value: 'error', label: 'Error' }
  ]

  const validateLogRetention = (days: number): boolean => {
    return days >= 1 && days <= 365
  }

  const validateRedisTtl = (seconds: number): boolean => {
    return seconds >= 60 && seconds <= 86400 // 1分钟到1天
  }

  const resetAdvancedSettings = () => {
    Object.assign(advancedSettings, {
      enableQueryCache: true,
      redisTtlSeconds: 3600,
      enableFileLog: true,
      logLevel: 'info',
      logRetentionDays: 30,
      enableCors: true,
      enableEnergyTrading: true,
      enableReferralSystem: true,
      enableUserRegistration: true,
      enableAgentApplication: true
    })
  }

  return {
    advancedSettings,
    updateAdvancedSetting,
    getLogLevelOptions,
    validateLogRetention,
    validateRedisTtl,
    resetAdvancedSettings
  }
}
