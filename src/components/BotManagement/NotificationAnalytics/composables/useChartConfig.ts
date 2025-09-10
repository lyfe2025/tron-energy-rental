import * as echarts from 'echarts'
import { nextTick, onUnmounted, ref } from 'vue'
import type { ChartData } from '../types/analytics.types'

export function useChartConfig() {
  // 图表引用
  const trendChartRef = ref<HTMLElement>()
  const distributionChartRef = ref<HTMLElement>()
  const responseTimeChartRef = ref<HTMLElement>()
  const engagementChartRef = ref<HTMLElement>()
  const detailTrendChartRef = ref<HTMLElement>()

  // 图表实例
  let trendChart: echarts.ECharts | null = null
  let distributionChart: echarts.ECharts | null = null
  let responseTimeChart: echarts.ECharts | null = null
  let engagementChart: echarts.ECharts | null = null
  let detailTrendChart: echarts.ECharts | null = null

  const disposeCharts = () => {
    trendChart?.dispose()
    distributionChart?.dispose()
    responseTimeChart?.dispose()
    engagementChart?.dispose()
    detailTrendChart?.dispose()
  }

  // 清理图表 - 必须在任何async操作之前注册
  onUnmounted(() => {
    disposeCharts()
  })

  const initCharts = async () => {
    await nextTick()
    
    // 等待DOM渲染完成并确保容器有尺寸
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 初始化趋势图表
    if (trendChartRef.value && trendChartRef.value.clientWidth > 0) {
      trendChart = echarts.init(trendChartRef.value, 'dark')
    }
    
    // 初始化分布图表
    if (distributionChartRef.value && distributionChartRef.value.clientWidth > 0) {
      distributionChart = echarts.init(distributionChartRef.value, 'dark')
    }
    
    // 初始化性能图表
    if (responseTimeChartRef.value && responseTimeChartRef.value.clientWidth > 0) {
      responseTimeChart = echarts.init(responseTimeChartRef.value, 'dark')
    }
    
    if (engagementChartRef.value && engagementChartRef.value.clientWidth > 0) {
      engagementChart = echarts.init(engagementChartRef.value, 'dark')
    }
  }

  const updateTrendChart = (data: ChartData) => {
    if (!trendChart) return
    
    const option = {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['发送量', '成功量', '失败量'],
        textStyle: { color: '#fff' }
      },
      xAxis: {
        type: 'category',
        data: data.labels || []
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '发送量',
          type: 'line',
          data: data.sent || [],
          smooth: true,
          lineStyle: { color: '#409EFF' }
        },
        {
          name: '成功量',
          type: 'line',
          data: data.success || [],
          smooth: true,
          lineStyle: { color: '#67C23A' }
        },
        {
          name: '失败量',
          type: 'line',
          data: data.failed || [],
          smooth: true,
          lineStyle: { color: '#F56C6C' }
        }
      ]
    }
    
    trendChart.setOption(option)
  }

  const updateDistributionChart = (data: Array<{name: string, value: number}>) => {
    if (!distributionChart) return
    
    const option = {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        textStyle: { color: '#fff' }
      },
      series: [
        {
          name: '通知类型分布',
          type: 'pie',
          radius: '50%',
          data: data || [],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
    
    distributionChart.setOption(option)
  }

  const updatePerformanceCharts = (data: any) => {
    // 更新响应时间图表
    if (responseTimeChart && data.responseTime) {
      responseTimeChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: data.responseTime.labels || []
        },
        yAxis: { type: 'value' },
        series: [{
          data: data.responseTime.values || [],
          type: 'bar',
          itemStyle: { color: '#E6A23C' }
        }]
      })
    }
    
    // 更新参与度图表
    if (engagementChart && data.engagement) {
      engagementChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: data.engagement.labels || []
        },
        yAxis: { type: 'value' },
        series: [{
          data: data.engagement.values || [],
          type: 'line',
          smooth: true,
          itemStyle: { color: '#409EFF' }
        }]
      })
    }
  }

  const initDetailTrendChart = async () => {
    await nextTick()
    if (detailTrendChartRef.value) {
      detailTrendChart = echarts.init(detailTrendChartRef.value, 'dark')
    }
  }

  const updateDetailTrendChart = (data: ChartData) => {
    if (!detailTrendChart) return
    
    const option = {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.labels || []
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '发送量',
          type: 'line',
          data: data.sent || [],
          smooth: true
        },
        {
          name: '成功量',
          type: 'line',
          data: data.success || [],
          smooth: true
        }
      ]
    }
    
    detailTrendChart.setOption(option)
  }


  return {
    // 图表引用
    trendChartRef,
    distributionChartRef,
    responseTimeChartRef,
    engagementChartRef,
    detailTrendChartRef,
    
    // 方法
    initCharts,
    updateTrendChart,
    updateDistributionChart,
    updatePerformanceCharts,
    initDetailTrendChart,
    updateDetailTrendChart,
    disposeCharts
  }
}
