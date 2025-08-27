<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">统计分析</h1>
        <p class="text-gray-600 mt-1">查看TRON能量租赁系统的详细统计数据和分析报表</p>
      </div>
      <div class="flex gap-3 mt-4 sm:mt-0">
        <button
          @click="refreshData"
          :disabled="isLoading"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RotateCcw :class="{ 'animate-spin': isLoading }" class="w-4 h-4" />
          刷新数据
        </button>
        <button
          @click="handleExportReport"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Download class="w-4 h-4" />
          导出报表
        </button>
      </div>
    </div>

    <!-- Time Range Selector -->
    <TimeRangeSelector
      :filters="filters"
      :last-updated="lastUpdated"
      @update:filters="updateFilters"
      @setTimeRange="setTimeRange"
      @setCustomDateRange="setCustomDateRange"
      class="mb-6"
    />

    <!-- Statistics Overview -->
    <StatisticsOverview
      :overview="overview"
      :format-currency="formatCurrency"
      :format-number="formatNumber"
      :format-percentage="formatPercentage"
      :get-growth-color="getGrowthColor"
      class="mb-6"
    />

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Revenue Chart -->
      <RevenueChart
        :revenue-data="revenueData"
        :is-loading="isLoading"
        :format-currency="formatCurrency"
      />

      <!-- Order Status Chart -->
      <OrderStatusChart
        :order-status-data="orderStatusData"
        :is-loading="isLoading"
        :format-number="formatNumber"
        :format-percentage="formatPercentage"
        @filterByStatus="handleFilterByStatus"
      />
    </div>

    <!-- Additional Charts -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <!-- User Growth Chart -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">用户增长趋势</h3>
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-blue-500 rounded"></div>
            <span class="text-sm text-gray-600">新增用户</span>
            <div class="w-3 h-3 bg-green-500 rounded ml-4"></div>
            <span class="text-sm text-gray-600">总用户数</span>
          </div>
        </div>
        
        <div v-if="isLoading" class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
        
        <div v-else class="h-64">
          <div class="flex items-end space-x-1 h-full">
            <div
              v-for="(item, index) in userGrowthData.slice(-15)"
              :key="index"
              class="flex-1 relative group"
            >
              <!-- 新增用户 -->
              <div
                class="bg-blue-200 hover:bg-blue-300 transition-colors rounded-t cursor-pointer"
                :style="{ height: `${(item.newUsers / maxNewUsers) * 60}%` }"
                :title="`${formatDate(item.date)}: ${item.newUsers}新增用户`"
              ></div>
              <!-- 总用户数 -->
              <div
                class="bg-green-200 hover:bg-green-300 transition-colors rounded-b cursor-pointer mt-1"
                :style="{ height: `${(item.totalUsers / maxTotalUsers) * 40}%` }"
                :title="`总用户: ${formatNumber(item.totalUsers)}`"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Users -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">消费排行榜</h3>
        
        <div v-if="isLoading" class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
        
        <div v-else-if="topUsersData.length === 0" class="flex items-center justify-center h-64">
          <div class="text-center">
            <Users class="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p class="text-gray-500">暂无用户数据</p>
          </div>
        </div>
        
        <div v-else class="space-y-3">
          <div
            v-for="(user, index) in topUsersData.slice(0, 10)"
            :key="user.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center space-x-3">
              <div
                :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white',
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300 text-gray-700'
                ]"
              >
                {{ index + 1 }}
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ user.username }}</p>
                <p class="text-sm text-gray-500">{{ user.ordersCount }} 订单</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold text-gray-900">{{ formatCurrency(user.totalSpent) }}</p>
              <p class="text-sm text-gray-500">{{ formatDate(user.lastOrderDate) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RotateCcw, Download, Users } from 'lucide-vue-next'
import StatisticsOverview from './Statistics/components/StatisticsOverview.vue'
import TimeRangeSelector from './Statistics/components/TimeRangeSelector.vue'
import RevenueChart from './Statistics/components/RevenueChart.vue'
import OrderStatusChart from './Statistics/components/OrderStatusChart.vue'
import { useStatistics } from './Statistics/composables/useStatistics'
import type { ExportOptions } from './Statistics/types/statistics.types'

const {
  // 响应式数据
  overview,
  revenueData,
  orderStatusData,
  userGrowthData,
  energyUsageData,
  topUsersData,
  filters,
  isLoading,
  lastUpdated,
  
  // 计算属性
  isDataLoaded,
  
  // 方法
  loadStatistics,
  updateFilters,
  setTimeRange,
  setCustomDateRange,
  refreshData,
  exportReport,
  formatCurrency,
  formatNumber,
  formatPercentage,
  getGrowthColor
} = useStatistics()

// 计算用户增长数据的最大值
const maxNewUsers = computed(() => {
  return Math.max(...userGrowthData.value.map(item => item.newUsers))
})

const maxTotalUsers = computed(() => {
  return Math.max(...userGrowthData.value.map(item => item.totalUsers))
})

// 事件处理
const handleExportReport = () => {
  const exportOptions: ExportOptions = {
    format: 'pdf',
    includeCharts: true,
    dateRange: filters.value.dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    sections: ['overview', 'revenue', 'orders', 'users']
  }
  
  exportReport(exportOptions)
}

const handleFilterByStatus = (status: string) => {
  console.log('Filter by status:', status)
  // 这里可以跳转到订单页面并应用状态筛选
}

// 格式化函数
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric' 
  })
}
</script>
