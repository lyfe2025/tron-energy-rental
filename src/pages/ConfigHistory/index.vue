<template>
  <div class="config-history">
    <!-- 页面标题 -->
    <div class="page-header mb-6">
      <h1 class="text-2xl font-bold text-gray-900">配置历史</h1>
      <p class="text-gray-600 mt-1">查看和管理系统配置变更历史记录</p>
    </div>

    <!-- 筛选和搜索组件 -->
    <HistoryFilters
      v-model:searchQuery="searchQuery"
      v-model:configTypeFilter="configTypeFilter"
      v-model:actionTypeFilter="actionTypeFilter"
      v-model:dateRange="dateRange"
      :totalCount="totalRecords"
      @resetFilters="resetFilters"
      @exportHistory="exportHistory"
    />

    <!-- 历史记录列表组件 -->
    <HistoryList
      :loading="loading"
      :paginatedHistory="paginatedHistory"
      @viewDetails="viewDetails"
      @rollbackConfig="rollbackConfig"
    />

    <!-- 分页组件 -->
    <HistoryPagination
      :currentPage="currentPage"
      :pageSize="pageSize"
      :total="totalRecords"
      @currentChange="handlePageChange"
    />

    <!-- 详情对话框组件 -->
    <HistoryDetailsDialog
      :visible="showDetailsDialog"
      :record="selectedRecord"
      @close="handleCloseDetails"
      @rollback="rollbackConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import type { ConfigHistoryRecord } from '@/services/api'
import { configCacheAPI } from '@/services/api'
import { ElMessageBox } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'
import HistoryDetailsDialog from './components/HistoryDetailsDialog.vue'
import HistoryFilters from './components/HistoryFilters.vue'
import HistoryList from './components/HistoryList.vue'
import HistoryPagination from './components/HistoryPagination.vue'
import { generateConfigTitle } from './utils/configUtils'

const { success, error } = useToast()

// 响应式数据
const loading = ref(false)
const searchQuery = ref('')
const configTypeFilter = ref('')
const actionTypeFilter = ref('')
const dateRange = ref<[string, string] | null>(null)
const currentPage = ref(1)
const pageSize = ref(10)
const showDetailsDialog = ref(false)
const selectedRecord = ref<ConfigHistoryRecord | null>(null)

// 历史记录数据
const historyRecords = ref<ConfigHistoryRecord[]>([])
const totalRecords = ref(0)

// 生成标题的辅助函数
const generateTitle = (record: ConfigHistoryRecord): string => {
  return generateConfigTitle(record.entity_type, record.operation_type)
}

// 计算属性 - 现在由于API直接返回分页数据，这些主要用于展示
const filteredHistory = computed(() => historyRecords.value)

const paginatedHistory = computed(() => historyRecords.value)

// 方法
const loadHistory = async () => {
  loading.value = true
  try {
    const params = {
      entity_type: configTypeFilter.value || undefined,
      operation_type: actionTypeFilter.value || undefined,
      limit: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value
    }
    
    const response = await configCacheAPI.getHistory(params)
    
    if (response.data.success) {
      historyRecords.value = response.data.data.history
      totalRecords.value = response.data.data.pagination.total
    } else {
      error(response.data.message || '加载历史记录失败')
    }
  } catch (error: any) {
    console.error('加载历史记录错误:', error)
    error(error.response?.data?.message || '加载历史记录失败')
  } finally {
    loading.value = false
  }
}

const resetFilters = async () => {
  searchQuery.value = ''
  configTypeFilter.value = ''
  actionTypeFilter.value = ''
  dateRange.value = null
  currentPage.value = 1
  await loadHistory()
}

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await loadHistory()
}

const viewDetails = (record: ConfigHistoryRecord) => {
  selectedRecord.value = record
  showDetailsDialog.value = true
}

const handleCloseDetails = () => {
  showDetailsDialog.value = false
  selectedRecord.value = null
}

const rollbackConfig = async (record: ConfigHistoryRecord) => {
  try {
    const title = generateTitle(record)
    await ElMessageBox.confirm(
      `确定要回滚配置 "${title}" 吗？此操作将恢复到变更前的状态。`,
      '确认回滚',
      {
        confirmButtonText: '确定回滚',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟回滚操作
    await new Promise(resolve => setTimeout(resolve, 2000))
    success('配置回滚成功')
    
    // 关闭详情对话框
    if (showDetailsDialog.value) {
      handleCloseDetails()
    }
    
    // 重新加载历史记录
    await loadHistory()
  } catch {
    // 用户取消操作
  }
}

const exportHistory = async () => {
  try {
    // 模拟导出操作
    await new Promise(resolve => setTimeout(resolve, 1000))
    success('历史记录导出成功')
  } catch (error) {
    error('导出失败')
  }
}

// 监听器 - 监听筛选条件变化
watch([configTypeFilter, actionTypeFilter], async () => {
  currentPage.value = 1 // 重置页面
  await loadHistory()
}, { deep: true })

// 生命周期
onMounted(() => {
  loadHistory()
})
</script>

<style scoped>
.config-history {
  padding: 24px;
}

.page-header {
  margin-bottom: 1.5rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mt-1 {
  margin-top: 0.25rem;
}

.text-2xl {
  font-size: 1.5rem;
  line-height: 2rem;
}

.font-bold {
  font-weight: 700;
}

.text-gray-900 {
  color: #111827;
}

.text-gray-600 {
  color: #4b5563;
}
</style>