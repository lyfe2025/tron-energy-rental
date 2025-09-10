<template>
  <div class="system-status-monitor mt-6">
    <el-card>
      <template #header>
        <span class="text-gray-900 font-semibold">🖥️ 系统状态监控</span>
      </template>
      <div class="status-grid">
        <div v-for="service in systemServices" :key="service.name" class="status-item">
          <div class="status-header">
            <span class="status-icon" :class="service.status">{{ service.icon }}</span>
            <span class="status-name">{{ service.name }}</span>
          </div>
          <div class="status-details">
            <div class="status-indicator" :class="service.status">
              {{ service.statusText }}
            </div>
            <div class="status-uptime">
              运行时间: {{ service.uptime }}
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 系统服务状态
const systemServices = ref([
  {
    name: 'API服务',
    icon: '🔧',
    status: 'online',
    statusText: '正常运行',
    uptime: '23天 4小时'
  },
  {
    name: '数据库',
    icon: '🗄️',
    status: 'online',
    statusText: '正常运行',
    uptime: '23天 4小时'
  },
  {
    name: '机器人服务',
    icon: '🤖',
    status: 'online',
    statusText: '正常运行',
    uptime: '15天 12小时'
  },
  {
    name: '支付网关',
    icon: '💳',
    status: 'warning',
    statusText: '延迟较高',
    uptime: '23天 4小时'
  }
])
</script>

<style scoped>
.system-status-monitor :deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm;
}

.system-status-monitor :deep(.el-card__header) {
  @apply bg-gray-800 border-gray-700;
}

.status-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.status-item {
  @apply bg-gray-800 rounded-lg p-4 border border-gray-700;
}

.status-header {
  @apply flex items-center gap-2 mb-3;
}

.status-icon {
  @apply text-xl;
}

.status-icon.online {
  @apply text-green-400;
}

.status-icon.warning {
  @apply text-yellow-400;
}

.status-icon.error {
  @apply text-red-400;
}

.status-name {
  @apply text-gray-900 font-semibold;
}

.status-details {
  @apply space-y-1;
}

.status-indicator {
  @apply text-sm font-medium;
}

.status-indicator.online {
  @apply text-green-400;
}

.status-indicator.warning {
  @apply text-yellow-400;
}

.status-indicator.error {
  @apply text-red-400;
}

.status-uptime {
  @apply text-gray-400 text-xs;
}
</style>
