<template>
  <!-- 搜索和筛选 -->
  <div class="mb-6 bg-white p-4 rounded-lg border border-gray-200">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- 用户名搜索 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            v-model="searchForm.username"
            type="text"
            placeholder="搜索用户名"
            class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <!-- 登录状态 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">登录状态</label>
        <select
          v-model="searchForm.status"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
        </select>
      </div>

      <!-- IP地址搜索 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">IP地址</label>
        <input
          v-model="searchForm.ip_address"
          type="text"
          placeholder="搜索IP地址"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <!-- 时间范围 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
        <select
          v-model="searchForm.timeRange"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">全部时间</option>
          <option value="today">今天</option>
          <option value="week">最近一周</option>
          <option value="month">最近一月</option>
        </select>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center gap-3 mt-4">
      <button
        @click="$emit('search')"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        :disabled="loading"
      >
        <Search class="w-4 h-4" />
        <span>搜索</span>
      </button>
      <button
        @click="$emit('reset')"
        class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <RotateCcw class="w-4 h-4" />
        <span>重置</span>
      </button>
      <button
        @click="$emit('refresh')"
        class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <RefreshCw class="w-4 h-4" />
        <span>刷新</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw, RotateCcw, Search } from 'lucide-vue-next'
import type { LoginLogSearchParams } from '../types/login-logs.types'

interface Props {
  searchForm: LoginLogSearchParams
  loading: boolean
}

interface Emits {
  (e: 'search'): void
  (e: 'reset'): void
  (e: 'refresh'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
