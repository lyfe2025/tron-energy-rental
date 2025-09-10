<template>
  <div class="charts-section mb-6">
    <el-row :gutter="20">
      
      <!-- 发送趋势图 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span class="text-gray-900 font-semibold">📈 发送趋势分析</span>
              <el-select v-model="trendChartType" size="small" class="w-32" @change="$emit('trend-type-change', trendChartType)">
                <el-option label="按小时" value="hourly" />
                <el-option label="按天" value="daily" />
                <el-option label="按周" value="weekly" />
              </el-select>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      
      <!-- 通知类型分布 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span class="text-gray-900 font-semibold">🎯 通知类型分布</span>
              <el-select v-model="distributionMetric" size="small" class="w-32" @change="$emit('distribution-metric-change', distributionMetric)">
                <el-option label="发送量" value="count" />
                <el-option label="成功率" value="success_rate" />
                <el-option label="点击率" value="click_rate" />
              </el-select>
            </div>
          </template>
          <div ref="distributionChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { ChartData } from '../types/analytics.types'

interface Props {
  trendData: ChartData | null
  distributionData: Array<{name: string, value: number}>
  updateTrendChart: (data: ChartData) => void
  updateDistributionChart: (data: Array<{name: string, value: number}>) => void
}

interface Emits {
  (e: 'trend-type-change', type: string): void
  (e: 'distribution-metric-change', metric: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const trendChartType = ref('daily')
const distributionMetric = ref('count')
const trendChartRef = ref<HTMLElement>()
const distributionChartRef = ref<HTMLElement>()

// 监听数据变化并更新图表
watch(() => props.trendData, (newData) => {
  if (newData) {
    props.updateTrendChart(newData)
  }
}, { deep: true })

watch(() => props.distributionData, (newData) => {
  if (newData) {
    props.updateDistributionChart(newData)
  }
}, { deep: true })

// 暴露图表引用给父组件
defineExpose({
  trendChartRef,
  distributionChartRef
})

onMounted(() => {
  // 初始化时更新图表
  if (props.trendData) {
    props.updateTrendChart(props.trendData)
  }
  if (props.distributionData) {
    props.updateDistributionChart(props.distributionData)
  }
})
</script>

<style scoped>
:deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow;
}

:deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.card-header {
  @apply flex items-center justify-between;
}

.card-header h3 {
  @apply text-gray-900 font-semibold;
}

.chart-container {
  @apply h-80;
}

:deep(.el-select .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500;
}

/* 选择器样式优化 */
:deep(.el-select-dropdown) {
  @apply bg-white border-gray-200 shadow-lg;
}

:deep(.el-option) {
  @apply text-gray-900;
}

:deep(.el-option:hover) {
  @apply bg-blue-50;
}

:deep(.el-option.selected) {
  @apply bg-blue-600 text-white;
}
</style>
