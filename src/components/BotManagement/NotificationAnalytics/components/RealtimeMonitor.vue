<template>
  <div class="real-time-monitor mb-6">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="text-gray-900">🔴 实时监控</span>
          <el-switch 
            :model-value="realtimeEnabled"
            active-text="开启"
            inactive-text="关闭"
            @change="$emit('toggle-realtime', $event)"
          />
        </div>
      </template>
      
      <div class="monitor-content">
        <el-row :gutter="20">
          
          <el-col :span="8">
            <div class="monitor-item">
              <div class="monitor-title">当前队列</div>
              <div class="monitor-value">{{ realtimeData.queueSize }}</div>
              <div class="monitor-subtitle">待发送消息</div>
            </div>
          </el-col>
          
          <el-col :span="8">
            <div class="monitor-item">
              <div class="monitor-title">每分钟发送</div>
              <div class="monitor-value">{{ realtimeData.messagesPerMinute }}</div>
              <div class="monitor-subtitle">消息/分钟</div>
            </div>
          </el-col>
          
          <el-col :span="8">
            <div class="monitor-item">
              <div class="monitor-title">错误率</div>
              <div class="monitor-value text-red-400">{{ realtimeData.errorRate }}%</div>
              <div class="monitor-subtitle">最近15分钟</div>
            </div>
          </el-col>
          
        </el-row>
        
        <!-- 实时日志 -->
        <div class="realtime-logs mt-6">
          <h4 class="text-gray-900 mb-3">📝 实时发送日志</h4>
          <div class="logs-container">
            <div 
              v-for="log in realtimeLogs" 
              :key="log.id"
              class="log-item"
              :class="getLogClass(log.status)"
            >
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-type">{{ log.notification_type }}</span>
              <span class="log-status">{{ log.status }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import type { RealtimeData, RealtimeLog } from '../types/analytics.types'

interface Props {
  realtimeEnabled: boolean
  realtimeData: RealtimeData
  realtimeLogs: RealtimeLog[]
}

interface Emits {
  (e: 'toggle-realtime', enabled: boolean): void
}

defineProps<Props>()
defineEmits<Emits>()

// 工具函数
const getLogClass = (status: string) => {
  return {
    'log-success': status === 'success',
    'log-error': status === 'failed',
    'log-warning': status === 'pending'
  }
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN')
}
</script>

<style scoped>
:deep(.el-card) {
  @apply bg-white border-gray-200;
}

:deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.card-header {
  @apply flex items-center justify-between;
}

.monitor-item {
  @apply text-center p-4 bg-gray-50 rounded border border-gray-200;
}

.monitor-title {
  @apply text-gray-600 text-sm;
}

.monitor-value {
  @apply text-2xl font-bold text-gray-900 my-2;
}

.monitor-subtitle {
  @apply text-gray-500 text-xs;
}

.logs-container {
  @apply bg-gray-50 rounded p-4 h-64 overflow-y-auto;
}

.log-item {
  @apply flex items-center gap-4 py-1 text-sm;
}

.log-time {
  @apply text-gray-500 w-16;
}

.log-type {
  @apply text-blue-400 w-32;
}

.log-status {
  @apply w-16;
}

.log-success .log-status {
  @apply text-green-400;
}

.log-error .log-status {
  @apply text-red-400;
}

.log-warning .log-status {
  @apply text-yellow-400;
}

.log-message {
  @apply text-gray-700 flex-1;
}
</style>
