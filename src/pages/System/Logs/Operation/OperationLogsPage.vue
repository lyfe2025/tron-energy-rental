<template>
  <div class="operation-logs p-4">
    <!-- 搜索表单 -->
    <div class="mb-4">
      <LogSearchForm
        :search-form="searchForm"
        @search="handleSearch"
        @reset="handleReset"
        @refresh="handleRefresh"
      />
    </div>

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
  padding: 16px;
}
</style>
