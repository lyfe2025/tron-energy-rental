<template>
  <div class="p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">登录日志</h1>
      <p class="text-gray-600 mt-1">查看用户登录记录和安全日志</p>
    </div>

    <!-- 搜索表单 -->
    <LoginSearchForm
      :search-form="searchForm"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
      @refresh="fetchLogs"
    />

    <!-- 日志表格 -->
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
.login-logs {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #666;
}

.search-form {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
