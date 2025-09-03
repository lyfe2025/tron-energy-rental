/**
 * 基础设置管理组合式函数
 * 从 useSettings.ts 中分离的基础设置逻辑
 */

import { reactive } from 'vue'

export interface BasicSettings {
  systemName: string
  systemDescription: string
  contactEmail: string
  supportPhone: string
  timezone: string
  language: string
  currency: string
  dateFormat: string
}

export function useBasicSettings() {
  const basicSettings = reactive<BasicSettings>({
    systemName: 'TRON能量租赁系统',
    systemDescription: '专业的TRON网络能量和带宽租赁服务平台',
    contactEmail: 'support@tron-energy.com',
    supportPhone: '+86-400-123-4567',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
    currency: 'CNY',
    dateFormat: 'YYYY-MM-DD'
  })

  const updateBasicSetting = (key: keyof BasicSettings, value: any) => {
    basicSettings[key] = value
  }

  const resetBasicSettings = () => {
    Object.assign(basicSettings, {
      systemName: 'TRON能量租赁系统',
      systemDescription: '专业的TRON网络能量和带宽租赁服务平台',
      contactEmail: 'support@tron-energy.com',
      supportPhone: '+86-400-123-4567',
      timezone: 'Asia/Shanghai',
      language: 'zh-CN',
      currency: 'CNY',
      dateFormat: 'YYYY-MM-DD'
    })
  }

  return {
    basicSettings,
    updateBasicSetting,
    resetBasicSettings
  }
}
