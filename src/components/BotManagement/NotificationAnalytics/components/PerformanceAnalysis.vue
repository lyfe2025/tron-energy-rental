<template>
  <div class="performance-analysis">
    <el-card>
      <template #header>
        <span class="text-gray-900 font-semibold">⚡ 性能分析</span>
      </template>
      
      <el-row :gutter="20">
        
        <el-col :span="8">
          <div class="performance-metric">
            <h4 class="text-gray-900 font-semibold mb-3">📊 响应时间分布</h4>
            <div ref="responseTimeChartRef" class="mini-chart"></div>
          </div>
        </el-col>
        
        <el-col :span="8">
          <div class="performance-metric">
            <h4 class="text-gray-900 font-semibold mb-3">📈 用户参与度</h4>
            <div ref="engagementChartRef" class="mini-chart"></div>
          </div>
        </el-col>
        
        <el-col :span="8">
          <div class="performance-metric">
            <h4 class="text-gray-900 font-semibold mb-3">🎯 热门时段</h4>
            <div class="heatmap-container">
              <div 
                v-for="(hour, index) in hourlyHeatmap" 
                :key="index"
                class="heatmap-cell"
                :style="{ backgroundColor: getHeatmapColor(hour.value) }"
                :title="`${hour.hour}:00 - 发送量: ${hour.value}`"
              >
                {{ hour.hour }}
              </div>
            </div>
          </div>
        </el-col>
        
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { HourlyHeatmapItem, PerformanceData } from '../types/analytics.types'

interface Props {
  performanceData: PerformanceData | null
  hourlyHeatmap: HourlyHeatmapItem[]
  updatePerformanceCharts: (data: any) => void
}

const props = defineProps<Props>()

const responseTimeChartRef = ref<HTMLElement>()
const engagementChartRef = ref<HTMLElement>()

// 监听性能数据变化并更新图表
watch(() => props.performanceData, (newData) => {
  if (newData) {
    props.updatePerformanceCharts(newData)
  }
}, { deep: true })

// 暴露图表引用给父组件
defineExpose({
  responseTimeChartRef,
  engagementChartRef
})

// 工具函数
const getHeatmapColor = (value: number) => {
  if (props.hourlyHeatmap.length === 0) return 'rgba(64, 158, 255, 0.1)'
  
  const max = Math.max(...props.hourlyHeatmap.map(h => h.value))
  const intensity = value / max
  return `rgba(64, 158, 255, ${intensity})`
}

onMounted(() => {
  // 初始化时更新图表
  if (props.performanceData) {
    props.updatePerformanceCharts(props.performanceData)
  }
})
</script>

<style scoped>
:deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm;
}

:deep(.el-card__header) {
  @apply bg-gray-800 border-gray-700;
}

.performance-metric {
  @apply bg-gray-800 rounded p-4 border border-gray-700;
}

.mini-chart {
  @apply h-48;
}

.heatmap-container {
  @apply grid grid-cols-8 gap-1;
}

.heatmap-cell {
  @apply w-8 h-8 rounded text-xs flex items-center justify-center text-gray-900 font-medium cursor-pointer;
}
</style>
