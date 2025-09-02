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
      :loading="loading"
      :table-pagination="tablePagination"
      @show-table-details="showTableDetails"
      @analyze-table="analyzeTable"
      @previous-page="previousPage"
      @next-page="nextPage"
    />

    <!-- 慢查询日志 -->
    <SlowQueryLogs :slow-queries="dbStats?.slowQueries" />

    <!-- 表详情对话框 -->
    <TableDetailsModal 
      :show="showTableDialog"
      :selected-table="selectedTable"
      @close="closeTableDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { onMounted, onUnmounted } from 'vue'

// 导入组件
import DatabaseConnectionStatus from './Database/components/DatabaseConnectionStatus.vue'
import DatabaseStatsCards from './Database/components/DatabaseStatsCards.vue'
import DatabaseTableList from './Database/components/DatabaseTableList.vue'
import SlowQueryLogs from './Database/components/SlowQueryLogs.vue'
import TableDetailsModal from './Database/components/TableDetailsModal.vue'

// 导入 composable
import { useDatabaseMonitoring } from './Database/composables/useDatabaseMonitoring'

// 使用 composable
const {
  // 状态
  loading,
  dbStatus,
  dbStats,
  selectedTable,
  showTableDialog,
  tablePagination,
  
  // 方法
  refreshData,
  showTableDetails,
  closeTableDialog,
  analyzeTable,
  previousPage,
  nextPage,
  initialize,
  cleanup
} = useDatabaseMonitoring()

// 生命周期
onMounted(() => {
  initialize()
})

onUnmounted(() => {
  cleanup()
})
</script>
