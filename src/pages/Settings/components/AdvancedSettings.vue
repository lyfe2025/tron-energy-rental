<template>
  <div class="space-y-6">
    <!-- 系统模式 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">系统模式</h3>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div>
            <h4 class="font-medium text-gray-900">维护模式</h4>
            <p class="text-sm text-gray-500">启用后将阻止用户访问系统</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableMaintenanceMode"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
          </label>
        </div>

        <div v-if="localSettings.enableMaintenanceMode">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            维护消息
          </label>
          <textarea
            v-model="localSettings.maintenanceMessage"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="请输入维护期间显示给用户的消息"
          />
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">调试模式</h4>
            <p class="text-sm text-gray-500">启用详细的调试信息</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableDebugMode"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- 日志设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">日志设置</h3>
      
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
    </div>

    <!-- 备份设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">备份设置</h3>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">自动备份</h4>
            <p class="text-sm text-gray-500">自动备份系统数据</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableAutoBackup"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div v-if="localSettings.enableAutoBackup">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            备份保留天数
          </label>
          <input
            v-model.number="localSettings.backupRetentionDays"
            type="number"
            min="7"
            max="365"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">7-365天之间</p>
        </div>

        <div class="p-4 bg-blue-50 rounded-lg">
          <h4 class="font-medium text-gray-900 mb-2">手动备份</h4>
          <p class="text-sm text-gray-600 mb-4">立即创建系统数据备份</p>
          <div class="flex space-x-3">
            <button
              @click="createBackup"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              创建备份
            </button>
            <button
              @click="downloadBackup"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              下载备份
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 性能优化 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">性能优化</h3>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">缓存优化</h4>
            <p class="text-sm text-gray-500">启用系统缓存以提高性能</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableCacheOptimization"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div v-if="localSettings.enableCacheOptimization">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            缓存过期时间（秒）
          </label>
          <input
            v-model.number="localSettings.cacheExpireTime"
            type="number"
            min="300"
            max="86400"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">300-86400秒之间（5分钟-24小时）</p>
        </div>

        <div class="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 class="font-medium text-gray-900 mb-2">缓存操作</h4>
          <p class="text-sm text-gray-600 mb-4">清理系统缓存以释放内存</p>
          <div class="flex space-x-3">
            <button
              @click="clearCache"
              class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              清理缓存
            </button>
            <button
              @click="preloadCache"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              预热缓存
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 危险操作 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-red-600">危险操作</h3>
      
      <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h4 class="font-medium text-red-900 mb-2">重置系统</h4>
        <p class="text-sm text-red-700 mb-4">
          ⚠️ 警告：此操作将重置所有设置为默认值，无法撤销！
        </p>
        <button
          @click="resetSystem"
          class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          重置系统设置
        </button>
      </div>
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
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地设置副本
const localSettings = computed({
  get: () => props.settings,
  set: (value) => emit('update:settings', value)
})



// 备份操作
const createBackup = () => {
  console.log('Creating backup...')
  alert('备份创建成功')
}

const downloadBackup = () => {
  console.log('Downloading backup...')
  // 模拟下载备份文件
  const link = document.createElement('a')
  link.href = '#'
  link.download = `backup-${new Date().toISOString().split('T')[0]}.zip`
  link.click()
}

// 缓存操作
const clearCache = () => {
  if (confirm('确定要清理系统缓存吗？')) {
    console.log('Clearing cache...')
    alert('缓存清理完成')
  }
}

const preloadCache = () => {
  console.log('Preloading cache...')
  alert('缓存预热完成')
}

// 系统重置
const resetSystem = () => {
  if (confirm('⚠️ 警告：此操作将重置所有设置为默认值，无法撤销！\n\n确定要继续吗？')) {
    if (confirm('最后确认：您真的要重置系统设置吗？')) {
      console.log('Resetting system...')
      alert('系统设置已重置为默认值')
    }
  }
}

// 监听设置变化
watch(
  () => props.settings,
  (newSettings) => {
    emit('update:settings', newSettings)
  },
  { deep: true }
)
</script>
