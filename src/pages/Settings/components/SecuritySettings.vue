<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 身份验证设置 -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">身份验证</h3>
        
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">双重身份验证</h4>
            <p class="text-sm text-gray-500">为账户增加额外的安全保护</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableTwoFactor"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            会话超时时间（分钟）
          </label>
          <input
            v-model.number="localSettings.sessionTimeout"
            type="number"
            min="5"
            max="480"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">5-480分钟之间</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            最大登录尝试次数
          </label>
          <input
            v-model.number="localSettings.maxLoginAttempts"
            type="number"
            min="3"
            max="10"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">3-10次之间</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            密码过期天数
          </label>
          <input
            v-model.number="localSettings.passwordExpireDays"
            type="number"
            min="30"
            max="365"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">30-365天之间，0表示永不过期</p>
        </div>
      </div>

      <!-- 访问控制 -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">访问控制</h3>
        
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">IP白名单</h4>
            <p class="text-sm text-gray-500">限制只允许特定IP地址访问</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableIpWhitelist"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div v-if="localSettings.enableIpWhitelist" class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            允许的IP地址
          </label>
          <div class="space-y-2">
            <div
              v-for="(ip, index) in localSettings.ipWhitelist"
              :key="index"
              class="flex items-center space-x-2"
            >
              <input
                v-model="localSettings.ipWhitelist[index]"
                type="text"
                placeholder="192.168.1.1"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                @click="removeIpFromWhitelist(index)"
                class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                删除
              </button>
            </div>
            <button
              @click="addIpToWhitelist"
              class="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              添加IP
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">API限流</h4>
            <p class="text-sm text-gray-500">限制API请求频率</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.enableApiRateLimit"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div v-if="localSettings.enableApiRateLimit">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            API请求限制（每小时）
          </label>
          <input
            v-model.number="localSettings.apiRateLimit"
            type="number"
            min="100"
            max="10000"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">100-10000次/小时</p>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { SecuritySettings } from '../types/settings.types'

interface Props {
  settings: SecuritySettings
  isSaving: boolean
}

interface Emits {
  (e: 'update:settings', settings: SecuritySettings): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地设置副本
const localSettings = computed({
  get: () => props.settings,
  set: (value) => emit('update:settings', value)
})



// IP白名单管理
const addIpToWhitelist = () => {
  localSettings.value.ipWhitelist.push('')
}

const removeIpFromWhitelist = (index: number) => {
  localSettings.value.ipWhitelist.splice(index, 1)
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
