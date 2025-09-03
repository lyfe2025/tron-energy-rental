<template>
  <div class="space-y-6">
    <!-- 页面标题和操作 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">服务状态监控</h1>
      <div class="flex items-center space-x-3">
        <button
          @click="refreshData"
          :disabled="loading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
          刷新
        </button>
      </div>
    </div>

    <!-- 服务概览 -->
    <ServiceOverview
      :healthy-count="healthyCount"
      :warning-count="warningCount"
      :error-count="errorCount"
      :total-count="services.length"
    />

    <!-- 核心服务状态 -->
    <ServiceList
      :services="services"
      :loading="loading"
      :get-service-icon-color="getServiceIconColor"
      :get-status-display-name="getStatusDisplayName"
      :get-status-badge-class="getStatusBadgeClass"
      :format-date-time="formatDateTime"
      :format-uptime="formatUptime"
      @check-service="checkService"
      @show-details="showServiceDetails"
    />

    <!-- 系统资源监控 -->
    <SystemResourceMonitor
      :system-stats="systemStats"
      :get-cpu-color="getCpuColor"
      :get-memory-color="getMemoryColor"
      :get-disk-color="getDiskColor"
      :format-size="formatSize"
    />

    <!-- 服务详情对话框 -->
    <ServiceDetailsDialog
      :visible="showDetailsDialog"
      :service="selectedService"
      :get-status-display-name="getStatusDisplayName"
      :format-uptime="formatUptime"
      @close="closeDetailsDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { ref } from 'vue'
import ServiceDetailsDialog from './components/ServiceDetailsDialog.vue'
import ServiceList from './components/ServiceList.vue'
import ServiceOverview from './components/ServiceOverview.vue'
import SystemResourceMonitor from './components/SystemResourceMonitor.vue'
import { useServiceMonitoring } from './composables/useServiceMonitoring'
import { useSystemStats } from './composables/useSystemStats'
import type { ServiceStatus } from './types/service-status.types'

// 使用监控逻辑
const {
  loading,
  services,
  healthyCount,
  warningCount,
  errorCount,
  refreshData,
  checkService,
  getServiceIconColor,
  getStatusDisplayName,
  getStatusBadgeClass,
  formatDateTime,
  formatUptime
} = useServiceMonitoring()

// 使用系统统计逻辑
const {
  systemStats,
  getCpuColor,
  getMemoryColor,
  getDiskColor,
  formatSize
} = useSystemStats()

// 详情弹窗状态
const selectedService = ref<ServiceStatus | null>(null)
const showDetailsDialog = ref(false)

// 显示服务详情
const showServiceDetails = (service: ServiceStatus) => {
  selectedService.value = service
  showDetailsDialog.value = true
}

// 关闭服务详情对话框
const closeDetailsDialog = () => {
  showDetailsDialog.value = false
  selectedService.value = null
}
</script>
