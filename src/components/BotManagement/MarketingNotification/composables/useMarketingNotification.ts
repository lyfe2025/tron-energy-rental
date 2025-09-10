import type { MarketingNotificationConfig } from '@/types/notification'
import { computed, ref } from 'vue'

export function useMarketingNotification(config: MarketingNotificationConfig) {
  const activeNames = ref(['feature', 'reactivation', 'survey'])

  // 统计信息
const enabledCount = computed(() => {
    const notifications = [
      config.new_feature,
      config.user_reactivation,
      config.satisfaction_survey,
      config.birthday_greeting,
      config.vip_exclusive
    ]
    return notifications.filter(n => n.enabled).length
  })

  const totalCount = computed(() => 5)

  return {
    activeNames,
    enabledCount,
    totalCount
  }
}
