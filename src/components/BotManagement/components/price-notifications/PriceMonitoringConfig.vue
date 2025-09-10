<template>
  <div class="price-monitoring-config">
    <el-card>
      <template #header>
        <span class="text-gray-900 font-semibold">📊 价格监控设置</span>
      </template>
      <div class="monitoring-grid">
        <div class="monitoring-item">
          <div class="monitoring-header">
            <span class="monitoring-icon">📈</span>
            <span class="monitoring-title">实时监控</span>
          </div>
          <div class="monitoring-details">
            <el-switch 
              v-model="realTimeMonitoring" 
              active-color="#3B82F6"
              inactive-color="#E5E7EB"
              active-text="已启用"
              inactive-text="已禁用"
            />
            <p class="monitoring-desc">每5分钟检查价格变动</p>
          </div>
        </div>
        
        <div class="monitoring-item">
          <div class="monitoring-header">
            <span class="monitoring-icon">⏰</span>
            <span class="monitoring-title">定时报告</span>
          </div>
          <div class="monitoring-details">
            <el-select v-model="dailyReportTime" placeholder="选择时间" class="w-full">
              <el-option label="上午 9:00" value="09:00" />
              <el-option label="中午 12:00" value="12:00" />
              <el-option label="下午 18:00" value="18:00" />
              <el-option label="晚上 21:00" value="21:00" />
            </el-select>
            <p class="monitoring-desc">每日价格走势汇总</p>
          </div>
        </div>
        
        <div class="monitoring-item">
          <div class="monitoring-header">
            <span class="monitoring-icon">🎯</span>
            <span class="monitoring-title">目标价格</span>
          </div>
          <div class="monitoring-details">
            <el-input-number 
              v-model="targetPrice"
              :min="0.01" :max="10" :step="0.01"
              controls-position="right"
              class="w-full"
            />
            <p class="monitoring-desc">价格目标提醒 (TRX)</p>
          </div>
        </div>
        
        <div class="monitoring-item">
          <div class="monitoring-header">
            <span class="monitoring-icon">📱</span>
            <span class="monitoring-title">推送策略</span>
          </div>
          <div class="monitoring-details">
            <el-select v-model="pushStrategy" placeholder="选择策略" class="w-full">
              <el-option label="立即推送" value="immediate" />
              <el-option label="智能时间" value="smart" />
              <el-option label="批量推送" value="batch" />
            </el-select>
            <p class="monitoring-desc">通知发送时机控制</p>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 响应式数据
const realTimeMonitoring = ref(true)
const dailyReportTime = ref('09:00')
const targetPrice = ref(2.5)
const pushStrategy = ref('smart')
</script>

<style scoped>
.price-monitoring-config :deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm;
}

.price-monitoring-config :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.monitoring-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.monitoring-item {
  @apply bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow;
}

.monitoring-header {
  @apply flex items-center gap-2 mb-3;
}

.monitoring-icon {
  @apply text-xl;
}

.monitoring-title {
  @apply text-gray-900 font-semibold;
}

.monitoring-details {
  @apply space-y-2;
}

.monitoring-desc {
  @apply text-gray-400 text-xs;
}

:deep(.el-select .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500;
}

:deep(.el-input-number .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500;
}
</style>
