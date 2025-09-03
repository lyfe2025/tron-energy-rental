<template>
  <div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- 用户名 -->
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

      <!-- 操作模块 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">操作模块</label>
        <select
          v-model="searchForm.module"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">全部模块</option>
          <option value="user">用户管理</option>
          <option value="role">角色管理</option>
          <option value="menu">菜单管理</option>
          <option value="system">系统设置</option>
          <option value="order">订单管理</option>
          <option value="energy">能量管理</option>
        </select>
      </div>

      <!-- 操作类型 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
        <select
          v-model="searchForm.operation"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">全部类型</option>
          <option value="create">新增</option>
          <option value="update">修改</option>
          <option value="delete">删除</option>
          <option value="query">查询</option>
        </select>
      </div>

      <!-- 时间范围 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
        <input
          v-model="searchForm.timeRange"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center gap-3 mt-4">
      <button
        @click="$emit('search')"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
import type { SearchForm } from '../types/operation-logs.types'

interface Props {
  searchForm: SearchForm
}

interface Emits {
  search: []
  reset: []
  refresh: []
}

defineProps<Props>()
defineEmits<Emits>()
</script>
