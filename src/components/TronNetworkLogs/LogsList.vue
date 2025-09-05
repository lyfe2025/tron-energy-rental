<template>
  <!-- 日志列表 -->
  <div class="logs-container">
    <div v-if="logs.length === 0 && !loading" class="text-center py-8 text-gray-500">
      暂无日志数据
    </div>
    
    <div v-else class="space-y-2">
      <div
        v-for="log in logs"
        :key="log.id"
        class="log-item p-3 border rounded-lg"
        :class="getLogItemClass(log.level)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-1">
              <el-tag :type="getLevelTagType(log.level)" size="small">
                {{ getLevelLabel(log.level) }}
              </el-tag>
              <el-tag type="info" size="small">
                {{ getActionLabel(log.action) }}
              </el-tag>
              <span class="text-sm text-gray-500">
                {{ formatDateTime(log.created_at) }}
              </span>
            </div>
            
            <div class="text-sm font-medium mb-1">
              {{ log.message }}
            </div>
            
            <div v-if="log.details" class="text-xs text-gray-600">
              {{ log.details }}
            </div>
            
            <div v-if="log.error_info" class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
              <strong>错误信息:</strong> {{ log.error_info }}
            </div>
          </div>
          
          <div class="text-xs text-gray-400">
            {{ log.user_name || '系统' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  logs: LogEntry[]
  loading: boolean
}

defineProps<Props>()

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const getLevelLabel = (level: string) => {
  switch (level) {
    case 'info': return '信息'
    case 'warning': return '警告'
    case 'error': return '错误'
    case 'debug': return '调试'
    default: return '未知'
  }
}

const getLevelTagType = (level: string) => {
  switch (level) {
    case 'info': return 'success'
    case 'warning': return 'warning'
    case 'error': return 'danger'
    case 'debug': return 'info'
    default: return 'info'
  }
}

const getActionLabel = (action: string) => {
  switch (action) {
    case 'connection_test': return '连接测试'
    case 'config_update': return '配置更新'
    case 'config_sync': return '配置同步'
    case 'status_change': return '状态变更'
    case 'health_check': return '健康检查'
    default: return action
  }
}

const getLogItemClass = (level: string) => {
  switch (level) {
    case 'error': return 'border-red-200 bg-red-50'
    case 'warning': return 'border-yellow-200 bg-yellow-50'
    case 'info': return 'border-blue-200 bg-blue-50'
    case 'debug': return 'border-gray-200 bg-gray-50'
    default: return 'border-gray-200'
  }
}
</script>

<style scoped>
.logs-container {
  max-height: 400px;
  overflow-y: auto;
}

.log-item {
  transition: all 0.2s;
}

.log-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.p-2 {
  padding: 0.5rem;
}

.p-3 {
  padding: 0.75rem;
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.bg-red-50 {
  background-color: #fef2f2;
}

.bg-yellow-50 {
  background-color: #fffbeb;
}

.bg-blue-50 {
  background-color: #eff6ff;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.border {
  border-width: 1px;
}

.border-red-200 {
  border-color: #fecaca;
}

.border-yellow-200 {
  border-color: #fde68a;
}

.border-blue-200 {
  border-color: #bfdbfe;
}

.border-gray-200 {
  border-color: #e5e7eb;
}

.rounded {
  border-radius: 0.25rem;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.text-center {
  text-align: center;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

.font-medium {
  font-weight: 500;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-600 {
  color: #4b5563;
}

.flex {
  display: flex;
}

.flex-1 {
  flex: 1 1 0%;
}

.items-start {
  align-items: flex-start;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.space-x-2 > * + * {
  margin-left: 0.5rem;
}
</style>
