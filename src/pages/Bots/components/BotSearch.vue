<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- 搜索框 -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          v-model="localFilters.searchQuery"
          type="text"
          placeholder="搜索机器人名称或用户名..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <!-- 状态筛选 -->
      <select
        v-model="localFilters.statusFilter"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">全部状态</option>
        <option value="online">在线</option>
        <option value="offline">离线</option>
        <option value="active">活跃</option>
        <option value="inactive">非活跃</option>
        <option value="error">异常</option>
        <option value="maintenance">维护中</option>
      </select>

      <!-- 占位空间 -->
      <div></div>

      <!-- 操作按钮 -->
      <div class="flex gap-2">
        <button
          @click="clearFilters"
          class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RotateCcw class="w-4 h-4 mr-2 inline" />
          重置
        </button>
        <button
          @click="$emit('export')"
          class="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Download class="w-4 h-4 mr-2 inline" />
          导出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Search, RotateCcw, Download } from 'lucide-vue-next'
import type { BotFilters } from '../types/bot.types'

interface Props {
  filters: BotFilters
}

interface Emits {
  (e: 'update:filters', filters: BotFilters): void
  (e: 'export'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localFilters = computed({
  get: () => props.filters,
  set: (value) => emit('update:filters', value)
})

const clearFilters = () => {
  emit('update:filters', {
    searchQuery: '',
    statusFilter: '',
    typeFilter: ''
  })
}
</script>