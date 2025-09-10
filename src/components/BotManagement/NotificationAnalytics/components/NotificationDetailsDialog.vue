<template>
  <!-- 详情对话框 -->
  <el-dialog :model-value="visible" title="通知详细分析" width="80%" max-width="1200px" @update:model-value="$emit('update:visible', $event)">
    <div v-if="selectedNotification" class="notification-details">
      
      <!-- 基础信息 -->
      <div class="details-section mb-6">
        <h3 class="text-gray-900 mb-4">📋 基础信息</h3>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="通知类型">{{ selectedNotification.notification_type }}</el-descriptions-item>
          <el-descriptions-item label="总发送量">{{ selectedNotification.sent_count }}</el-descriptions-item>
          <el-descriptions-item label="成功率">{{ selectedNotification.success_rate }}%</el-descriptions-item>
          <el-descriptions-item label="平均响应时间">{{ selectedNotification.avg_response_time }}ms</el-descriptions-item>
          <el-descriptions-item label="点击率">{{ selectedNotification.click_rate }}%</el-descriptions-item>
          <el-descriptions-item label="最后发送">{{ formatDateTime(selectedNotification.last_sent) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      
      <!-- 趋势图表 -->
      <div class="details-section mb-6">
        <h3 class="text-gray-900 mb-4">📈 发送趋势</h3>
        <div ref="detailTrendChartRef" class="chart-container"></div>
      </div>
      
      <!-- 错误分析 -->
      <div class="details-section" v-if="notificationErrors.length > 0">
        <h3 class="text-gray-900 mb-4">⚠️ 错误分析</h3>
        <el-table :data="notificationErrors" style="width: 100%">
          <el-table-column prop="error_type" label="错误类型" width="200" />
          <el-table-column prop="error_count" label="错误次数" width="120" />
          <el-table-column prop="last_occurrence" label="最后发生时间" width="180" />
          <el-table-column prop="error_message" label="错误消息" />
        </el-table>
      </div>
      
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { DetailedStat, NotificationError } from '../types/analytics.types'

interface Props {
  visible: boolean
  selectedNotification: DetailedStat | null
  notificationErrors: NotificationError[]
  updateDetailTrendChart?: (data: any) => void
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const detailTrendChartRef = ref<HTMLElement>()

// 监听选中的通知变化，更新趋势图表
watch(() => props.selectedNotification, async (notification) => {
  if (notification && props.updateDetailTrendChart) {
    // 这里应该是父组件传入的趋势数据，或者在这里触发数据加载
    // 为了保持一致性，我们通过emit事件让父组件处理
  }
})

// 暴露图表引用给父组件
defineExpose({
  detailTrendChartRef
})

// 工具函数
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}
</script>

<style scoped>
.details-section {
  @apply mb-6;
}

.chart-container {
  @apply h-80;
}

:deep(.el-descriptions) {
  @apply bg-gray-50;
}

:deep(.el-descriptions__label) {
  @apply text-gray-700;
}

:deep(.el-descriptions__content) {
  @apply text-gray-900;
}

:deep(.el-dialog) {
  @apply bg-white border border-gray-200;
}

:deep(.el-dialog__header) {
  @apply bg-gray-50 border-b border-gray-200;
}

:deep(.el-dialog__title) {
  @apply text-gray-900;
}

:deep(.el-table) {
  @apply bg-white;
}

:deep(.el-table th) {
  @apply bg-gray-50 border-gray-200 text-gray-700;
}

:deep(.el-table td) {
  @apply bg-white border-gray-200;
}

:deep(.el-table tr:hover > td) {
  @apply bg-gray-50;
}
</style>
