<template>
  <div class="space-y-6">
    <!-- 搜索表单 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <SystemLogSearchForm
        :search-form="searchForm"
        :loading="loading"
        @search="handleSearch"
        @reset="handleReset"
        @refresh="fetchLogs"
      />
    </div>

    <!-- 系统日志表格 -->
    <div class="bg-white rounded-lg shadow-sm">
      <SystemLogsTable
        :logs="logs"
        :loading="loading"
        :error="error"
        :pagination="pagination"
        :format-date="formatDate"
        @view-details="viewDetails"
        @prev-page="prevPage"
        @next-page="nextPage"
        @retry="fetchLogs"
      />
    </div>

    <!-- 详情弹窗 -->
    <SystemLogDetailsDialog
      :visible="detailVisible"
      :log="currentLog"
      @close="detailVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SystemLogDetailsDialog from './components/SystemLogDetailsDialog.vue'
import SystemLogsTable from './components/SystemLogsTable.vue'
import SystemLogSearchForm from './components/SystemLogSearchForm.vue'
import { useSystemLogs } from './composables/useSystemLogs'
import type { SystemLog } from './types/system-logs.types'

const {
  loading,
  error,
  logs,
  searchForm,
  pagination,
  fetchLogs,
  handleSearch,
  handleReset,
  prevPage,
  nextPage,
  formatDate
} = useSystemLogs()

const detailVisible = ref(false)
const currentLog = ref<SystemLog | null>(null)

const viewDetails = (record: SystemLog) => {
  currentLog.value = record
  detailVisible.value = true
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
/* 无需自定义样式，使用统一的卡片布局 */
</style>