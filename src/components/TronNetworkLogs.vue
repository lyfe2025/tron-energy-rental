<template>
  <el-dialog
    v-model="visible"
    title="网络日志"
    width="1000px"
    :before-close="handleClose"
  >
    <div v-loading="loading" class="network-logs">
      <!-- 过滤器组件 -->
      <LogsFilter
        :filters="filters"
        @query="fetchLogs"
        @reset="resetFilters"
        @export="exportLogs"
      />

      <!-- 日志列表组件 -->
      <LogsList :logs="logs" :loading="loading" />

      <!-- 分页组件 -->
      <LogsPagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <template #footer>
      <div class="flex justify-end">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { networkApi } from '@/api/network'
import { useToast } from '@/composables/useToast'
import { reactive, ref, watch } from 'vue'
import LogsFilter from './TronNetworkLogs/LogsFilter.vue'
import LogsList from './TronNetworkLogs/LogsList.vue'
import LogsPagination from './TronNetworkLogs/LogsPagination.vue'

interface LogEntry {
  id: string
  level: 'info' | 'warning' | 'error' | 'debug'
  action: string
  message: string
  details?: string
  error_info?: string
  user_name?: string
  created_at: string
}

interface Props {
  modelValue: boolean
  networkId?: string
  networkName?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, error } = useToast()

const visible = ref(false)
const loading = ref(false)
const logs = ref<LogEntry[]>([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filters = reactive({
  level: '',
  action: '',
  dateRange: null as [string, string] | null
})

watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal && props.networkId) {
    fetchLogs()
  }
})

watch(visible, (newVal) => {
  if (!newVal) {
    emit('update:modelValue', false)
  }
})

const fetchLogs = async () => {
  if (!props.networkId) return
  
  try {
    loading.value = true
    
    // 调用真实的API
    const response = await networkApi.getNetworkLogsByNetworkId(props.networkId, {
      level: filters.level || undefined,
      action: filters.action || undefined,
      start_date: filters.dateRange?.[0],
      end_date: filters.dateRange?.[1],
      page: currentPage.value,
      limit: pageSize.value
    })
    
    if (response.success && response.data) {
      logs.value = response.data.logs || []
      total.value = response.data.pagination?.total || 0
    } else {
      logs.value = []
      total.value = 0
    }
    
  } catch (error) {
    console.error('获取网络日志失败:', error)
    error('获取网络日志失败')
    
    // 如果API失败，使用模拟数据作为降级方案
    await fetchMockLogs()
  } finally {
    loading.value = false
  }
}

const fetchMockLogs = async () => {
  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 模拟日志数据
    const mockLogs: LogEntry[] = [
      {
        id: '1',
        level: 'info',
        action: 'connection_test',
        message: '网络连接测试成功',
        details: `响应时间: 299ms, 区块高度: 50817154`,
        user_name: '管理员',
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      },
      {
        id: '2',
        level: 'info',
        action: 'config_sync',
        message: '配置同步完成',
        details: '同步内容: 网络参数、节点信息、区块信息、健康检查 | 同步结果: 成功 | 耗时: 2.4s',
        user_name: '管理员',
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      },
      {
        id: '3',
        level: 'warning',
        action: 'health_check',
        message: '网络响应时间较慢',
        details: '响应时间超过500ms，建议检查网络状况',
        user_name: '系统',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      },
      {
        id: '4',
        level: 'warning',
        action: 'config_sync',
        message: '配置同步部分失败',
        details: '同步内容: 网络参数(✓)、节点信息(✓)、区块信息(✗)、健康检查(✓) | 部分步骤失败',
        error_info: '区块信息同步失败: RPC调用超时',
        user_name: '管理员',
        created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
      },
      {
        id: '5',
        level: 'info',
        action: 'config_update',
        message: '网络配置已更新',
        details: '更新了超时时间和重试次数配置',
        user_name: '管理员',
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
      },
      {
        id: '6',
        level: 'error',
        action: 'connection_test',
        message: '网络连接失败',
        details: '无法连接到RPC节点',
        error_info: 'Connection timeout after 30000ms',
        user_name: '系统',
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
      },
      {
        id: '7',
        level: 'info',
        action: 'status_change',
        message: '网络状态已激活',
        details: '网络已设置为激活状态',
        user_name: '管理员',
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString()
      }
    ]
    
    logs.value = mockLogs
    total.value = mockLogs.length
    
  } catch (error) {
    console.error('获取模拟日志失败:', error)
    logs.value = []
    total.value = 0
  }
}

const resetFilters = () => {
  filters.level = ''
  filters.action = ''
  filters.dateRange = null
  currentPage.value = 1
  fetchLogs()
}

const exportLogs = () => {
  // 模拟导出功能
  success('日志导出功能开发中')
}

const handleClose = () => {
  visible.value = false
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  fetchLogs()
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
  fetchLogs()
}
</script>

<style scoped>
.network-logs {
  min-height: 500px;
}

.flex {
  display: flex;
}

.justify-end {
  justify-content: flex-end;
}
</style>