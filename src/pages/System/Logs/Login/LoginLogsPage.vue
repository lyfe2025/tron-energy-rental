<template>
  <div class="space-y-6">
    <!-- 搜索表单 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <LoginSearchForm
        :search-form="searchForm"
        :loading="loading"
        @search="handleSearch"
        @reset="handleReset"
        @refresh="fetchLogs"
      />
    </div>

    <!-- 日志表格 -->
    <div class="bg-white rounded-lg shadow-sm">
      <LoginLogsTable
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
    <LoginDetailsDialog
      :visible="detailVisible"
      :log="currentLog"
      :format-duration="formatDuration"
      @close="detailVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import LoginDetailsDialog from './components/LoginDetailsDialog.vue'
import LoginLogsTable from './components/LoginLogsTable.vue'
import LoginSearchForm from './components/LoginSearchForm.vue'
import { useLoginLogs } from './composables/useLoginLogs'
import type { LoginLog } from './types/login-logs.types'

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
  formatDate,
  formatDuration
} = useLoginLogs()

const detailVisible = ref(false)
const currentLog = ref<LoginLog | null>(null)

const viewDetails = (record: LoginLog) => {
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
