<template>
  <div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- 智能搜索框 -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">智能搜索</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref="searchInput"
            :value="searchQuery"
            type="text"
            placeholder="搜索订单号、地址、交易哈希、用户信息..."
            class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            @input="handleSearchInput"
            @focus="showSearchTips = true"
            @blur="hideSearchTips"
            @keydown.esc="clearSearch"
          />
          <!-- 清空按钮 -->
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X class="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
          
          <!-- 搜索提示和历史 -->
          <div
            v-if="showSearchTips && !searchQuery"
            class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10"
          >
            <!-- 搜索历史 -->
            <div v-if="searchHistory.length > 0" class="p-3 border-b border-gray-100">
              <div class="flex items-center justify-between mb-2">
                <div class="text-xs text-gray-600 font-medium">最近搜索：</div>
                <button
                  @click="clearSearchHistory"
                  class="text-xs text-gray-400 hover:text-gray-600"
                >
                  清空
                </button>
              </div>
              <div class="space-y-1">
                <button
                  v-for="(historyItem, index) in searchHistory.slice(0, 5)"
                  :key="index"
                  @click="applyHistorySearch(historyItem)"
                  class="flex items-center w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded"
                >
                  <Clock class="h-3 w-3 mr-2 text-gray-400" />
                  <span class="truncate">{{ historyItem }}</span>
                </button>
              </div>
            </div>
            
            <!-- 搜索提示 -->
            <div class="p-3">
              <div class="text-xs text-gray-600 mb-2 font-medium">支持搜索类型：</div>
              <div class="space-y-1 text-xs text-gray-500">
                <div>• <span class="font-mono bg-gray-100 px-1 rounded">#12345</span> 订单号</div>
                <div>• <span class="font-mono bg-gray-100 px-1 rounded">T...</span> TRON地址 (34位)</div>
                <div>• <span class="font-mono bg-gray-100 px-1 rounded">abc123...</span> 交易哈希 (64位)</div>
                <div>• <span class="font-mono bg-gray-100 px-1 rounded">123456</span> Telegram ID</div>
                <div>• <span class="font-mono bg-gray-100 px-1 rounded">用户名</span> 用户名/姓名</div>
              </div>
            </div>
          </div>
          
          <!-- 搜索状态指示 -->
          <div
            v-if="searchQuery"
            class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-sm z-10 p-2"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600">
                {{ getSearchTypeDisplay(searchQuery) }}
              </span>
              <span class="text-indigo-600">{{ searchResultCount }}条结果</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 状态过滤 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">订单状态</label>
        <select
          :value="filters.status"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          @change="handleStatusChange"
        >
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="processing">处理中</option>
          <option value="completed">已完成</option>
          <option value="manually_completed">已手动补单</option>
          <option value="failed">失败</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <!-- 时间范围 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
        <select
          :value="getTimeRangeValue()"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          @change="handleTimeRangeChange"
        >
          <option value="">全部时间</option>
          <option value="today">今天</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="quarter">本季度</option>
        </select>
      </div>
      
      <!-- 高级搜索切换按钮 -->
      <div class="md:col-span-4 border-t border-gray-200 pt-4">
        <button
          @click="toggleAdvancedSearch"
          class="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
        >
          <ChevronDown 
            :class="['h-4 w-4 mr-1 transform transition-transform duration-200', { 'rotate-180': showAdvancedSearch }]" 
          />
          {{ showAdvancedSearch ? '收起高级搜索' : '展开高级搜索' }}
        </button>
      </div>
    </div>

    <!-- 高级搜索面板 -->
    <div 
      v-if="showAdvancedSearch"
      class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
    >
      <!-- 三行两列布局 -->
      <div class="space-y-4">
        <!-- 第一行：订单类型、支付状态 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">订单类型</label>
            <select
              :value="filters.orderType || ''"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @change="handleOrderTypeChange"
            >
              <option value="">全部类型</option>
              <option value="energy_flash">能量闪租</option>
              <option value="transaction_package">笔数套餐</option>
              <option value="trx_exchange">TRX闪兑</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">支付状态</label>
            <select
              :value="filters.paymentStatus || ''"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @change="handlePaymentStatusChange"
            >
              <option value="">全部状态</option>
              <option value="unpaid">待支付</option>
              <option value="paid">已支付</option>
              <option value="refunded">已退款</option>
            </select>
          </div>
        </div>

        <!-- 第二行：开始时间、结束时间 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
            <input
              :value="filters.dateRange.start"
              type="date"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @change="handleStartDateChange"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
            <input
              :value="filters.dateRange.end"
              type="date"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @change="handleEndDateChange"
            />
          </div>
        </div>

        <!-- 第三行：金额范围、操作按钮 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">金额范围 (TRX)</label>
            <div class="flex space-x-2">
              <input
                :value="filters.minAmount || ''"
                type="number"
                placeholder="最小"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @input="handleMinAmountChange"
              />
              <span class="flex items-center text-gray-500">-</span>
              <input
                :value="filters.maxAmount || ''"
                type="number"
                placeholder="最大"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @input="handleMaxAmountChange"
              />
            </div>
          </div>
          
          <div class="flex items-end space-x-2">
            <button
              @click="applyAdvancedFilters"
              class="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              应用筛选
            </button>
            <button
              @click="clearAdvancedFilters"
              class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              重置
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, Clock, Search, X } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import type { OrderFilters, OrderStatus } from '../types/order.types'

interface Props {
  searchQuery: string
  filters: OrderFilters
  searchResultCount?: number
}

interface Emits {
  'update:searchQuery': [value: string]
  'update:filters': [filters: OrderFilters]
  'search': []
  'filter': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 组件状态
const searchInput = ref<HTMLInputElement>()
const showSearchTips = ref(false)
const showAdvancedSearch = ref(false)
const searchHistory = ref<string[]>([])

// 搜索历史相关常量
const SEARCH_HISTORY_KEY = 'order_search_history'
const MAX_HISTORY_ITEMS = 10

// 注意：handleSearchInput 在文件末尾重新定义以包含搜索历史功能

// 清空搜索
const clearSearch = () => {
  emit('update:searchQuery', '')
  emit('search')
  searchInput.value?.focus()
}

// 隐藏搜索提示 (延迟以允许点击)
const hideSearchTips = () => {
  setTimeout(() => {
    showSearchTips.value = false
  }, 200)
}

// 获取搜索类型显示文本
const getSearchTypeDisplay = (query: string): string => {
  if (!query) return ''
  
  const trimmedQuery = query.trim()
  
  if (trimmedQuery.startsWith('#')) {
    return '🔢 搜索订单号'
  } else if (trimmedQuery.startsWith('T') && trimmedQuery.length === 34) {
    return '📍 精确匹配TRON地址'
  } else if (trimmedQuery.length === 64 && /^[a-fA-F0-9]+$/.test(trimmedQuery)) {
    return '🔗 精确匹配交易哈希'
  } else if (/^\d+$/.test(trimmedQuery)) {
    return '👤 搜索用户ID/Telegram ID'
  } else {
    return '🔍 智能模糊搜索'
  }
}

// 处理状态变更
const handleStatusChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const status = target.value as OrderStatus | ''
  const newFilters: OrderFilters = { ...props.filters, status }
  emit('update:filters', newFilters)
  emit('filter')
}

// 获取时间范围值（简化处理）
const getTimeRangeValue = () => {
  // 这里可以根据dateRange计算出对应的时间范围值
  // 暂时返回空字符串
  return ''
}

// 处理时间范围变更
const handleTimeRangeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const timeRange = target.value
  
  // 根据时间范围设置dateRange
  let dateRange = { start: '', end: '' }
  const now = new Date()
  
  switch (timeRange) {
    case 'today':
      dateRange.start = now.toISOString().split('T')[0]
      dateRange.end = now.toISOString().split('T')[0]
      break
    case 'week':
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
      dateRange.start = weekStart.toISOString().split('T')[0]
      dateRange.end = new Date().toISOString().split('T')[0]
      break
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      dateRange.start = monthStart.toISOString().split('T')[0]
      dateRange.end = new Date().toISOString().split('T')[0]
      break
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      dateRange.start = quarterStart.toISOString().split('T')[0]
      dateRange.end = new Date().toISOString().split('T')[0]
      break
    default:
      dateRange = { start: '', end: '' }
  }
  
  const newFilters = { ...props.filters, dateRange }
  emit('update:filters', newFilters)
  emit('filter')
}

// 高级搜索相关方法
const toggleAdvancedSearch = () => {
  showAdvancedSearch.value = !showAdvancedSearch.value
}

const handleOrderTypeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newFilters = { ...props.filters, orderType: target.value || undefined }
  emit('update:filters', newFilters)
}

const handlePaymentStatusChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newFilters = { ...props.filters, paymentStatus: target.value || undefined }
  emit('update:filters', newFilters)
}

const handleMinAmountChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newFilters = { ...props.filters, minAmount: target.value ? Number(target.value) : undefined }
  emit('update:filters', newFilters)
}

const handleMaxAmountChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newFilters = { ...props.filters, maxAmount: target.value ? Number(target.value) : undefined }
  emit('update:filters', newFilters)
}

const handleStartDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newFilters = { 
    ...props.filters, 
    dateRange: { 
      ...props.filters.dateRange, 
      start: target.value 
    } 
  }
  emit('update:filters', newFilters)
}

const handleEndDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newFilters = { 
    ...props.filters, 
    dateRange: { 
      ...props.filters.dateRange, 
      end: target.value 
    } 
  }
  emit('update:filters', newFilters)
}

const applyAdvancedFilters = () => {
  emit('filter')
}

const clearAdvancedFilters = () => {
  const newFilters: OrderFilters = {
    search: props.filters.search, // 保留基本搜索
    status: '',
    dateRange: { start: '', end: '' },
    orderType: undefined,
    paymentStatus: undefined,
    minAmount: undefined,
    maxAmount: undefined
  }
  emit('update:filters', newFilters)
  emit('filter')
}

// 搜索历史管理
const loadSearchHistory = () => {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (history) {
      searchHistory.value = JSON.parse(history)
    }
  } catch (error) {
    console.error('加载搜索历史失败:', error)
    searchHistory.value = []
  }
}

const saveSearchHistory = () => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory.value))
  } catch (error) {
    console.error('保存搜索历史失败:', error)
  }
}

const addToSearchHistory = (searchTerm: string) => {
  if (!searchTerm.trim()) return
  
  // 移除重复项
  const filteredHistory = searchHistory.value.filter(item => item !== searchTerm)
  
  // 添加到开头
  searchHistory.value = [searchTerm, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS)
  
  // 保存到本地存储
  saveSearchHistory()
}

const applyHistorySearch = (searchTerm: string) => {
  emit('update:searchQuery', searchTerm)
  emit('search')
  showSearchTips.value = false
  
  // 重新排序历史记录
  addToSearchHistory(searchTerm)
}

const clearSearchHistory = () => {
  searchHistory.value = []
  saveSearchHistory()
}

// 重写搜索输入处理，添加历史记录功能
const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  
  emit('update:searchQuery', value)
  
  // 如果有搜索内容且不是退格，延迟添加到历史记录
  if (value.trim() && value.length > 2) {
    // 延迟添加，避免输入过程中频繁添加
    setTimeout(() => {
      if (props.searchQuery === value && value.trim()) {
        addToSearchHistory(value.trim())
      }
    }, 1000)
  }
  
  emit('search')
}

// 组件挂载时加载搜索历史
onMounted(() => {
  loadSearchHistory()
})
</script>