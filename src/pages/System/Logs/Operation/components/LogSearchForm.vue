<template>
  <div class="bg-white p-4 rounded-lg border border-gray-200 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      <!-- 用户名 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
        <input
          v-model="searchForm.username"
          type="text"
          placeholder="请输入用户名"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <!-- 操作模块 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">操作模块</label>
        <select
          v-model="searchForm.module"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-end gap-2 col-span-full lg:col-span-2">
        <button
          @click="$emit('search')"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Search class="w-4 h-4" />
          搜索
        </button>
        <button
          @click="$emit('reset')"
          class="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          <RotateCcw class="w-4 h-4" />
          重置
        </button>
        <button
          @click="$emit('refresh')"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          <RefreshCw class="w-4 h-4" />
          刷新
        </button>
      </div>
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
