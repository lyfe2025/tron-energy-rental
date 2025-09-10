<template>
  <div class="notification-settings-panel">
    
    <!-- 全局设置 -->
    <GlobalSettings 
      :settings="globalSettings" 
      @global-toggle="handleGlobalToggle" 
    />

    <!-- 发送时间设置 -->
    <TimeSettings :settings="timeSettings" />

    <!-- 频率限制设置 -->
    <RateLimitSettings :settings="rateLimitSettings" />

    <!-- 用户群体设置 -->
    <AudienceSettings :settings="audienceSettings" />

    <!-- 高级设置 -->
    <AdvancedSettings 
      :settings="advancedSettings" 
      :priority-config="priorityConfig"
      :testing="testing"
      @test-webhook="testWebhook"
    />

    <!-- 操作按钮 -->
    <div class="actions">
      <el-button @click="resetToDefaults">恢复默认设置</el-button>
      <el-button type="info" @click="exportSettings">导出配置</el-button>
      <el-button type="warning" @click="importSettings">导入配置</el-button>
      <el-button type="primary" @click="saveAllSettings" :loading="saving">
        保存所有设置
      </el-button>
    </div>

    <!-- 导入配置对话框 -->
    <ImportExportDialog
      v-model:visible="showImportDialog"
      :has-import-data="!!importData"
      @file-change="handleFileChange"
      @confirm-import="confirmImport"
    />

  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AdvancedSettings from './components/AdvancedSettings.vue'
import AudienceSettings from './components/AudienceSettings.vue'
import GlobalSettings from './components/GlobalSettings.vue'
import ImportExportDialog from './components/ImportExportDialog.vue'
import RateLimitSettings from './components/RateLimitSettings.vue'
import TimeSettings from './components/TimeSettings.vue'
import { useSettingsData } from './composables/useSettingsData'
import { useSettingsImportExport } from './composables/useSettingsImportExport'

interface Props {
  botId: string
}

const props = defineProps<Props>()

// 使用composables
const {
  saving,
  testing,
  globalSettings,
  timeSettings,
  rateLimitSettings,
  audienceSettings,
  advancedSettings,
  priorityConfig,
  loadSettings,
  saveAllSettings,
  handleGlobalToggle,
  testWebhook,
  resetToDefaults
} = useSettingsData(props.botId)

// 获取所有设置的函数
const getAllSettings = () => ({
  global: globalSettings,
  time: timeSettings,
  rateLimit: rateLimitSettings,
  audience: audienceSettings,
  advanced: advancedSettings,
  priority: priorityConfig.value
})

// 应用设置的函数
const applySettings = (settings: any) => {
  if (settings.global) {
    Object.assign(globalSettings, settings.global)
  }
  if (settings.time) {
    Object.assign(timeSettings, settings.time)
  }
  if (settings.rateLimit) {
    Object.assign(rateLimitSettings, settings.rateLimit)
  }
  if (settings.audience) {
    Object.assign(audienceSettings, settings.audience)
  }
  if (settings.advanced) {
    Object.assign(advancedSettings, settings.advanced)
  }
  if (settings.priority) {
    priorityConfig.value = settings.priority
  }
}

// 导入导出功能
const {
  showImportDialog,
  importData,
  exportSettings,
  importSettings,
  handleFileChange,
  confirmImport
} = useSettingsImportExport(props.botId, getAllSettings, applySettings)

// 生命周期
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.notification-settings-panel {
  @apply min-h-full;
}

.actions {
  @apply flex justify-end gap-3 pt-6 border-t border-gray-700;
}
</style>
