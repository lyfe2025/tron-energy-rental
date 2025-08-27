<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <!-- 搜索框 -->
      <div class="flex-1 max-w-md">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索能量包名称或描述..."
            class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
      
      <!-- 筛选器 -->
      <div class="flex flex-col sm:flex-row gap-3">
        <!-- 状态筛选 -->
        <select
          v-model="statusFilter"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">全部状态</option>
          <option value="active">启用</option>
          <option value="inactive">禁用</option>
        </select>
        
        <!-- 类型筛选 -->
        <select
          v-model="typeFilter"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">全部类型</option>
          <option value="energy">纯能量</option>
          <option value="bandwidth">纯带宽</option>
          <option value="mixed">混合包</option>
        </select>
        
        <!-- 刷新按钮 -->
        <button
          @click="$emit('refresh')"
          class="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          <RefreshCw class="h-4 w-4" />
          刷新
        </button>
        
        <!-- 导出按钮 -->
        <button
          @click="$emit('export')"
          class="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          <Download class="h-4 w-4" />
          导出
        </button>
        
        <!-- 添加按钮 -->
        <button
          @click="$emit('create')"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center gap-2"
        >
          <Plus class="h-4 w-4" />
          添加能量包
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Download,
  Plus,
  RefreshCw,
  Search
} from 'lucide-vue-next'
import { computed } from 'vue'
import type { EnergyPackageFilters } from '../types'

interface Props {
  modelValue: EnergyPackageFilters
}

interface Emits {
  'update:modelValue': [value: Props['modelValue']]
  'refresh': []
  'export': []
  'create': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 搜索查询
const searchQuery = computed({
  get: () => props.modelValue.searchQuery,
  set: (value: string) => {
    emit('update:modelValue', {
      ...props.modelValue,
      searchQuery: value
    })
  }
})

// 状态筛选
const statusFilter = computed({
  get: () => props.modelValue.statusFilter,
  set: (value: 'all' | 'active' | 'inactive') => {
    emit('update:modelValue', {
      ...props.modelValue,
      statusFilter: value
    })
  }
})

// 类型筛选
const typeFilter = computed({
  get: () => props.modelValue.typeFilter,
  set: (value: 'all' | 'energy' | 'bandwidth' | 'mixed') => {
    emit('update:modelValue', {
      ...props.modelValue,
      typeFilter: value
    })
  }
})
</script>