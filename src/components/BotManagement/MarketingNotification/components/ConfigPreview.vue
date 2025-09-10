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
          <div class="stat-value">{{ Math.round((enabledCount / totalCount) * 100) }}%</div>
          <div class="stat-label">启用率</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ config.enabled ? '✅' : '❌' }}</div>
          <div class="stat-label">模块状态</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import type { MarketingNotificationConfig } from '@/types/notification';
import { computed } from 'vue';

interface Props {
  config: MarketingNotificationConfig
}

const props = defineProps<Props>()

// 统计信息
const enabledCount = computed(() => {
  const notifications = [
    props.config.new_feature,
    props.config.user_reactivation,
    props.config.satisfaction_survey,
    props.config.birthday_greeting,
    props.config.vip_exclusive
  ]
  return notifications.filter(n => n.enabled).length
})

const totalCount = computed(() => 5)
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
