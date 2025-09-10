<template>
  <el-collapse-item title="📊 统计报告" name="reports">
    <div class="notification-group">
      
      <!-- 月度佣金统计通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">月度佣金统计通知</span>
            <p class="item-description">每月发送佣金收益汇总报告</p>
          </div>
          <el-switch 
            v-model="config.monthly_summary.enabled"
            active-color="#3B82F6"
            inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.monthly_summary.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="发送日期">
                <el-select v-model="config.monthly_summary.send_on_day" placeholder="选择发送日期" class="w-full">
                  <el-option label="每月1号" :value="1" />
                  <el-option label="每月5号" :value="5" />
                  <el-option label="每月10号" :value="10" />
                  <el-option label="每月15号" :value="15" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="包含图表">
                <el-switch 
                  v-model="monthlyIncludeChart" 
                  active-color="#3B82F6"
            inactive-color="#E5E7EB"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="统计内容">
            <el-checkbox-group v-model="monthlyReportContent">
              <el-checkbox label="total_commission">总佣金收入</el-checkbox>
              <el-checkbox label="referral_count">推荐用户数</el-checkbox>
              <el-checkbox label="order_count">订单数量</el-checkbox>
              <el-checkbox label="performance_ranking">业绩排名</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </div>
      </div>

    </div>
  </el-collapse-item>
</template>

<script setup lang="ts">
import type { AgentNotificationConfig } from '@/types/notification'
import { computed, ref } from 'vue'

interface Props {
  modelValue: AgentNotificationConfig
}

interface Emits {
  (e: 'update:modelValue', value: AgentNotificationConfig): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const monthlyIncludeChart = ref(true)
const monthlyReportContent = ref(['total_commission', 'referral_count', 'order_count'])

// 计算属性
const config = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<style scoped>
.notification-group {
  @apply space-y-4;
}

.notification-item {
  @apply bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow;
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

.item-content {
  @apply mt-4 space-y-4;
}

:deep(.el-form-item__label) {
  @apply text-gray-300;
}

:deep(.el-select .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500;
}

:deep(.el-checkbox__label) {
  @apply text-gray-300;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-green-600 border-green-600;
}
</style>
