<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 日志级别 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">日志级别</label>
        <select
          v-model="form.level"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">全部级别</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      <!-- 模块 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">模块</label>
        <select
          v-model="form.module"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">全部模块</option>
          <option value="system">系统</option>
          <option value="database">数据库</option>
          <option value="auth">认证</option>
          <option value="api">API</option>
          <option value="payment">支付</option>
          <option value="notification">通知</option>
        </select>
      </div>

      <!-- 消息关键词 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">消息关键词</label>
        <input
          v-model="form.message"
          type="text"
          placeholder="请输入关键词"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <!-- 用户ID -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">用户ID</label>
        <input
          v-model.number="form.user_id"
          type="number"
          placeholder="请输入用户ID"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>

    <!-- 时间范围 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
        <input
          v-model="form.start_date"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
        <input
          v-model="form.end_date"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center space-x-4">
      <button
        @click="handleSearch"
        :disabled="loading"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
      >
        <Search class="w-4 h-4 mr-2" />
        {{ loading ? '搜索中...' : '搜索' }}
      </button>
      
      <button
        @click="handleReset"
        :disabled="loading"
        class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
      >
        <RotateCcw class="w-4 h-4 mr-2" />
        重置
      </button>
      
      <button
        @click="handleRefresh"
        :disabled="loading"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        刷新
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { Search, RotateCcw, RefreshCw } from 'lucide-vue-next'
import type { SystemLogSearchForm } from '../types/system-logs.types'

interface Props {
  searchForm: SystemLogSearchForm
  loading: boolean
}

interface Emits {
  search: [form: SystemLogSearchForm]
  reset: []
  refresh: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const form = reactive<SystemLogSearchForm>({ ...props.searchForm })

const handleSearch = () => {
  emit('search', { ...form })
}

const handleReset = () => {
  Object.assign(form, {
    level: '',
    module: '',
    message: '',
    start_date: '',
    end_date: '',
    user_id: undefined
  })
  emit('reset')
}

const handleRefresh = () => {
  emit('refresh')
}
</script>