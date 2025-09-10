<template>
  <div class="system-notification-panel">
    <div class="panel-header mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span class="text-2xl">⚙️</span>
            系统通知配置
          </h3>
          <p class="text-gray-600 text-sm mt-1">配置系统维护、异常警告等重要系统通知</p>
        </div>
        <el-switch 
          :model-value="config.enabled"
          @change="$emit('update:modelValue', { ...config, enabled: $event })"
          active-text="已启用"
          inactive-text="已禁用"
          size="large"
          active-color="#3B82F6"
          inactive-color="#E5E7EB"
        />
      </div>
    </div>

    <!-- 通知配置区域 -->
    <el-collapse v-model="activeNames" class="notification-collapse">
      
      <MaintenanceSettings 
        :config="config"
        @save="$emit('save')"
      />

      <AlertSettings 
        :config="config"
        @save="$emit('save')"
      />

      <ReportSettings 
        :config="config"
        @save="$emit('save')"
      />

    </el-collapse>

    <!-- 快速发送区域 -->
    <QuickSendActions 
      @send-maintenance="$emit('send-maintenance')"
      @send-alert="$emit('send-alert')"
      @send-announcement="$emit('send-announcement')"
      @send-report="$emit('send-report')"
    />

    <!-- 系统状态监控 -->
    <SystemStatusMonitor />

    <!-- 配置预览 -->
    <ConfigPreview :config="config" />

  </div>
</template>

<script setup lang="ts">
import type { SystemNotificationConfig } from '@/types/notification'
import { useSystemNotification } from './composables/useSystemNotification'

// 组件导入
import AlertSettings from './components/AlertSettings.vue'
import ConfigPreview from './components/ConfigPreview.vue'
import MaintenanceSettings from './components/MaintenanceSettings.vue'
import QuickSendActions from './components/QuickSendActions.vue'
import ReportSettings from './components/ReportSettings.vue'
import SystemStatusMonitor from './components/SystemStatusMonitor.vue'

interface Props {
  modelValue: SystemNotificationConfig
  botId: string
}

interface Emits {
  (e: 'update:modelValue', value: SystemNotificationConfig): void
  (e: 'save'): void
  (e: 'send-maintenance'): void
  (e: 'send-alert'): void
  (e: 'send-announcement'): void
  (e: 'send-report'): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// 使用系统通知逻辑
const { activeNames } = useSystemNotification(props.modelValue)

// 计算属性
const config = props.modelValue
</script>

<style scoped>
.system-notification-panel {
  @apply min-h-full;
}

:deep(.notification-collapse) {
  @apply bg-transparent border-0;
}

:deep(.notification-collapse .el-collapse-item) {
  @apply bg-white border border-gray-200 rounded-lg mb-4 shadow-sm;
}

:deep(.notification-collapse .el-collapse-item__header) {
  @apply bg-gray-50 text-gray-900 px-6 py-4 text-lg font-semibold border-0 rounded-t-lg hover:bg-gray-100 transition-colors;
}

:deep(.notification-collapse .el-collapse-item__content) {
  @apply bg-white border-0 px-6 pb-6;
}

:deep(.notification-collapse .el-collapse-item.is-active .el-collapse-item__header) {
  @apply border-b border-gray-200 bg-blue-50;
}

/* 通知项样式 */
:deep(.notification-item) {
  @apply bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow;
}

:deep(.item-header) {
  @apply flex items-center justify-between mb-4;
}

:deep(.item-title) {
  @apply text-gray-900 font-semibold text-base block;
}

:deep(.item-description) {
  @apply text-gray-600 text-sm mt-1;
}

/* 表单样式 */
:deep(.el-form-item__label) {
  @apply text-gray-700 font-medium;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

:deep(.el-checkbox__label) {
  @apply text-gray-700;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-blue-600 border-blue-600;
}

/* 开关样式 */
:deep(.el-switch.is-checked .el-switch__core) {
  @apply bg-blue-600 border-blue-600;
}

/* 按钮样式 */
:deep(.el-button) {
  @apply rounded-lg font-medium transition-all duration-200;
}

:deep(.el-button--primary) {
  @apply bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 shadow-sm hover:shadow-md;
}

/* 卡片阴影效果 */
.system-notification-panel .bg-white {
  @apply shadow-sm hover:shadow-md transition-shadow duration-200;
}
</style>
