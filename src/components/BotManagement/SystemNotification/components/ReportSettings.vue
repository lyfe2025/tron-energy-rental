<template>
  <el-collapse-item title="📊 报告通知" name="reports">
    <div class="notification-group">
      
      <!-- 每日数据报告 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">每日数据报告</span>
            <p class="item-description">每日23:59自动发送数据汇总</p>
            <div class="auto-trigger-badge">🤖 自动触发</div>
          </div>
          <el-switch 
            v-model="config.daily_report.enabled"
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.daily_report.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="仅管理员">
                <el-switch 
                  v-model="config.daily_report.admin_only" 
                  active-color="#00ff88"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="发送时间">
                <el-time-picker
                  v-model="dailyReportTime"
                  format="HH:mm"
                  value-format="HH:mm"
                  placeholder="选择时间"
                  class="w-full"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="报告内容">
            <el-checkbox-group v-model="dailyReportContent">
              <el-checkbox label="transaction_count">交易笔数</el-checkbox>
              <el-checkbox label="revenue_summary">收入汇总</el-checkbox>
              <el-checkbox label="user_activity">用户活跃度</el-checkbox>
              <el-checkbox label="error_statistics">错误统计</el-checkbox>
              <el-checkbox label="performance_metrics">性能指标</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </div>
      </div>

    </div>
  </el-collapse-item>
</template>

<script setup lang="ts">
import type { SystemNotificationConfig } from '@/types/notification';
import { ref } from 'vue';

interface Props {
  config: SystemNotificationConfig
}

interface Emits {
  (e: 'save'): void
}

defineProps<Props>()
defineEmits<Emits>()

// 配置选项
const dailyReportTime = ref('23:59')

// 报告内容配置
const dailyReportContent = ref(['transaction_count', 'revenue_summary', 'user_activity'])
</script>

<style scoped>
.notification-group {
  @apply space-y-4;
}

.notification-item {
  @apply bg-gray-800 rounded-lg p-4 border border-gray-700;
}

.item-header {
  @apply flex items-center justify-between mb-4;
}

.item-info {
  @apply flex-1;
}

.item-title {
  @apply text-gray-900 font-semibold text-base block;
}

.item-description {
  @apply text-gray-400 text-sm mt-1;
}

.auto-trigger-badge {
  @apply inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded mt-2;
}

.item-content {
  @apply mt-4 space-y-4;
}

:deep(.el-form-item__label) {
  @apply text-gray-300;
}

:deep(.el-time-picker .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500;
}

:deep(.el-checkbox__label) {
  @apply text-gray-300;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-green-600 border-green-600;
}
</style>
