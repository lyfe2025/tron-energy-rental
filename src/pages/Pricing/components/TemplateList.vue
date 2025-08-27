<template>
  <div class="bg-white rounded-lg shadow-sm">
    <!-- 筛选栏 -->
    <div class="p-6 border-b border-gray-200">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <!-- 搜索框 -->
        <div class="flex-1 max-w-lg">
          <div class="relative">
            <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              :value="filters.searchQuery"
              @input="updateFilters({ searchQuery: ($event.target as HTMLInputElement).value })"
              type="text"
              placeholder="搜索模板名称或描述..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <!-- 筛选器 -->
        <div class="flex items-center space-x-4">
          <select
            :value="filters.type"
            @change="updateFilters({ type: ($event.target as HTMLSelectElement).value })"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">全部类型</option>
            <option value="energy">能量</option>
            <option value="bandwidth">带宽</option>
            <option value="mixed">混合</option>
          </select>

          <select
            :value="filters.status"
            @change="updateFilters({ status: ($event.target as HTMLSelectElement).value })"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">全部状态</option>
            <option value="active">活跃</option>
            <option value="inactive">禁用</option>
            <option value="draft">草稿</option>
          </select>

          <select
            :value="`${filters.sortBy}-${filters.sortOrder}`"
            @change="handleSortChange"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="updated-desc">最近更新</option>
            <option value="updated-asc">最早更新</option>
            <option value="name-asc">名称 A-Z</option>
            <option value="name-desc">名称 Z-A</option>
            <option value="price-asc">价格从低到高</option>
            <option value="price-desc">价格从高到低</option>
            <option value="usage-desc">使用量最多</option>
            <option value="usage-asc">使用量最少</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 模板列表 -->
    <div class="divide-y divide-gray-200">
      <div v-if="isLoading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-2 text-gray-500">加载中...</p>
      </div>

      <div v-else-if="filteredTemplates.length === 0" class="p-8 text-center">
        <FileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">没有找到模板</h3>
        <p class="text-gray-500 mb-4">没有符合条件的定价模板</p>
        <button
          @click="$emit('createTemplate')"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          创建第一个模板
        </button>
      </div>

      <div
        v-for="template in filteredTemplates"
        :key="template.id"
        class="p-6 hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-center justify-between">
          <!-- 模板信息 -->
          <div class="flex-1">
            <div class="flex items-center space-x-3">
              <h3 class="text-lg font-medium text-gray-900">{{ template.name }}</h3>
              <span
                :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  getStatusColor(template.status)
                ]"
              >
                {{ getStatusText(template.status) }}
              </span>
              <span
                :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  getTypeColor(template.type)
                ]"
              >
                {{ getTypeText(template.type) }}
              </span>
            </div>
            
            <p class="text-gray-600 mt-1">{{ template.description }}</p>
            
            <div class="flex items-center space-x-6 mt-3 text-sm text-gray-500">
              <span>基础价格: {{ formatCurrency(template.basePrice, template.currency) }}</span>
              <span>使用次数: {{ formatNumber(template.usageCount) }}</span>
              <span>更新时间: {{ formatDate(template.updatedAt) }}</span>
              <span>规则数量: {{ template.rules.length }}</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center space-x-2 ml-4">
            <button
              @click="$emit('viewTemplate', template)"
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="查看详情"
            >
              <Eye class="w-5 h-5" />
            </button>
            
            <button
              @click="$emit('editTemplate', template)"
              class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              title="编辑模板"
            >
              <Edit class="w-5 h-5" />
            </button>
            
            <button
              @click="$emit('duplicateTemplate', template)"
              class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="复制模板"
            >
              <Copy class="w-5 h-5" />
            </button>
            
            <button
              @click="$emit('toggleStatus', template.id)"
              :class="[
                'p-2 rounded-md transition-colors',
                template.status === 'active'
                  ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              ]"
              :title="template.status === 'active' ? '禁用模板' : '启用模板'"
            >
              <component :is="template.status === 'active' ? Pause : Play" class="w-5 h-5" />
            </button>
            
            <button
              @click="$emit('deleteTemplate', template.id)"
              class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="删除模板"
            >
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Copy, Edit, Eye, FileText, Pause, Play, Search, Trash2 } from 'lucide-vue-next'
import type { PriceTemplate, PricingFilters } from '../types/pricing.types'

interface Props {
  filteredTemplates: PriceTemplate[]
  filters: PricingFilters
  isLoading: boolean
  formatCurrency: (value: number, currency: string) => string
  formatNumber: (value: number) => string
  formatDate: (dateString: string) => string
}

interface Emits {
  (e: 'updateFilters', filters: Partial<PricingFilters>): void
  (e: 'createTemplate'): void
  (e: 'viewTemplate', template: PriceTemplate): void
  (e: 'editTemplate', template: PriceTemplate): void
  (e: 'duplicateTemplate', template: PriceTemplate): void
  (e: 'toggleStatus', templateId: string): void
  (e: 'deleteTemplate', templateId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 事件处理
const updateFilters = (newFilters: Partial<PricingFilters>) => {
  emit('updateFilters', newFilters)
}

const handleSortChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const [sortBy, sortOrder] = target.value.split('-')
  emit('updateFilters', { 
    sortBy: sortBy as PricingFilters['sortBy'], 
    sortOrder: sortOrder as PricingFilters['sortOrder'] 
  })
}

// 辅助函数
const getStatusColor = (status: PriceTemplate['status']) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-red-100 text-red-800'
    case 'draft':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: PriceTemplate['status']) => {
  switch (status) {
    case 'active':
      return '活跃'
    case 'inactive':
      return '禁用'
    case 'draft':
      return '草稿'
    default:
      return status
  }
}

const getTypeColor = (type: PriceTemplate['type']) => {
  switch (type) {
    case 'energy':
      return 'bg-blue-100 text-blue-800'
    case 'bandwidth':
      return 'bg-purple-100 text-purple-800'
    case 'mixed':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getTypeText = (type: PriceTemplate['type']) => {
  switch (type) {
    case 'energy':
      return '能量'
    case 'bandwidth':
      return '带宽'
    case 'mixed':
      return '混合'
    default:
      return type
  }
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('zh-CN').format(value)
}
</script>
