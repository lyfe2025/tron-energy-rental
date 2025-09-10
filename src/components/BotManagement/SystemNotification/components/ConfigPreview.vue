<template>
  <div class="config-preview mt-6">
    <el-card>
      <template #header>
        <span class="text-gray-900">📊 配置概览</span>
      </template>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat-item">
          <div class="stat-value">{{ enabledCount }}</div>
          <div class="stat-label">已启用通知</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ totalCount }}</div>
          <div class="stat-label">总通知数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ autoTriggerCount }}</div>
          <div class="stat-label">自动触发</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ manualTriggerCount }}</div>
          <div class="stat-label">手动触发</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import type { SystemNotificationConfig } from '@/types/notification';
import { computed } from 'vue';

interface Props {
  config: SystemNotificationConfig
}

const props = defineProps<Props>()

// 统计信息
const enabledCount = computed(() => {
  const notifications = [
    props.config.maintenance_notice,
    props.config.maintenance_start,
    props.config.maintenance_complete,
    props.config.system_alert,
    props.config.security_warning,
    props.config.daily_report
  ]
  return notifications.filter(n => n.enabled).length
})

const totalCount = computed(() => 6)

const autoTriggerCount = computed(() => {
  const autoNotifications = [
    props.config.system_alert,
    props.config.security_warning,
    props.config.daily_report
  ]
  return autoNotifications.filter(n => n.enabled).length
})

const manualTriggerCount = computed(() => {
  const manualNotifications = [
    props.config.maintenance_notice,
    props.config.maintenance_start,
    props.config.maintenance_complete
  ]
  return manualNotifications.filter(n => n.enabled).length
})
</script>

<style scoped>
.config-preview :deep(.el-card) {
  @apply bg-white border-gray-200;
}

.config-preview :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.stat-item {
  @apply text-center p-3 bg-gray-50 rounded-lg;
}

.stat-value {
  @apply text-2xl font-bold text-green-400;
}

.stat-label {
  @apply text-sm text-gray-400 mt-1;
}
</style>
