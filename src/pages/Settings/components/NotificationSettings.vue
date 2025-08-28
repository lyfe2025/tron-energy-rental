<template>
  <div class="space-y-6">
    <!-- 通知方式 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">通知方式</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">邮件通知</h4>
            <p class="text-sm text-gray-500">通过邮件接收系统通知</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.emailNotifications"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">短信通知</h4>
            <p class="text-sm text-gray-500">通过短信接收重要通知</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.smsNotifications"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">Telegram通知</h4>
            <p class="text-sm text-gray-500">通过Telegram机器人接收通知</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.telegramNotifications"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- 通知类型 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">通知类型</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">系统警告</h4>
            <p class="text-sm text-gray-500">系统异常和错误通知</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.systemAlerts"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">订单更新</h4>
            <p class="text-sm text-gray-500">订单状态变化通知</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.orderUpdates"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">余额不足</h4>
            <p class="text-sm text-gray-500">账户余额不足提醒</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.lowBalanceAlert"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">维护通知</h4>
            <p class="text-sm text-gray-500">系统维护计划通知</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.maintenanceNotifications"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- 报告设置 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">定期报告</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">周报</h4>
            <p class="text-sm text-gray-500">每周业务统计报告</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.weeklyReport"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">月报</h4>
            <p class="text-sm text-gray-500">每月业务统计报告</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="localSettings.monthlyReport"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- 测试通知 -->
    <div class="p-4 bg-blue-50 rounded-lg">
      <h4 class="font-medium text-gray-900 mb-2">测试通知</h4>
      <p class="text-sm text-gray-600 mb-4">发送测试通知以验证设置是否正确</p>
      <div class="flex space-x-3">
        <button
          @click="sendTestEmail"
          :disabled="!localSettings.emailNotifications"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          发送测试邮件
        </button>
        <button
          @click="sendTestSMS"
          :disabled="!localSettings.smsNotifications"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          发送测试短信
        </button>
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
        {{ isSaving ? '保存中...' : '保存通知设置' }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { NotificationSettings } from '../types/settings.types'

interface Props {
  settings: NotificationSettings
  isSaving: boolean
}

interface Emits {
  (e: 'update:settings', settings: NotificationSettings): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地设置副本
const localSettings = computed({
  get: () => props.settings,
  set: (value) => emit('update:settings', value)
})



// 发送测试通知
const sendTestEmail = () => {
  // 实际项目中这里会调用API发送测试邮件
  console.log('Sending test email...')
  alert('测试邮件已发送，请检查您的邮箱')
}

const sendTestSMS = () => {
  // 实际项目中这里会调用API发送测试短信
  console.log('Sending test SMS...')
  alert('测试短信已发送，请检查您的手机')
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
