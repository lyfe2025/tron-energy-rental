<!--
  高级设置组件
  包含缓存、日志、API、功能开关等高级配置
-->
<template>
  <div class="space-y-6">
    <!-- 缓存设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">缓存设置</h3>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <h4 class="font-medium text-gray-900">查询缓存</h4>
            <p class="text-sm text-gray-500">启用数据库查询缓存以提升性能</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableQueryCache"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Redis缓存过期时间(秒)
          </label>
          <input
            v-model.number="localSettings.redisTtlSeconds"
            type="number"
            min="60"
            max="86400"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">60秒-24小时之间</p>
        </div>
      </div>
    </div>

    <!-- 日志设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">日志设置</h3>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">文件日志</h4>
            <p class="text-sm text-gray-500">启用日志文件记录</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableFileLog"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            日志级别
          </label>
          <select
            v-model="localSettings.logLevel"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="debug">Debug - 详细调试信息</option>
            <option value="info">Info - 一般信息</option>
            <option value="warn">Warning - 警告信息</option>
            <option value="error">Error - 错误信息</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">更高级别包含更少的日志信息</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            日志保留天数
          </label>
          <input
            v-model.number="localSettings.logRetentionDays"
            type="number"
            min="1"
            max="365"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">自动清理超过指定天数的日志文件</p>
        </div>
      </div>
    </div>

    <!-- API设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">API设置</h3>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
          <div>
            <h4 class="font-medium text-gray-900">CORS跨域</h4>
            <p class="text-sm text-gray-500">允许跨域API请求</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableCors"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- 功能开关 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">功能开关</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">能量交易</h4>
            <p class="text-sm text-gray-500">启用能量交易功能</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableEnergyTrading"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">推荐系统</h4>
            <p class="text-sm text-gray-500">启用用户推荐系统</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableReferralSystem"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">用户注册</h4>
            <p class="text-sm text-gray-500">允许新用户注册</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableUserRegistration"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">代理申请</h4>
            <p class="text-sm text-gray-500">启用代理申请功能</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableAgentApplication"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="flex justify-end pt-6 border-t border-gray-200">
      <button
        @click="$emit('save')"
        :disabled="isSaving"
        class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg v-if="isSaving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        {{ isSaving ? '保存中...' : '保存高级设置' }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { AdvancedSettings } from '../types/settings.types'

interface Props {
  settings: AdvancedSettings
  isSaving: boolean
}

interface Emits {
  (e: 'update:settings', settings: AdvancedSettings): void
  (e: 'save'): void
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
    // 可以在这里添加特殊的处理逻辑
    console.log('Advanced settings changed:', newSettings)
  },
  { deep: true }
)
</script>