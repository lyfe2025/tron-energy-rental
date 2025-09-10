<template>
  <div class="metrics-cards mb-6">
    <el-row :gutter="20">
      
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon">📨</div>
            <div class="metric-info">
              <div class="metric-value">{{ formatNumber(metrics.totalSent) }}</div>
              <div class="metric-label">总发送量</div>
              <div class="metric-change" :class="getChangeClass(metrics.sentChange)">
                {{ formatChange(metrics.sentChange) }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon">✅</div>
            <div class="metric-info">
              <div class="metric-value">{{ metrics.successRate }}%</div>
              <div class="metric-label">成功率</div>
              <div class="metric-change" :class="getChangeClass(metrics.successRateChange)">
                {{ formatChange(metrics.successRateChange) }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon">👥</div>
            <div class="metric-info">
              <div class="metric-value">{{ formatNumber(metrics.activeUsers) }}</div>
              <div class="metric-label">活跃用户</div>
              <div class="metric-change" :class="getChangeClass(metrics.activeUsersChange)">
                {{ formatChange(metrics.activeUsersChange) }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon">⚡</div>
            <div class="metric-info">
              <div class="metric-value">{{ metrics.avgResponseTime }}ms</div>
              <div class="metric-label">平均响应时间</div>
              <div class="metric-change" :class="getChangeClass(-metrics.responseTimeChange)">
                {{ formatChange(metrics.responseTimeChange) }}ms
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
    </el-row>
  </div>
</template>

<script setup lang="ts">
import type { Metrics } from '../types/analytics.types';

interface Props {
  metrics: Metrics
}

defineProps<Props>()

// 工具函数
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

const formatChange = (change: number) => {
  const sign = change > 0 ? '+' : ''
  return `${sign}${change}`
}

const getChangeClass = (change: number) => {
  return change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
}
</script>

<style scoped>
:deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow;
}

.metric-card {
  @apply h-32;
}

.metric-content {
  @apply flex items-center h-full;
}

.metric-icon {
  @apply text-4xl mr-4;
}

.metric-info {
  @apply flex-1;
}

.metric-value {
  @apply text-2xl font-bold text-gray-900;
}

.metric-label {
  @apply text-gray-600 text-sm;
}

.metric-change {
  @apply text-sm font-medium;
}

/* 变化指示器颜色优化 */
.text-green-400 {
  @apply text-green-600;
}

.text-red-400 {
  @apply text-red-600;
}

.text-gray-400 {
  @apply text-gray-500;
}
</style>
