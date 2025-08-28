<template>
  <div class="bg-white rounded-lg shadow">
    <!-- 筛选栏 -->
    <div class="p-6 border-b border-gray-200">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 class="text-lg font-medium text-gray-900">价格策略</h3>
        
        <div class="flex flex-col sm:flex-row gap-3">
          <!-- 搜索 -->
          <div class="relative">
            <input
              :value="filters.search"
              @input="updateFilters({ search: ($event.target as HTMLInputElement).value })"
              type="text"
              placeholder="搜索策略..."
              class="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <!-- 类型筛选 -->
          <select
            :value="filters.type"
            @change="updateFilters({ type: ($event.target as HTMLSelectElement).value })"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">所有类型</option>
            <option value="energy">能量</option>
            <option value="bandwidth">带宽</option>
            <option value="mixed">混合</option>
          </select>

          <!-- 状态筛选 -->
          <select
            :value="filters.status"
            @change="updateFilters({ status: ($event.target as HTMLSelectElement).value })"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">所有状态</option>
            <option value="active">活跃</option>
            <option value="disabled">禁用</option>
            <option value="draft">草稿</option>
          </select>

          <!-- 排序 -->
          <select
            :value="filters.sortBy"
            @change="updateFilters({ sortBy: ($event.target as HTMLSelectElement).value })"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="updated_at">更新时间</option>
            <option value="name">名称</option>
            <option value="base_price">基础价格</option>
            <option value="priority">优先级</option>
          </select>

          <!-- 新建按钮 -->
          <button
            @click="$emit('createStrategy')"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 whitespace-nowrap"
          >
            新建策略
          </button>
        </div>
      </div>
    </div>

    <!-- 策略列表 -->
    <div class="p-6">
      <!-- 加载中 -->
      <div v-if="isLoading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>

      <!-- 无策略 -->
      <div v-else-if="filteredStrategies.length === 0" class="text-center py-8">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">暂无策略</h3>
        <p class="mt-1 text-sm text-gray-500">开始创建您的第一个价格策略</p>
        <div class="mt-6">
          <button
            @click="$emit('createStrategy')"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            新建策略
          </button>
        </div>
      </div>

      <!-- 策略列表 -->
      <div v-else class="grid grid-cols-1 gap-4">
        <div
          v-for="strategy in filteredStrategies"
          :key="strategy.id"
          class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <!-- 策略基本信息 -->
              <div class="flex items-center gap-3 mb-2">
                <h4 class="text-lg font-medium text-gray-900">{{ strategy.name }}</h4>
                
                <!-- 状态标签 -->
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(strategy.status)
                  ]"
                >
                  {{ getStatusText(strategy.status) }}
                </span>
                
                <!-- 类型标签 -->
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getTypeColor(strategy.resourceType)
                  ]"
                >
                  {{ getTypeText(strategy.resourceType) }}
                </span>

                <!-- 优先级标签 -->
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getPriorityColor(strategy.priority)
                  ]"
                >
                  优先级: {{ strategy.priority }}
                </span>
              </div>

              <!-- 描述 -->
              <p v-if="strategy.description" class="text-sm text-gray-600 mb-3">
                {{ strategy.description }}
              </p>

              <!-- 详细信息 -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span class="text-gray-500">基础价格:</span>
                  <span class="ml-1 font-medium">{{ formatCurrency(0, 'TRX') }}</span>
                </div>
                <div>
                  <span class="text-gray-500">生效时间:</span>
                  <span class="ml-1 font-medium">{{ formatDate(strategy.effectiveFrom) }}</span>
                </div>
                <div>
                  <span class="text-gray-500">失效时间:</span>
                  <span class="ml-1 font-medium">{{ strategy.effectiveTo ? formatDate(strategy.effectiveTo) : '永久' }}</span>
                </div>
                <div>
                  <span class="text-gray-500">更新时间:</span>
                  <span class="ml-1 font-medium">{{ formatDate(strategy.updatedAt) }}</span>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-2 ml-4">
              <button
                @click="$emit('viewStrategy', strategy)"
                class="p-2 text-gray-400 hover:text-gray-600"
                title="查看"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              
              <button
                @click="$emit('editStrategy', strategy)"
                class="p-2 text-gray-400 hover:text-indigo-600"
                title="编辑"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                @click="$emit('duplicateStrategy', strategy)"
                class="p-2 text-gray-400 hover:text-green-600"
                title="复制"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              
              <button
                @click="$emit('toggleStatus', strategy)"
                :class="[
                  'p-2',
                  strategy.status === 'active' 
                    ? 'text-gray-400 hover:text-orange-600' 
                    : 'text-gray-400 hover:text-green-600'
                ]"
                :title="strategy.status === 'active' ? '禁用' : '启用'"
              >
                <svg v-if="strategy.status === 'active'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              
              <button
                @click="$emit('deleteStrategy', strategy)"
                class="p-2 text-gray-400 hover:text-red-600"
                title="删除"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PricingStrategy } from '../types/pricing.types'

interface Props {
  filteredStrategies: PricingStrategy[]
  filters: {
    search: string
    type: string
    status: string
    sortBy: string
  }
  isLoading: boolean
  formatCurrency: (amount: number, currency: string) => string
  formatNumber: (value: number) => string
  formatDate: (date: string | Date) => string
}

interface Emits {
  updateFilters: [filters: any]
  createStrategy: []
  viewStrategy: [strategy: PricingStrategy]
  editStrategy: [strategy: PricingStrategy]
  duplicateStrategy: [strategy: PricingStrategy]
  toggleStatus: [strategy: PricingStrategy]
  deleteStrategy: [strategy: PricingStrategy]
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// 处理筛选条件变化
const updateFilters = (newFilters: any) => {
  emit('updateFilters', newFilters)
}

// 辅助函数
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'disabled':
      return 'bg-red-100 text-red-800'
    case 'draft':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return '活跃'
    case 'disabled':
      return '禁用'
    case 'draft':
      return '草稿'
    default:
      return '未知'
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'energy':
      return 'bg-blue-100 text-blue-800'
    case 'bandwidth':
      return 'bg-purple-100 text-purple-800'
    case 'mixed':
      return 'bg-indigo-100 text-indigo-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getTypeText = (type: string) => {
  switch (type) {
    case 'energy':
      return '能量'
    case 'bandwidth':
      return '带宽'
    case 'mixed':
      return '混合'
    default:
      return '未知'
  }
}

const getPriorityColor = (priority: number) => {
  if (priority >= 80) {
    return 'bg-red-100 text-red-800'
  } else if (priority >= 50) {
    return 'bg-yellow-100 text-yellow-800'
  } else {
    return 'bg-green-100 text-green-800'
  }
}
</script>
