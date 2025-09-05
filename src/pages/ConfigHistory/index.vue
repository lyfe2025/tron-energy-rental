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
      :totalCount="filteredHistory.length"
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
      :total="filteredHistory.length"
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import HistoryDetailsDialog from './components/HistoryDetailsDialog.vue'
import HistoryFilters from './components/HistoryFilters.vue'
import HistoryList from './components/HistoryList.vue'
import HistoryPagination from './components/HistoryPagination.vue'

interface ConfigHistoryRecord {
  id: string
  config_type: 'bot' | 'network' | 'energy_pool' | 'system'
  action_type: 'create' | 'update' | 'delete' | 'enable' | 'disable'
  title: string
  description: string
  operator: string
  ip_address?: string
  created_at: string
  changes?: any
  remarks?: string
  can_rollback: boolean
}

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

// 模拟历史记录数据
const historyRecords = ref<ConfigHistoryRecord[]>([
  {
    id: '1',
    config_type: 'bot',
    action_type: 'create',
    title: '创建机器人 "MainBot"',
    description: '创建了新的Telegram机器人配置，用于主网络交易',
    operator: 'admin',
    ip_address: '192.168.1.100',
    created_at: '2024-01-15 10:30:00',
    changes: {
      name: 'MainBot',
      token: 'bot123456:ABC-DEF...',
      status: 'active'
    },
    remarks: '初始化主机器人配置',
    can_rollback: false
  },
  {
    id: '2',
    config_type: 'network',
    action_type: 'update',
    title: '更新网络配置 "Mainnet"',
    description: '修改了主网络的RPC端点配置',
    operator: 'admin',
    ip_address: '192.168.1.100',
    created_at: '2024-01-15 11:15:00',
    changes: {
      rpc_url: {
        old: 'https://api.trongrid.io',
        new: 'https://api.tronstack.io'
      },
      timeout: {
        old: 5000,
        new: 10000
      }
    },
    can_rollback: true
  },
  {
    id: '3',
    config_type: 'energy_pool',
    action_type: 'enable',
    title: '启用能量池账户',
    description: '启用了账户 TRX123...ABC 的能量池功能',
    operator: 'operator1',
    ip_address: '192.168.1.101',
    created_at: '2024-01-15 14:20:00',
    changes: {
      account_id: 'acc_001',
      status: {
        old: 'disabled',
        new: 'enabled'
      }
    },
    can_rollback: true
  },
  {
    id: '4',
    config_type: 'system',
    action_type: 'update',
    title: '更新系统配置',
    description: '修改了系统监控告警阈值',
    operator: 'admin',
    ip_address: '192.168.1.100',
    created_at: '2024-01-15 16:45:00',
    changes: {
      alert_threshold: {
        cpu_usage: { old: 80, new: 85 },
        memory_usage: { old: 85, new: 90 }
      }
    },
    can_rollback: true
  }
])

// 计算属性
const filteredHistory = computed(() => {
  let filtered = historyRecords.value

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(record =>
      record.title.toLowerCase().includes(query) ||
      record.description.toLowerCase().includes(query) ||
      record.operator.toLowerCase().includes(query)
    )
  }

  // 配置类型过滤
  if (configTypeFilter.value) {
    filtered = filtered.filter(record => record.config_type === configTypeFilter.value)
  }

  // 操作类型过滤
  if (actionTypeFilter.value) {
    filtered = filtered.filter(record => record.action_type === actionTypeFilter.value)
  }

  // 时间范围过滤
  if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
    filtered = filtered.filter(record => {
      const recordTime = new Date(record.created_at).getTime()
      const startTime = new Date(dateRange.value![0]).getTime()
      const endTime = new Date(dateRange.value![1]).getTime()
      return recordTime >= startTime && recordTime <= endTime
    })
  }

  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredHistory.value.slice(start, end)
})

// 方法
const loadHistory = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    // 实际应用中这里会调用API获取历史记录
  } catch (error) {
    ElMessage.error('加载历史记录失败')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  searchQuery.value = ''
  configTypeFilter.value = ''
  actionTypeFilter.value = ''
  dateRange.value = null
  currentPage.value = 1
}

const handlePageChange = (page: number) => {
  currentPage.value = page
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
    await ElMessageBox.confirm(
      `确定要回滚配置 "${record.title}" 吗？此操作将恢复到变更前的状态。`,
      '确认回滚',
      {
        confirmButtonText: '确定回滚',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟回滚操作
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success('配置回滚成功')
    
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
    ElMessage.success('历史记录导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

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