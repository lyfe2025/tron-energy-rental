<template>
  <div class="system-monitoring">
    <!-- 页面标题 -->
    <div class="page-header mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">系统监控</h1>
          <p class="text-gray-600 mt-1">实时监控系统运行状态和性能指标</p>
        </div>
        <div class="flex items-center space-x-3">
          <el-tag :type="systemStatus === 'healthy' ? 'success' : 'danger'" size="large">
            <el-icon><CircleCheck v-if="systemStatus === 'healthy'" /><CircleClose v-else /></el-icon>
            {{ systemStatus === 'healthy' ? '系统正常' : '系统异常' }}
          </el-tag>
          <el-button @click="refreshData" :loading="refreshing">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </div>
    </div>

    <!-- 系统指标 -->
    <SystemMetrics :metrics="systemMetrics" />

    <!-- 服务状态 -->
    <ServiceStatus
      :services="services"
      :checking-all="checkingServices"
      @check-all="checkAllServices"
      @check-service="checkService"
      @start-service="startService"
      @restart-service="restartService"
    />

    <!-- 实时日志 -->
    <SystemLogs
      :logs="filteredLogs"
      :log-level="logLevel"
      :auto-refresh="autoRefreshLogs"
      @level-change="handleLogLevelChange"
      @clear-logs="clearLogs"
      @toggle-auto-refresh="toggleAutoRefresh"
    />

    <!-- 性能图表 -->
    <div class="performance-charts">
      <el-card>
        <template #header>
          <h3 class="text-lg font-semibold">性能趋势</h3>
        </template>
        
        <div class="charts-container">
          <div class="text-center py-8 text-gray-500">
            <el-icon size="48"><TrendCharts /></el-icon>
            <p class="mt-2">性能图表功能开发中...</p>
            <p class="text-sm">将显示CPU、内存、网络等性能指标的历史趋势</p>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CircleCheck,
  CircleClose,
  Refresh,
  TrendCharts
} from '@element-plus/icons-vue'
import { onMounted, onUnmounted } from 'vue'
import ServiceStatus from './components/ServiceStatus.vue'
import SystemLogs from './components/SystemLogs.vue'
import SystemMetrics from './components/SystemMetrics.vue'
import { useSystemMonitoring } from './composables/useSystemMonitoring'

// 使用组合式函数
const {
  // 状态
  refreshing,
  checkingServices,
  systemStatus,
  logLevel,
  autoRefreshLogs,
  systemMetrics,
  services,
  
  // 计算属性
  filteredLogs,
  
  // 方法
  refreshData,
  checkAllServices,
  checkService,
  startService,
  restartService,
  clearLogs,
  toggleAutoRefresh,
  handleLogLevelChange,
  cleanup
} = useSystemMonitoring()

// 生命周期
onMounted(() => {
  refreshData()
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.system-monitoring {
  padding: 24px;
}

.metric-card {
  transition: all 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-icon.cpu {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.metric-icon.memory {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.metric-icon.disk {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.metric-icon.network {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.service-item {
  transition: all 0.2s ease;
}

.service-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logs-container {
  max-height: 400px;
  overflow-y: auto;
}

.log-item {
  transition: background-color 0.2s ease;
}

.log-item:hover {
  background-color: #f8f9fa;
}

.charts-container {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>