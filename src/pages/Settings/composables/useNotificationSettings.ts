/**
 * 通知设置管理组合式函数
 * 从 useSettings.ts 中分离的通知设置逻辑
 */

import { reactive } from 'vue'

export interface NotificationSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  telegramNotifications: boolean
  systemAlerts: boolean
  orderUpdates: boolean
  lowBalanceAlert: boolean
  maintenanceNotifications: boolean
  weeklyReport: boolean
  monthlyReport: boolean
}

export function useNotificationSettings() {
  const notificationSettings = reactive<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    telegramNotifications: false,
    systemAlerts: true,
    orderUpdates: true,
    lowBalanceAlert: true,
    maintenanceNotifications: true,
    weeklyReport: true,
    monthlyReport: true
  })

  const updateNotificationSetting = (key: keyof NotificationSettings, value: boolean) => {
    notificationSettings[key] = value
  }

  const enableAllNotifications = () => {
    Object.keys(notificationSettings).forEach(key => {
      notificationSettings[key as keyof NotificationSettings] = true
    })
  }

  const disableAllNotifications = () => {
    Object.keys(notificationSettings).forEach(key => {
      notificationSettings[key as keyof NotificationSettings] = false
    })
  }

  const resetNotificationSettings = () => {
    Object.assign(notificationSettings, {
      emailNotifications: true,
      smsNotifications: false,
      telegramNotifications: false,
      systemAlerts: true,
      orderUpdates: true,
      lowBalanceAlert: true,
      maintenanceNotifications: true,
      weeklyReport: true,
      monthlyReport: true
    })
  }

  return {
    notificationSettings,
    updateNotificationSetting,
    enableAllNotifications,
    disableAllNotifications,
    resetNotificationSettings
  }
}
