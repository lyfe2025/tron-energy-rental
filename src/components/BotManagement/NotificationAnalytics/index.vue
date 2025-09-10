<template>
  <div class="notification-analytics-panel">
    
    <!-- 时间范围选择器 -->
    <DateRangeSelector
      v-model="dateRange"
      :loading="loading"
      :exporting="exporting"
      @change="loadAnalyticsData"
      @export="exportReport"
      @refresh="loadAnalyticsData"
      @quick-range-change="setQuickRange"
    />

    <!-- 关键指标卡片 -->
    <MetricsCards :metrics="metrics" />

    <!-- 图表区域 -->
    <AnalyticsCharts
      ref="chartsRef"
      :trend-data="trendData"
      :distribution-data="distributionData"
      :update-trend-chart="updateTrendChart"
      :update-distribution-chart="updateDistributionChart"
      @trend-type-change="handleTrendTypeChange"
      @distribution-metric-change="handleDistributionMetricChange"
    />

    <!-- 详细统计表格 -->
    <StatisticsTable
      :detailed-stats="detailedStats"
      :pagination="pagination"
      :loading="loading"
      @view-details="viewDetails"
      @export-type-report="exportTypeReport"
      @optimize-suggestions="optimizeSuggestions"
      @page-change="loadDetailedStats"
      @page-size-change="loadDetailedStats"
    />

    <!-- 实时监控 -->
    <RealtimeMonitor
      :realtime-enabled="realtimeEnabled"
      :realtime-data="realtimeData"
      :realtime-logs="realtimeLogs"
      @toggle-realtime="toggleRealtime"
    />

    <!-- 性能分析 -->
    <PerformanceAnalysis
      ref="performanceRef"
      :performance-data="performanceData"
      :hourly-heatmap="hourlyHeatmap"
      :update-performance-charts="updatePerformanceCharts"
    />

    <!-- 详情对话框 -->
    <NotificationDetailsDialog
      ref="detailsDialogRef"
      v-model:visible="showDetailsDialog"
      :selected-notification="selectedNotification"
      :notification-errors="notificationErrors"
      :update-detail-trend-chart="updateDetailTrendChart"
    />

  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { nextTick, onMounted, ref } from 'vue'
import AnalyticsCharts from './components/AnalyticsCharts.vue'
import DateRangeSelector from './components/DateRangeSelector.vue'
import MetricsCards from './components/MetricsCards.vue'
import NotificationDetailsDialog from './components/NotificationDetailsDialog.vue'
import PerformanceAnalysis from './components/PerformanceAnalysis.vue'
import RealtimeMonitor from './components/RealtimeMonitor.vue'
import StatisticsTable from './components/StatisticsTable.vue'
import { useAnalyticsData } from './composables/useAnalyticsData'
import { useChartConfig } from './composables/useChartConfig'
import { useRealtimeData } from './composables/useRealtimeData'
import type { DetailedStat } from './types/analytics.types'

interface Props {
  botId: string
}

const props = defineProps<Props>()

// 使用composables
const {
  loading,
  dateRange,
  metrics,
  detailedStats,
  selectedNotification,
  notificationErrors,
  pagination,
  trendData,
  distributionData,
  performanceData,
  hourlyHeatmap,
  loadAnalyticsData,
  loadDetailedStats,
  loadNotificationDetails,
  setQuickRange
} = useAnalyticsData(props.botId)

const {
  realtimeEnabled,
  realtimeData,
  realtimeLogs,
  toggleRealtime
} = useRealtimeData(props.botId)

const {
  updateTrendChart,
  updateDistributionChart,
  updatePerformanceCharts,
  initDetailTrendChart,
  updateDetailTrendChart,
  initCharts
} = useChartConfig()

// 组件引用
const chartsRef = ref()
const performanceRef = ref()
const detailsDialogRef = ref()

// 其他状态
const exporting = ref(false)
const showDetailsDialog = ref(false)

// 图表引用获取
const getChartRefs = () => {
  return {
    trendChartRef: chartsRef.value?.trendChartRef,
    distributionChartRef: chartsRef.value?.distributionChartRef,
    responseTimeChartRef: performanceRef.value?.responseTimeChartRef,
    engagementChartRef: performanceRef.value?.engagementChartRef,
    detailTrendChartRef: detailsDialogRef.value?.detailTrendChartRef
  }
}

// 事件处理函数
const handleTrendTypeChange = (type: string) => {
  // 处理趋势图表类型变化
  loadAnalyticsData()
}

const handleDistributionMetricChange = (metric: string) => {
  // 处理分布指标变化
  loadAnalyticsData()
}

const viewDetails = async (notification: DetailedStat) => {
  selectedNotification.value = notification
  showDetailsDialog.value = true
  
  // 加载详细数据
  const detailTrendData = await loadNotificationDetails(notification.notification_type)
  
  // 初始化详情图表
  await nextTick()
  await initDetailTrendChart()
  
  if (detailTrendData) {
    updateDetailTrendChart(detailTrendData)
  }
}

const exportReport = () => {
  ElMessage.info('报告导出功能开发中...')
}

const exportTypeReport = (notification: DetailedStat) => {
  ElMessage.info(`导出 ${notification.notification_type} 报告功能开发中...`)
}

const optimizeSuggestions = (notification: DetailedStat) => {
  ElMessage.info(`${notification.notification_type} 优化建议功能开发中...`)
}

// 初始化图表并设置引用
const initializeCharts = async () => {
  await nextTick()
  
  // 等待所有子组件渲染完成
  await new Promise(resolve => setTimeout(resolve, 200))
  
  const refs = getChartRefs()
  
  // 将图表引用传递给chartConfig composable
  if (refs.trendChartRef) {
    useChartConfig().trendChartRef.value = refs.trendChartRef
  }
  if (refs.distributionChartRef) {
    useChartConfig().distributionChartRef.value = refs.distributionChartRef
  }
  if (refs.responseTimeChartRef) {
    useChartConfig().responseTimeChartRef.value = refs.responseTimeChartRef
  }
  if (refs.engagementChartRef) {
    useChartConfig().engagementChartRef.value = refs.engagementChartRef
  }
  
  // 初始化图表
  await initCharts()
}

// 生命周期
onMounted(async () => {
  // 设置默认时间范围（近7天）
  setQuickRange('week')
  
  // 初始化图表
  await initializeCharts()
})
</script>

<style scoped>
.notification-analytics-panel {
  @apply min-h-full;
}
</style>
