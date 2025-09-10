<template>
  <div class="config-preview">
    <el-card>
      <template #header>
        <span class="text-gray-900 font-semibold">📊 配置概览</span>
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
import type { AgentNotificationConfig } from '@/types/notification';
import { computed } from 'vue';

interface Props {
  modelValue: AgentNotificationConfig
}

const props = defineProps<Props>()

// 计算属性
const config = computed(() => props.modelValue)

// 统计信息
const enabledCount = computed(() => {
  const notifications = [
    config.value.application_submitted,
    config.value.application_approved,
    config.value.application_rejected,
    config.value.commission_earned,
    config.value.level_upgrade,
    config.value.withdrawal_completed,
    config.value.monthly_summary
  ]
  return notifications.filter(n => n.enabled).length
})

const totalCount = computed(() => 7)
</script>

<style scoped>
.config-preview :deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm;
}

.config-preview :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.stat-item {
  @apply text-center p-3 bg-blue-50 rounded-lg border border-blue-200;
}

.stat-value {
  @apply text-2xl font-bold text-green-400;
}

.stat-label {
  @apply text-sm text-gray-400 mt-1;
}
</style>
