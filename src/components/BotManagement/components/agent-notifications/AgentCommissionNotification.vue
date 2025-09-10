<template>
  <el-collapse-item title="💰 佣金通知" name="commission">
    <div class="notification-group">
      
      <!-- 佣金到账通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">佣金到账通知</span>
            <p class="item-description">下级用户消费产生佣金时发送通知</p>
          </div>
          <el-switch 
            v-model="config.commission_earned.enabled"
            active-color="#3B82F6"
            inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.commission_earned.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="最小金额阈值">
                <el-input-number 
                  v-model="config.commission_earned.min_amount"
                  :min="0.1" :max="100" :step="0.1"
                  controls-position="right"
                  class="w-full"
                />
                <span class="ml-2 text-gray-400">TRX</span>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="包含订单详情">
                <el-switch 
                  v-model="commissionIncludeDetails" 
                  active-color="#3B82F6"
            inactive-color="#E5E7EB"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-alert
            title="佣金计算说明"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #default>
              低于阈值的佣金将累积到下次通知一起发送
            </template>
          </el-alert>
        </div>
      </div>

      <el-divider />

      <!-- 提现成功通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">提现成功通知</span>
            <p class="item-description">佣金提现完成后发送确认通知</p>
          </div>
          <el-switch 
            v-model="config.withdrawal_completed.enabled"
            active-color="#3B82F6"
            inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.withdrawal_completed.enabled">
          <el-alert
            title="提现通知内容"
            type="success"
            :closable="false"
            show-icon
          >
            <template #default>
              包含提现金额、手续费、到账时间、交易哈希等信息
            </template>
          </el-alert>
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
const commissionIncludeDetails = ref(true)

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

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

:deep(.el-input-number .el-input__inner) {
  @apply text-center;
}

:deep(.el-alert) {
  @apply bg-blue-50 border-blue-200;
}

:deep(.el-alert__title),
:deep(.el-alert__description) {
  @apply text-gray-300;
}
</style>
