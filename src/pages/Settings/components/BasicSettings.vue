<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 系统信息 -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">系统信息</h3>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            系统名称
          </label>
          <input
            v-model="localSettings.systemName"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="请输入系统名称"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            系统描述
          </label>
          <textarea
            v-model="localSettings.systemDescription"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="请输入系统描述"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            联系邮箱
          </label>
          <input
            v-model="localSettings.contactEmail"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="请输入联系邮箱"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            支持电话
          </label>
          <input
            v-model="localSettings.supportPhone"
            type="tel"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="请输入支持电话"
          />
        </div>
      </div>

      <!-- 地区和格式设置 -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">地区和格式</h3>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            时区
          </label>
          <select
            v-model="localSettings.timezone"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
            <option value="America/New_York">America/New_York (UTC-5)</option>
            <option value="Europe/London">Europe/London (UTC+0)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            语言
          </label>
          <select
            v-model="localSettings.language"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="zh-CN">中文（简体）</option>
            <option value="zh-TW">中文（繁體）</option>
            <option value="en-US">English (US)</option>
            <option value="ja-JP">日本語</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            货币
          </label>
          <select
            v-model="localSettings.currency"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="CNY">人民币 (CNY)</option>
            <option value="USD">美元 (USD)</option>
            <option value="EUR">欧元 (EUR)</option>
            <option value="JPY">日元 (JPY)</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            日期格式
          </label>
          <select
            v-model="localSettings.dateFormat"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY年MM月DD日">YYYY年MM月DD日</option>
          </select>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { BasicSettings } from '../types/settings.types'

interface Props {
  settings: BasicSettings
  isSaving: boolean
}

interface Emits {
  (e: 'update:settings', settings: BasicSettings): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地设置副本
const localSettings = computed({
  get: () => props.settings,
  set: (value) => emit('update:settings', value)
})



// 监听设置变化
watch(
  () => props.settings,
  (newSettings) => {
    emit('update:settings', newSettings)
  },
  { deep: true }
)
</script>
