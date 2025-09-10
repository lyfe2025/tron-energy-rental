import type { SystemNotificationConfig } from '@/types/notification'
import { computed, ref } from 'vue'

export function useSystemNotification(config: SystemNotificationConfig) {
  const activeNames = ref(['maintenance', 'alerts', 'reports'])

  // 计算属性
  const enabledCount = computed(() => {
    const notifications = [
      config.maintenance_notice,
      config.maintenance_start,
      config.maintenance_complete,
      config.system_alert,
      config.security_warning,
      config.daily_report
    ]
    return notifications.filter(n => n.enabled).length
  })

  const totalCount = computed(() => 6)

  const autoTriggerCount = computed(() => {
    const autoNotifications = [
      config.system_alert,
      config.security_warning,
      config.daily_report
    ]
    return autoNotifications.filter(n => n.enabled).length
  })

  const manualTriggerCount = computed(() => {
    const manualNotifications = [
      config.maintenance_notice,
      config.maintenance_start,
      config.maintenance_complete
    ]
    return manualNotifications.filter(n => n.enabled).length
  })

  return {
    activeNames,
    enabledCount,
    totalCount,
    autoTriggerCount,
    manualTriggerCount
  }
}
