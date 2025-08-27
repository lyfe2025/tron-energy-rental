<template>
  <div class="space-y-6">
    <!-- 页面头部 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">统计分析</h1>
        <p class="mt-1 text-sm text-gray-500">查看TRON能量租赁系统的详细统计数据和分析报表</p>
      </div>
      <div class="mt-4 sm:mt-0 flex space-x-3">
        <button
          @click="refreshData"
          :disabled="isLoading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': isLoading }]" />
          刷新数据
        </button>
        <button
          @click="exportReport"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Download class="h-4 w-4 mr-2" />
          导出报表
        </button>
      </div>
    </div>

    <!-- 时间范围选择 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <Calendar class="h-5 w-5 text-gray-400" />
            <span class="text-sm font-medium text-gray-700">时间范围:</span>
          </div>
          <select
            v-model="timeRange"
            @change="loadStatistics"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="today">今日</option>
            <option value="yesterday">昨日</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="quarter">本季度</option>
            <option value="year">本年</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        
        <div v-if="timeRange === 'custom'" class="flex items-center space-x-2">
          <input
            v-model="customStartDate"
            type="date"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span class="text-gray-500">至</span>
          <input
            v-model="customEndDate"
            type="date"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            @click="loadStatistics"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            查询
          </button>
        </div>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div 
        v-for="metric in coreMetrics" 
        :key="metric.label"
        class="bg-white rounded-lg shadow-sm p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">{{ metric.label }}</p>
            <p class="text-2xl font-bold text-gray-900 mt-2">{{ metric.value }}</p>
            <div v-if="metric.change" class="flex items-center mt-2">
              <component 
                :is="metric.changeDirection === 'up' ? TrendingUp : TrendingDown" 
                :class="['h-4 w-4 mr-1', metric.changeDirection === 'up' ? 'text-green-500' : 'text-red-500']"
              />
              <span :class="['text-sm', metric.changeDirection === 'up' ? 'text-green-600' : 'text-red-600']">
                {{ metric.change }}
              </span>
              <span class="text-sm text-gray-500 ml-1">vs 上期</span>
            </div>
          </div>
          <div :class="['h-12 w-12 rounded-lg flex items-center justify-center', metric.bgColor]">
            <component :is="metric.icon" :class="['h-6 w-6', metric.iconColor]" />
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 订单趋势图 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">订单趋势</h3>
          <div class="flex items-center space-x-2">
            <button
              v-for="period in ['7d', '30d', '90d']"
              :key="period"
              @click="orderTrendPeriod = period; loadOrderTrend()"
              :class="[
                'px-3 py-1 text-sm rounded-md',
                orderTrendPeriod === period 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700'
              ]"
            >
              {{ period === '7d' ? '7天' : period === '30d' ? '30天' : '90天' }}
            </button>
          </div>
        </div>
        <div class="h-80">
          <div v-if="isLoadingOrderTrend" class="flex items-center justify-center h-full">
            <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
          </div>
          <div v-else-if="orderTrendData.length > 0" class="h-full">
            <!-- 这里使用 recharts 组件 -->
            <div class="w-full h-full" ref="orderTrendChart"></div>
          </div>
          <div v-else class="flex items-center justify-center h-full text-gray-500">
            暂无数据
          </div>
        </div>
      </div>

      <!-- 收入分析图 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">收入分析</h3>
          <select
            v-model="revenueAnalysisType"
            @change="loadRevenueAnalysis"
            class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="daily">日收入</option>
            <option value="weekly">周收入</option>
            <option value="monthly">月收入</option>
          </select>
        </div>
        <div class="h-80">
          <div v-if="isLoadingRevenue" class="flex items-center justify-center h-full">
            <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
          </div>
          <div v-else-if="revenueData.length > 0" class="h-full">
            <div class="w-full h-full" ref="revenueChart"></div>
          </div>
          <div v-else class="flex items-center justify-center h-full text-gray-500">
            暂无数据
          </div>
        </div>
      </div>
    </div>

    <!-- 用户分析和机器人状态 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 用户分析 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-6">用户分析</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center">
              <Users class="h-5 w-5 text-blue-500 mr-3" />
              <span class="text-sm font-medium text-gray-900">新增用户</span>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-gray-900">{{ userAnalysis.newUsers }}</div>
              <div class="text-sm text-gray-500">{{ timeRangeText }}</div>
            </div>
          </div>
          
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center">
              <UserCheck class="h-5 w-5 text-green-500 mr-3" />
              <span class="text-sm font-medium text-gray-900">活跃用户</span>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-gray-900">{{ userAnalysis.activeUsers }}</div>
              <div class="text-sm text-gray-500">{{ timeRangeText }}</div>
            </div>
          </div>
          
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center">
              <DollarSign class="h-5 w-5 text-yellow-500 mr-3" />
              <span class="text-sm font-medium text-gray-900">付费用户</span>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-gray-900">{{ userAnalysis.payingUsers }}</div>
              <div class="text-sm text-gray-500">转化率: {{ userAnalysis.conversionRate }}%</div>
            </div>
          </div>
          
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center">
              <TrendingUp class="h-5 w-5 text-purple-500 mr-3" />
              <span class="text-sm font-medium text-gray-900">用户留存</span>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-gray-900">{{ userAnalysis.retentionRate }}%</div>
              <div class="text-sm text-gray-500">7日留存率</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 机器人状态分布 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-6">机器人状态分布</h3>
        <div class="h-64">
          <div v-if="isLoadingBotStatus" class="flex items-center justify-center h-full">
            <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
          </div>
          <div v-else-if="botStatusData.length > 0" class="h-full">
            <div class="w-full h-full" ref="botStatusChart"></div>
          </div>
          <div v-else class="flex items-center justify-center h-full text-gray-500">
            暂无数据
          </div>
        </div>
        
        <!-- 机器人状态统计 -->
        <div class="mt-6 grid grid-cols-2 gap-4">
          <div 
            v-for="status in botStatusStats" 
            :key="status.label"
            class="text-center p-3 bg-gray-50 rounded-lg"
          >
            <div :class="['text-lg font-bold', status.color]">{{ status.count }}</div>
            <div class="text-sm text-gray-600">{{ status.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 能量包销售排行 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-medium text-gray-900">能量包销售排行</h3>
        <select
          v-model="packageRankingPeriod"
          @change="loadPackageRanking"
          class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="today">今日</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
        </select>
      </div>
      
      <div v-if="isLoadingPackageRanking" class="flex items-center justify-center py-8">
        <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
        <span class="ml-2 text-gray-600">加载中...</span>
      </div>
      
      <div v-else-if="packageRankingData.length > 0" class="space-y-4">
        <div 
          v-for="(pkg, index) in packageRankingData" 
          :key="pkg.id"
          class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <div class="flex items-center">
            <div 
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mr-4',
                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
              ]"
            >
              {{ index + 1 }}
            </div>
            <div>
              <div class="font-medium text-gray-900">{{ pkg.name }}</div>
              <div class="text-sm text-gray-500">{{ getPackageTypeText(pkg.type) }}</div>
            </div>
          </div>
          
          <div class="text-right">
            <div class="font-medium text-gray-900">{{ pkg.sales_count }} 销量</div>
            <div class="text-sm text-gray-500">{{ formatCurrency(pkg.revenue) }} TRX</div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-8 text-gray-500">
        暂无销售数据
      </div>
    </div>

    <!-- 详细数据表格 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">详细数据</h3>
          <div class="flex items-center space-x-3">
            <select
              v-model="detailDataType"
              @change="loadDetailData"
              class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="orders">订单数据</option>
              <option value="users">用户数据</option>
              <option value="bots">机器人数据</option>
              <option value="packages">能量包数据</option>
            </select>
            <button
              @click="exportDetailData"
              class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download class="h-4 w-4 mr-2" />
              导出
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="isLoadingDetailData" class="flex items-center justify-center py-12">
        <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
        <span class="ml-2 text-gray-600">加载中...</span>
      </div>
      
      <div v-else-if="detailData.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th 
                v-for="column in detailDataColumns" 
                :key="column.key"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="row in paginatedDetailData" 
              :key="row.id"
              class="hover:bg-gray-50"
            >
              <td 
                v-for="column in detailDataColumns" 
                :key="column.key"
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
              >
                {{ formatDetailDataValue(row[column.key], column.type) }}
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- 分页 -->
        <div class="px-6 py-4 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
              显示 {{ (detailCurrentPage - 1) * detailPageSize + 1 }} 到 {{ Math.min(detailCurrentPage * detailPageSize, detailData.length) }} 条，
              共 {{ detailData.length }} 条记录
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="detailCurrentPage--"
                :disabled="detailCurrentPage === 1"
                class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span class="px-3 py-1 text-sm text-gray-700">
                {{ detailCurrentPage }} / {{ detailTotalPages }}
              </span>
              <button
                @click="detailCurrentPage++"
                :disabled="detailCurrentPage === detailTotalPages"
                class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-12 text-gray-500">
        暂无数据
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { statisticsAPI } from '@/services/api'
import {
    Bot,
    Calendar,
    DollarSign,
    Download,
    Loader2,
    RefreshCw,
    ShoppingCart,
    TrendingDown,
    TrendingUp,
    UserCheck,
    Users
} from 'lucide-vue-next'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'

// 响应式数据
const isLoading = ref(false)
const timeRange = ref('today')
const customStartDate = ref('')
const customEndDate = ref('')

// 图表相关
const orderTrendPeriod = ref('7d')
const revenueAnalysisType = ref('daily')
const packageRankingPeriod = ref('today')
const detailDataType = ref('orders')

// 加载状态
const isLoadingOrderTrend = ref(false)
const isLoadingRevenue = ref(false)
const isLoadingBotStatus = ref(false)
const isLoadingPackageRanking = ref(false)
const isLoadingDetailData = ref(false)

// 数据
const orderTrendData = ref<any[]>([])
const revenueData = ref<any[]>([])
const botStatusData = ref<any[]>([])
const packageRankingData = ref<any[]>([])
const detailData = ref<any[]>([])
const detailCurrentPage = ref(1)
const detailPageSize = ref(20)

// 核心指标
const coreMetrics = ref([
  {
    label: '总订单数',
    value: '0',
    change: null,
    changeDirection: 'up',
    icon: ShoppingCart,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    label: '总收入',
    value: '0 TRX',
    change: null,
    changeDirection: 'up',
    icon: DollarSign,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    label: '活跃用户',
    value: '0',
    change: null,
    changeDirection: 'up',
    icon: Users,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  {
    label: '在线机器人',
    value: '0',
    change: null,
    changeDirection: 'up',
    icon: Bot,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  }
])

// 用户分析数据
const userAnalysis = reactive({
  newUsers: 0,
  activeUsers: 0,
  payingUsers: 0,
  conversionRate: 0,
  retentionRate: 0
})

// 机器人状态统计
const botStatusStats = ref([
  { label: '在线', count: 0, color: 'text-green-600' },
  { label: '离线', count: 0, color: 'text-gray-600' },
  { label: '错误', count: 0, color: 'text-red-600' },
  { label: '维护', count: 0, color: 'text-yellow-600' }
])

// 计算属性
const timeRangeText = computed(() => {
  const rangeMap: Record<string, string> = {
    today: '今日',
    yesterday: '昨日',
    week: '本周',
    month: '本月',
    quarter: '本季度',
    year: '本年',
    custom: '自定义'
  }
  return rangeMap[timeRange.value] || ''
})

const detailDataColumns = computed(() => {
  const columnMap: Record<string, any[]> = {
    orders: [
      { key: 'id', label: '订单ID', type: 'text' },
      { key: 'user_id', label: '用户ID', type: 'text' },
      { key: 'package_name', label: '能量包', type: 'text' },
      { key: 'amount', label: '金额', type: 'currency' },
      { key: 'status', label: '状态', type: 'text' },
      { key: 'created_at', label: '创建时间', type: 'datetime' }
    ],
    users: [
      { key: 'id', label: '用户ID', type: 'text' },
      { key: 'username', label: '用户名', type: 'text' },
      { key: 'balance', label: '余额', type: 'currency' },
      { key: 'total_orders', label: '订单数', type: 'number' },
      { key: 'total_spent', label: '总消费', type: 'currency' },
      { key: 'last_login', label: '最后登录', type: 'datetime' }
    ],
    bots: [
      { key: 'id', label: '机器人ID', type: 'text' },
      { key: 'name', label: '名称', type: 'text' },
      { key: 'status', label: '状态', type: 'text' },
      { key: 'balance', label: '余额', type: 'currency' },
      { key: 'total_orders', label: '处理订单', type: 'number' },
      { key: 'last_active', label: '最后活跃', type: 'datetime' }
    ],
    packages: [
      { key: 'id', label: '能量包ID', type: 'text' },
      { key: 'name', label: '名称', type: 'text' },
      { key: 'type', label: '类型', type: 'text' },
      { key: 'price', label: '价格', type: 'currency' },
      { key: 'sales_count', label: '销量', type: 'number' },
      { key: 'revenue', label: '收入', type: 'currency' }
    ]
  }
  return columnMap[detailDataType.value] || []
})

const detailTotalPages = computed(() => {
  return Math.ceil(detailData.value.length / detailPageSize.value)
})

const paginatedDetailData = computed(() => {
  const start = (detailCurrentPage.value - 1) * detailPageSize.value
  const end = start + detailPageSize.value
  return detailData.value.slice(start, end)
})

// 方法
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

const formatNumber = (num: number) => {
  return num.toLocaleString('zh-CN')
}

const formatDetailDataValue = (value: any, type: string) => {
  if (value === null || value === undefined) return '-'
  
  switch (type) {
    case 'currency':
      return formatCurrency(value) + ' TRX'
    case 'number':
      return formatNumber(value)
    case 'datetime':
      return new Date(value).toLocaleString('zh-CN')
    default:
      return value
  }
}

const getPackageTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    energy: '纯能量',
    bandwidth: '纯带宽',
    mixed: '混合包'
  }
  return typeMap[type] || type
}

// 加载统计数据
const loadStatistics = async () => {
  try {
    isLoading.value = true
    
    const params = {
      time_range: timeRange.value,
      start_date: customStartDate.value,
      end_date: customEndDate.value
    }
    
    const response = await statisticsAPI.getOverview()
    
    if (response?.data?.success && response?.data?.data) {
      const data = response.data.data
      
      // 更新核心指标 - 添加数组边界检查和完善的空值处理
      if (coreMetrics.value[0]) {
        coreMetrics.value[0].value = formatNumber(Number(data.total_orders) || 0)
        coreMetrics.value[0].change = (data as any).orders_change ? `${(data as any).orders_change > 0 ? '+' : ''}${(data as any).orders_change}%` : null
        coreMetrics.value[0].changeDirection = ((data as any).orders_change || 0) >= 0 ? 'up' : 'down'
      }
      
      if (coreMetrics.value[1]) {
        coreMetrics.value[1].value = formatCurrency(Number(data.total_revenue) || 0) + ' TRX'
        coreMetrics.value[1].change = (data as any).revenue_change ? `${(data as any).revenue_change > 0 ? '+' : ''}${(data as any).revenue_change}%` : null
        coreMetrics.value[1].changeDirection = ((data as any).revenue_change || 0) >= 0 ? 'up' : 'down'
      }
      
      if (coreMetrics.value[2]) {
        coreMetrics.value[2].value = formatNumber(Number((data as any).active_users) || 0)
        coreMetrics.value[2].change = (data as any).users_change ? `${(data as any).users_change > 0 ? '+' : ''}${(data as any).users_change}%` : null
        coreMetrics.value[2].changeDirection = ((data as any).users_change || 0) >= 0 ? 'up' : 'down'
      }
      
      if (coreMetrics.value[3]) {
        coreMetrics.value[3].value = formatNumber(Number((data as any).online_bots) || 0)
        coreMetrics.value[3].change = (data as any).bots_change ? `${(data as any).bots_change > 0 ? '+' : ''}${(data as any).bots_change}%` : null
        coreMetrics.value[3].changeDirection = ((data as any).bots_change || 0) >= 0 ? 'up' : 'down'
      }
      
      // 更新用户分析 - 使用默认值避免类型错误
      Object.assign(userAnalysis, {
        newUsers: Number((data as any).new_users) || 0,
        activeUsers: Number((data as any).active_users) || 0,
        payingUsers: Number((data as any).paying_users) || 0,
        conversionRate: Number((data as any).conversion_rate) || 0,
        retentionRate: Number((data as any).retention_rate) || 0
      })
    } else {
      console.warn('统计数据响应格式异常:', response)
      // 设置默认值
      coreMetrics.value.forEach(metric => {
        metric.value = '0'
        metric.change = null
        metric.changeDirection = 'up'
      })
      Object.assign(userAnalysis, {
        newUsers: 0,
        activeUsers: 0,
        payingUsers: 0,
        conversionRate: 0,
        retentionRate: 0
      })
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    // 设置默认值，避免页面崩溃
    coreMetrics.value.forEach(metric => {
      metric.value = '0'
      metric.change = null
      metric.changeDirection = 'up'
    })
    Object.assign(userAnalysis, {
      newUsers: 0,
      activeUsers: 0,
      payingUsers: 0,
      conversionRate: 0,
      retentionRate: 0
    })
  } finally {
    isLoading.value = false
  }
}

// 加载订单趋势
const loadOrderTrend = async () => {
  try {
    isLoadingOrderTrend.value = true
    
    const response = await statisticsAPI.getOrderTrend({
      period: orderTrendPeriod.value
    })
    
    if (response.data.success) {
      orderTrendData.value = response.data.data || []
      await nextTick()
      renderOrderTrendChart()
    }
  } catch (error) {
    console.error('加载订单趋势失败:', error)
  } finally {
    isLoadingOrderTrend.value = false
  }
}

// 加载收入分析
const loadRevenueAnalysis = async () => {
  try {
    isLoadingRevenue.value = true
    
    const response = await statisticsAPI.getRevenueAnalysis({
      period: revenueAnalysisType.value
    })
    
    if (response.data.success) {
      revenueData.value = response.data.data || []
      await nextTick()
      renderRevenueChart()
    }
  } catch (error) {
    console.error('加载收入分析失败:', error)
  } finally {
    isLoadingRevenue.value = false
  }
}

// 加载机器人状态
const loadBotStatus = async () => {
  try {
    isLoadingBotStatus.value = true
    
    const response = await statisticsAPI.getBotStatus()
    
    if (response?.data?.success && response?.data?.data) {
      const data = response.data.data
      // 添加完善的空值检查
      botStatusData.value = Array.isArray(data.chart_data) ? data.chart_data : []
      
      // 更新状态统计 - 添加数组边界检查
      if (botStatusStats.value[0]) {
        botStatusStats.value[0].count = Number(data.online) || 0
      }
      if (botStatusStats.value[1]) {
        botStatusStats.value[1].count = Number(data.offline) || 0
      }
      if (botStatusStats.value[2]) {
        botStatusStats.value[2].count = Number(data.error) || 0
      }
      if (botStatusStats.value[3]) {
        botStatusStats.value[3].count = Number(data.maintenance) || 0
      }
      
      await nextTick()
      renderBotStatusChart()
    } else {
      console.warn('机器人状态数据响应格式异常:', response)
      // 设置默认值
      botStatusData.value = []
      botStatusStats.value.forEach(stat => {
        stat.count = 0
      })
    }
  } catch (error) {
    console.error('加载机器人状态失败:', error)
    // 设置默认值，避免页面崩溃
    botStatusData.value = []
    botStatusStats.value.forEach(stat => {
      stat.count = 0
    })
  } finally {
    isLoadingBotStatus.value = false
  }
}

// 加载能量包排行
const loadPackageRanking = async () => {
  try {
    isLoadingPackageRanking.value = true
    
    const response = await statisticsAPI.getPackageRanking({
      period: packageRankingPeriod.value
    })
    
    if (response.data.success) {
      packageRankingData.value = response.data.data || []
    }
  } catch (error) {
    console.error('加载能量包排行失败:', error)
  } finally {
    isLoadingPackageRanking.value = false
  }
}

// 加载详细数据
const loadDetailData = async () => {
  try {
    isLoadingDetailData.value = true
    detailCurrentPage.value = 1
    
    const response = await statisticsAPI.getDetailData({
      period: detailDataType.value,
      start_date: customStartDate.value,
      end_date: customEndDate.value
    })
    
    if (response.data.success) {
      detailData.value = response.data.data || []
    }
  } catch (error) {
    console.error('加载详细数据失败:', error)
  } finally {
    isLoadingDetailData.value = false
  }
}

// 图表渲染方法（简化版，实际应使用 recharts）
const renderOrderTrendChart = () => {
  // TODO: 使用 recharts 渲染订单趋势图
  console.log('渲染订单趋势图:', orderTrendData.value)
}

const renderRevenueChart = () => {
  // TODO: 使用 recharts 渲染收入分析图
  console.log('渲染收入分析图:', revenueData.value)
}

const renderBotStatusChart = () => {
  // TODO: 使用 recharts 渲染机器人状态饼图
  console.log('渲染机器人状态图:', botStatusData.value)
}

// 刷新所有数据
const refreshData = async () => {
  await Promise.all([
    loadStatistics(),
    loadOrderTrend(),
    loadRevenueAnalysis(),
    loadBotStatus(),
    loadPackageRanking(),
    loadDetailData()
  ])
}

// 导出功能
const exportReport = () => {
  const reportData = {
    time_range: timeRangeText.value,
    generated_at: new Date().toLocaleString('zh-CN'),
    core_metrics: coreMetrics.value.map(m => ({
      label: m.label,
      value: m.value,
      change: m.change
    })),
    user_analysis: userAnalysis,
    bot_status: botStatusStats.value,
    package_ranking: packageRankingData.value.slice(0, 10)
  }
  
  const jsonContent = JSON.stringify(reportData, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `statistics_report_${new Date().toISOString().split('T')[0]}.json`
  link.click()
}

const exportDetailData = () => {
  if (detailData.value.length === 0) {
    alert('暂无数据可导出')
    return
  }
  
  const headers = detailDataColumns.value.map(col => col.label)
  const csvContent = [
    headers.join(','),
    ...detailData.value.map(row => 
      detailDataColumns.value.map(col => 
        formatDetailDataValue(row[col.key], col.type)
      ).join(',')
    )
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${detailDataType.value}_data_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

// 生命周期
onMounted(() => {
  // 设置默认日期
  const today = new Date()
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  customStartDate.value = lastWeek.toISOString().split('T')[0]
  customEndDate.value = today.toISOString().split('T')[0]
  
  // 加载初始数据
  refreshData()
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>