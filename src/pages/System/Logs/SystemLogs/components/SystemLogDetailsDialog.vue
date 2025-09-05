<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

      <!-- 弹窗内容 -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <!-- 头部 -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900">系统日志详情</h3>
            <button
              @click="$emit('close')"
              class="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X class="w-6 h-6" />
            </button>
          </div>

          <div v-if="log" class="space-y-6">
            <!-- 基本信息 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">日志ID</label>
                  <div class="text-sm text-gray-900">{{ log.id }}</div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">级别</label>
                  <span :class="getLevelClass(log.level)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                    {{ getLevelText(log.level) }}
                  </span>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">模块</label>
                  <div class="text-sm text-gray-900">{{ log.module }}</div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">用户ID</label>
                  <div class="text-sm text-gray-900">{{ log.user_id || '-' }}</div>
                </div>
              </div>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">IP地址</label>
                  <div class="text-sm text-gray-900">{{ log.ip_address || '-' }}</div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">用户代理</label>
                  <div class="text-sm text-gray-900 break-all">{{ log.user_agent || '-' }}</div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
                  <div class="text-sm text-gray-900">{{ formatDate(log.created_at) }}</div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">更新时间</label>
                  <div class="text-sm text-gray-900">{{ formatDate(log.updated_at) }}</div>
                </div>
              </div>
            </div>

            <!-- 消息内容 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">消息内容</label>
              <div class="bg-gray-50 rounded-md p-4">
                <pre class="text-sm text-gray-900 whitespace-pre-wrap">{{ log.message }}</pre>
              </div>
            </div>

            <!-- 上下文信息 -->
            <div v-if="log.context">
              <label class="block text-sm font-medium text-gray-700 mb-2">上下文信息</label>
              <div class="bg-gray-50 rounded-md p-4">
                <pre class="text-sm text-gray-900 whitespace-pre-wrap">{{ JSON.stringify(log.context, null, 2) }}</pre>
              </div>
            </div>

            <!-- 堆栈跟踪 -->
            <div v-if="log.stack_trace">
              <label class="block text-sm font-medium text-gray-700 mb-2">堆栈跟踪</label>
              <div class="bg-red-50 rounded-md p-4 max-h-64 overflow-y-auto">
                <pre class="text-sm text-red-900 whitespace-pre-wrap">{{ log.stack_trace }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
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
import type { SystemLog } from '../types/system-logs.types'

interface Props {
  visible: boolean
  log: SystemLog | null
}

interface Emits {
  close: []
}

defineProps<Props>()
defineEmits<Emits>()

// 获取级别样式
const getLevelClass = (level: string) => {
  const classes = {
    debug: 'bg-gray-100 text-gray-800',
    info: 'bg-blue-100 text-blue-800',
    warn: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  }
  return classes[level as keyof typeof classes] || 'bg-gray-100 text-gray-800'
}

// 获取级别文本
const getLevelText = (level: string) => {
  const texts = {
    debug: 'Debug',
    info: 'Info',
    warn: 'Warning',
    error: 'Error'
  }
  return texts[level as keyof typeof texts] || level
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}
</script>