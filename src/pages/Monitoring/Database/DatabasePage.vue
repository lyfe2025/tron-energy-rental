<template>
  <div class="space-y-6">
    <!-- 页面标题和操作 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">数据库监控</h1>
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

    <!-- 数据库连接状态 -->
    <DatabaseConnectionStatus :db-status="dbStatus" />

    <!-- 数据库统计信息 -->
    <DatabaseStatsCards :db-stats="dbStats" />

    <!-- 表统计信息 -->
    <DatabaseTableList 
      :db-stats="dbStats" 
      :table-pagination="tablePagination"
      :loading="loading"
      @view-details="showTableDetails"
      @analyze-table="analyzeTable"
      @previous-page="previousPage"
      @next-page="nextPage"
    />

    <!-- 慢查询日志 -->
    <SlowQueryLogs :db-stats="dbStats" />

    <!-- 表详情对话框 -->
    <TableDetailsModal
      :visible="showTableDialog"
      :selected-table="selectedTable"
      @close="closeTableDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { onMounted, onUnmounted } from 'vue'
import DatabaseConnectionStatus from './components/DatabaseConnectionStatus.vue'
import DatabaseStatsCards from './components/DatabaseStatsCards.vue'
import DatabaseTableList from './components/DatabaseTableList.vue'
import SlowQueryLogs from './components/SlowQueryLogs.vue'
import TableDetailsModal from './components/TableDetailsModal.vue'
import { useDatabaseMonitoring } from './composables/useDatabaseMonitoring'
import { useTableAnalysis } from './composables/useTableAnalysis'

// 数据库监控逻辑
const {
  loading,
  dbStatus,
  dbStats,
  tablePagination,
  refreshData,
  previousPage,
  nextPage,
  startMonitoring,
  stopMonitoring
} = useDatabaseMonitoring()

// 表分析逻辑
const {
  selectedTable,
  showTableDialog,
  showTableDetails,
  closeTableDialog,
  analyzeTable
} = useTableAnalysis()

// 生命周期
onMounted(() => {
  startMonitoring()
})

onUnmounted(() => {
  stopMonitoring()
})
</script>
