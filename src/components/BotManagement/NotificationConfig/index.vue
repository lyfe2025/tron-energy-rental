<template>
  <div class="notification-config-panel p-6">
    <!-- 页面头部 -->
    <ConfigHeader 
      :loading="loading"
      @refresh="refreshConfig"
      @export="exportConfig"
    />

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">正在加载通知配置...</p>
      </div>
    </div>

    <!-- 主要配置区域 -->
    <div v-else class="space-y-6">
      <!-- 通知功能总开关 -->
      <GlobalSwitch 
        v-model:enabled="config.enabled"
        @update:enabled="saveConfig"
      />

      <!-- 配置选项卡 -->
      <ConfigTabs 
        :config="config"
        :bot-id="botId"
        @save="saveConfig"
        @refresh="refreshConfig"
        @show-manual-dialog="showManualDialog = true"
      />

      <!-- 底部操作栏 -->
      <BottomActions 
        :enabled="config.enabled"
        :saving="saving"
        @save="saveConfig"
        @reset="resetConfig"
      />
    </div>

    <!-- 手动发送通知对话框 -->
    <ManualNotificationDialog
      v-model="showManualDialog"
      :bot-id="botId"
      @notification-sent="handleNotificationSent"
    />

    <!-- 配置导入对话框 -->
    <ImportDialog
      v-model:visible="showImportDialog"
      @import-config="importConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useNotificationConfig } from './composables/useNotificationConfig'

// 组件导入
import ManualNotificationDialog from '../components/ManualNotificationDialog.vue'
import BottomActions from './components/BottomActions.vue'
import ConfigHeader from './components/ConfigHeader.vue'
import ConfigTabs from './components/ConfigTabs.vue'
import GlobalSwitch from './components/GlobalSwitch.vue'
import ImportDialog from './components/ImportDialog.vue'

// 接口类型定义
interface Props {
  botId: string
}

const props = defineProps<Props>()

// 使用配置管理逻辑
const {
  loading,
  saving,
  showManualDialog,
  showImportDialog,
  config,
  loadConfig,
  saveConfig,
  exportConfig,
  importConfig,
  resetConfig,
  handleNotificationSent
} = useNotificationConfig(props.botId)

// 刷新配置
const refreshConfig = () => {
  loadConfig();
}

// 生命周期
onMounted(() => {
  loadConfig()
})

// 监听botId变化
watch(() => props.botId, () => {
  if (props.botId) {
    loadConfig()
  }
})
</script>

<style scoped>
/* 按钮样式优化 */
.notification-config-panel :deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.notification-config-panel :deep(.el-button--primary) {
  background: #3b82f6;
  border-color: #3b82f6;
}

.notification-config-panel :deep(.el-button--primary:hover) {
  background: #2563eb;
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* 开关样式 */
.notification-config-panel :deep(.el-switch.is-checked .el-switch__core) {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

/* 卡片阴影效果 */
.notification-config-panel .bg-white {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.notification-config-panel .bg-white:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease;
}

/* 渐变背景 */
.bg-gradient-to-r {
  background: linear-gradient(to right, #eff6ff, #e0e7ff);
}

.bg-gradient-to-br {
  background: linear-gradient(to bottom right, #eff6ff, #e0e7ff);
}

/* 响应式优化 */
@media (max-width: 640px) {
  .notification-config-panel {
    padding: 16px;
  }
}

/* 加载动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
