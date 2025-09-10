<template>
  <el-collapse-item title="📝 代理申请通知" name="application">
    <div class="notification-group">
      
      <!-- 代理申请提交通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">代理申请提交通知</span>
            <p class="item-description">用户提交代理申请后立即发送确认通知</p>
          </div>
          <el-switch 
            v-model="config.application_submitted.enabled" 
            active-color="#3B82F6"
              inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.application_submitted.enabled">
          <el-alert
            title="申请确认通知"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              包含申请状态、审核时间预期、联系方式等信息
            </template>
          </el-alert>
        </div>
      </div>

      <el-divider />

      <!-- 代理审核通过通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">代理审核通过通知</span>
            <p class="item-description">管理员审核通过后发送欢迎通知</p>
          </div>
          <el-switch 
            v-model="config.application_approved.enabled"
            active-color="#3B82F6"
              inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.application_approved.enabled">
          <el-form-item label="包含欢迎指南">
            <el-switch 
              v-model="config.application_approved.include_welcome_guide" 
              active-color="#3B82F6"
              inactive-color="#E5E7EB"
            />
            <div class="mt-2 text-sm text-gray-400">
              包含代理使用指南和常见问题解答
            </div>
          </el-form-item>
        </div>
      </div>

      <el-divider />

      <!-- 代理审核拒绝通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">代理审核拒绝通知</span>
            <p class="item-description">管理员审核拒绝后发送说明通知</p>
          </div>
          <el-switch 
            v-model="config.application_rejected.enabled"
            active-color="#3B82F6"
              inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.application_rejected.enabled">
          <el-form-item label="包含反馈信息">
            <el-switch 
              v-model="config.application_rejected.include_feedback" 
              active-color="#3B82F6"
              inactive-color="#E5E7EB"
            />
            <div class="mt-2 text-sm text-gray-400">
              包含拒绝原因和改进建议
            </div>
          </el-form-item>
        </div>
      </div>

    </div>
  </el-collapse-item>
</template>

<script setup lang="ts">
import type { AgentNotificationConfig } from '@/types/notification'
import { computed } from 'vue'

interface Props {
  modelValue: AgentNotificationConfig
}

interface Emits {
  (e: 'update:modelValue', value: AgentNotificationConfig): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

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

:deep(.el-alert) {
  @apply bg-blue-50 border-blue-200;
}

:deep(.el-alert__title),
:deep(.el-alert__description) {
  @apply text-gray-300;
}
</style>
