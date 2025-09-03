<template>
  <div class="operation-logs p-6">
    <!-- 页面头部 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">操作日志</h1>
      <p class="text-gray-600">查看系统操作记录</p>
    </div>

    <!-- 搜索表单 -->
    <LogSearchForm
      :search-form="searchForm"
      @search="handleSearch"
      @reset="handleReset"
      @refresh="handleRefresh"
    />

    <!-- 操作日志表格 -->
    <LogsTable
      :logs="logs"
      :loading="loading"
      :error="error"
      @view-details="viewDetails"
      @retry="fetchLogs"
    />

    <!-- 分页 -->
    <LogPagination
      :logs="logs"
      :pagination="pagination"
      @prev-page="prevPage"
      @next-page="nextPage"
    />

    <!-- 详情弹窗 -->
    <LogDetailsDialog
      :visible="detailVisible"
      :selected-log="selectedLog"
      @close="closeDetails"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import LogDetailsDialog from './components/LogDetailsDialog.vue'
import LogPagination from './components/LogPagination.vue'
import LogSearchForm from './components/LogSearchForm.vue'
import LogsTable from './components/LogsTable.vue'
import { useOperationLogs } from './composables/useOperationLogs'

const {
  // 状态
  logs,
  error,
  detailVisible,
  selectedLog,
  searchForm,
  pagination,
  loading,
  
  // 方法
  fetchLogs,
  handleSearch,
  handleReset,
  handleRefresh,
  viewDetails,
  closeDetails,
  prevPage,
  nextPage
} = useOperationLogs()

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.operation-logs {
  padding: 24px;
}
</style>
