/**
 * 安全设置管理组合式函数
 * 从 useSettings.ts 中分离的安全设置逻辑
 */

import { reactive } from 'vue'

export interface SecuritySettings {
  enableTwoFactor: boolean
  sessionTimeout: number
  passwordMinLength: number
  maxLoginAttempts: number
  loginLockoutMinutes: number
  passwordExpireDays: number
  jwtExpireHours: number
  enableIpWhitelist: boolean
  ipWhitelist: string[]
  enableApiRateLimit: boolean
  apiRateLimit: number
}

export function useSecuritySettings() {
  const securitySettings = reactive<SecuritySettings>({
    enableTwoFactor: false,
    sessionTimeout: 30,
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    loginLockoutMinutes: 15,
    passwordExpireDays: 90,
    jwtExpireHours: 24,
    enableIpWhitelist: false,
    ipWhitelist: [],
    enableApiRateLimit: true,
    apiRateLimit: 1000
  })

  const updateSecuritySetting = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    securitySettings[key] = value
  }

  const addIpToWhitelist = (ip: string) => {
    if (!securitySettings.ipWhitelist.includes(ip)) {
      securitySettings.ipWhitelist.push(ip)
    }
  }

  const removeIpFromWhitelist = (ip: string) => {
    const index = securitySettings.ipWhitelist.indexOf(ip)
    if (index > -1) {
      securitySettings.ipWhitelist.splice(index, 1)
    }
  }

  const resetSecuritySettings = () => {
    Object.assign(securitySettings, {
      enableTwoFactor: false,
      sessionTimeout: 30,
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      loginLockoutMinutes: 15,
      passwordExpireDays: 90,
      jwtExpireHours: 24,
      enableIpWhitelist: false,
      ipWhitelist: [],
      enableApiRateLimit: true,
      apiRateLimit: 1000
    })
  }

  return {
    securitySettings,
    updateSecuritySetting,
    addIpToWhitelist,
    removeIpFromWhitelist,
    resetSecuritySettings
  }
}
