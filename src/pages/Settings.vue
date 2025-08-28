<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">系统设置</h1>
        <p class="text-gray-600 mt-1">管理TRON能量租赁系统的配置参数和功能开关</p>
      </div>
      <div class="flex gap-3 mt-4 sm:mt-0">
        <button
          @click="resetToDefaults"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <RotateCcw class="w-4 h-4" />
          恢复默认
        </button>
        <button
          @click="exportSettings"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Download class="w-4 h-4" />
          导出设置
        </button>
        <button
          @click="saveAllSettings"
          :disabled="isSaving"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save :class="{ 'animate-spin': isSaving }" class="w-4 h-4" />
          {{ isSaving ? '保存中...' : '保存设置' }}
        </button>
      </div>
    </div>

    <!-- 未保存更改提醒 -->
    <div v-if="isDirty" class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div class="flex items-center">
        <AlertTriangle class="w-5 h-5 text-yellow-600 mr-2" />
        <span class="text-yellow-800">您有未保存的更改</span>
        <span v-if="lastSaved" class="text-yellow-600 ml-2 text-sm">
          上次保存: {{ new Date(lastSaved).toLocaleString() }}
        </span>
      </div>
    </div>

    <!-- Settings Tabs -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            v-for="tab in settingTabs"
            :key="tab.id"
            @click="switchTab(tab.id)"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <component :is="tab.icon" class="w-5 h-5" />
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="p-6">
        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span class="ml-3 text-gray-600">加载设置中...</span>
        </div>

        <div v-else>
          <!-- Basic Settings -->
          <BasicSettings
            v-if="activeTab === 'basic'"
            :settings="settings.basic"
            :is-saving="isSaving"
            @update:settings="updateBasicSettings"
            @save="saveBasicSettings"
          />

          <!-- Security Settings -->
          <SecuritySettings
            v-if="activeTab === 'security'"
            :settings="settings.security"
            :is-saving="isSaving"
            @update:settings="updateSecuritySettings"
            @save="saveSecuritySettings"
          />

          <!-- Notification Settings -->
          <NotificationSettings
            v-if="activeTab === 'notifications'"
            :settings="settings.notifications"
            :is-saving="isSaving"
            @update:settings="updateNotificationSettings"
            @save="saveNotificationSettings"
          />

          <!-- Pricing Settings -->
          <PricingSettings
            v-if="activeTab === 'pricing'"
            :settings="settings.pricing"
            :is-saving="isSaving"
            @update:settings="updatePricingSettings"
            @save="savePricingSettings"
          />

          <!-- Advanced Settings -->
          <AdvancedSettings
            v-if="activeTab === 'advanced'"
            :settings="settings.advanced"
            :is-saving="isSaving"
            @update:settings="updateAdvancedSettings"
            @save="saveAdvancedSettings"
          />
        </div>
      </div>
    </div>

    <!-- File Import Modal -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      class="hidden"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, Download, RotateCcw, Save } from 'lucide-vue-next'
import { ref } from 'vue'
import AdvancedSettings from './Settings/components/AdvancedSettings.vue'
import BasicSettings from './Settings/components/BasicSettings.vue'
import NotificationSettings from './Settings/components/NotificationSettings.vue'
import PricingSettings from './Settings/components/PricingSettings.vue'
import SecuritySettings from './Settings/components/SecuritySettings.vue'
import { useSettings } from './Settings/composables/useSettings'
import type {
    AdvancedSettings as AdvancedSettingsType,
    BasicSettings as BasicSettingsType,
    NotificationSettings as NotificationSettingsType,
    PricingSettings as PricingSettingsType,
    SecuritySettings as SecuritySettingsType
} from './Settings/types/settings.types'

const fileInput = ref<HTMLInputElement>()

const {
  // 响应式数据
  settings,
  activeTab,
  isSaving,
  isLoading,
  isDirty,
  lastSaved,
  
  // 配置
  settingTabs,
  
  // 计算属性
  hasUnsavedChanges,
  
  // 方法
  saveSettings,
  saveAllSettings,
  resetToDefaults,
  switchTab,
  updateSetting,
  exportSettings,
  importSettings
} = useSettings()



// 更新各个设置模块
const updateBasicSettings = (newSettings: BasicSettingsType) => {
  // 使用 Object.assign 避免响应式循环
  Object.assign(settings.value.basic, newSettings)
}

// 保存基础设置
const saveBasicSettings = async () => {
  try {
    await saveSettings('basic')
  } catch (error) {
    console.error('保存基础设置失败:', error)
  }
}

// 保存安全设置
const saveSecuritySettings = async () => {
  try {
    await saveSettings('security')
  } catch (error) {
    console.error('保存安全设置失败:', error)
  }
}

const updateSecuritySettings = (newSettings: SecuritySettingsType) => {
  // 使用 Object.assign 避免响应式循环
  Object.assign(settings.value.security, newSettings)
}

const updateNotificationSettings = (newSettings: NotificationSettingsType) => {
  // 使用 Object.assign 避免响应式循环
  Object.assign(settings.value.notifications, newSettings)
}

// 保存通知设置
const saveNotificationSettings = async () => {
  try {
    await saveSettings('notifications')
  } catch (error) {
    console.error('保存通知设置失败:', error)
  }
}

const updatePricingSettings = (newSettings: PricingSettingsType) => {
  // 使用 Object.assign 避免响应式循环
  Object.assign(settings.value.pricing, newSettings)
}

// 保存定价设置
const savePricingSettings = async () => {
  try {
    await saveSettings('pricing')
  } catch (error) {
    console.error('保存定价设置失败:', error)
  }
}

const updateAdvancedSettings = (newSettings: AdvancedSettingsType) => {
  // 使用 Object.assign 避免响应式循环
  Object.assign(settings.value.advanced, newSettings)
}

// 保存高级设置
const saveAdvancedSettings = async () => {
  try {
    await saveSettings('advanced')
  } catch (error) {
    console.error('保存高级设置失败:', error)
  }
}

// 文件导入处理
const handleFileImport = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    importSettings(file)
  }
}

// 导入设置文件
const importSettingsFile = () => {
  fileInput.value?.click()
}
</script>
