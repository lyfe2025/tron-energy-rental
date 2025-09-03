<template>
  <!-- 详情弹窗 -->
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- 背景遮罩 -->
      <div 
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        @click="$emit('close')"
      ></div>

      <!-- 弹窗内容 -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <!-- 弹窗头部 -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              登录日志详情
            </h3>
            <button
              @click="$emit('close')"
              class="text-gray-400 hover:text-gray-600"
            >
              <X class="w-6 h-6" />
            </button>
          </div>

          <!-- 详情内容 -->
          <div v-if="log" class="space-y-4">
            <div class="grid grid-cols-1 gap-4">
              <!-- 用户信息 -->
              <div class="border-b border-gray-200 pb-4">
                <h4 class="text-sm font-medium text-gray-900 mb-2">用户信息</h4>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">用户名:</span>
                    <span class="text-sm text-gray-900">{{ log.username }}</span>
                  </div>
                  <div v-if="log.user_id" class="flex justify-between">
                    <span class="text-sm text-gray-500">用户ID:</span>
                    <span class="text-sm text-gray-900">{{ log.user_id }}</span>
                  </div>
                </div>
              </div>

              <!-- 登录信息 -->
              <div class="border-b border-gray-200 pb-4">
                <h4 class="text-sm font-medium text-gray-900 mb-2">登录信息</h4>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">IP地址:</span>
                    <span class="text-sm text-gray-900">{{ log.ip_address }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">登录状态:</span>
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="log.status === 1 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'"
                    >
                      {{ log.status === 1 ? '成功' : '失败' }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">登录时间:</span>
                    <span class="text-sm text-gray-900">{{ log.login_time }}</span>
                  </div>
                  <div v-if="log.logout_time" class="flex justify-between">
                    <span class="text-sm text-gray-500">退出时间:</span>
                    <span class="text-sm text-gray-900">{{ log.logout_time }}</span>
                  </div>
                  <div v-if="log.session_duration" class="flex justify-between">
                    <span class="text-sm text-gray-500">会话时长:</span>
                    <span class="text-sm text-gray-900">{{ formatDuration(log.session_duration) }}</span>
                  </div>
                </div>
              </div>

              <!-- 设备信息 -->
              <div class="border-b border-gray-200 pb-4">
                <h4 class="text-sm font-medium text-gray-900 mb-2">设备信息</h4>
                <div class="space-y-2">
                  <div>
                    <span class="text-sm text-gray-500">用户代理:</span>
                    <p class="text-sm text-gray-900 mt-1 break-all">{{ log.user_agent }}</p>
                  </div>
                  <div v-if="log.device_type" class="flex justify-between">
                    <span class="text-sm text-gray-500">设备类型:</span>
                    <span class="text-sm text-gray-900">{{ log.device_type }}</span>
                  </div>
                  <div v-if="log.location" class="flex justify-between">
                    <span class="text-sm text-gray-500">地理位置:</span>
                    <span class="text-sm text-gray-900">{{ log.location }}</span>
                  </div>
                </div>
              </div>

              <!-- 失败信息 -->
              <div v-if="log.failure_reason" class="pb-4">
                <h4 class="text-sm font-medium text-gray-900 mb-2">失败信息</h4>
                <div class="bg-red-50 border border-red-200 rounded-md p-3">
                  <p class="text-sm text-red-800">{{ log.failure_reason }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 弹窗底部 -->
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            @click="$emit('close')"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { LoginLog } from '../types/login-logs.types'

interface Props {
  visible: boolean
  log: LoginLog | null
  formatDuration: (seconds: number) => string
}

interface Emits {
  (e: 'close'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
