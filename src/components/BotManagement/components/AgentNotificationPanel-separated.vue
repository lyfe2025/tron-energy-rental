<template>
  <div class="agent-notification-panel">
    <div class="panel-header mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-gray-900">👥 代理通知配置</h3>
          <p class="text-gray-400 text-sm mt-1">配置代理申请、佣金、升级等代理业务相关通知</p>
        </div>
        <el-switch 
          v-model="config.enabled"
          active-text="已启用"
          inactive-text="已禁用"
          size="large"
          active-color="#3B82F6"
          inactive-color="#E5E7EB"
          @change="$emit('save')"
        />
      </div>
    </div>

    <!-- 代理通知配置 -->
    <el-collapse v-model="activeNames" class="notification-collapse">
      
      <!-- 代理申请通知 -->
      <AgentApplicationNotification
        v-model="config"
        @save="$emit('save')"
      />

      <!-- 佣金通知 -->
      <AgentCommissionNotification
        v-model="config"
        @save="$emit('save')"
      />

      <!-- 升级通知 -->
      <AgentUpgradeNotification
        v-model="config"
        @save="$emit('save')"
      />

      <!-- 统计报告 -->
      <AgentStatisticsReport
        v-model="config"
        @save="$emit('save')"
      />

    </el-collapse>

    <!-- 代理等级配置 -->
    <div class="mt-6">
      <AgentLevelsConfig />
    </div>

    <!-- 配置预览 -->
    <div class="mt-6">
      <AgentConfigPreview :model-value="config" />
    </div>

  </div>
</template>

<script setup lang="ts">
import type { AgentNotificationConfig } from '@/types/notification'
import { computed, ref } from 'vue'

// 导入分离的子组件
import AgentApplicationNotification from './agent-notifications/AgentApplicationNotification.vue'
import AgentCommissionNotification from './agent-notifications/AgentCommissionNotification.vue'
import AgentConfigPreview from './agent-notifications/AgentConfigPreview.vue'
import AgentLevelsConfig from './agent-notifications/AgentLevelsConfig.vue'
import AgentStatisticsReport from './agent-notifications/AgentStatisticsReport.vue'
import AgentUpgradeNotification from './agent-notifications/AgentUpgradeNotification.vue'

interface Props {
  modelValue: AgentNotificationConfig
  botId: string
}

interface Emits {
  (e: 'update:modelValue', value: AgentNotificationConfig): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const activeNames = ref(['application', 'commission', 'upgrade', 'reports'])

// 计算属性
const config = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<style scoped>
.agent-notification-panel {
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
  @apply border-b border-gray-700;
}
</style>
