<template>
  <div class="real-time-logs mb-6">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">实时日志</h3>
          <div class="flex items-center space-x-2">
            <el-select v-model="localLogLevel" size="small" style="width: 120px" @change="$emit('level-change', localLogLevel)">
              <el-option label="全部" value="all" />
              <el-option label="错误" value="error" />
              <el-option label="警告" value="warning" />
              <el-option label="信息" value="info" />
              <el-option label="调试" value="debug" />
            </el-select>
            <el-button size="small" @click="$emit('clear-logs')">
              <el-icon><Delete /></el-icon>
              清空日志
            </el-button>
            <el-button
              size="small"
              :type="autoRefresh ? 'primary' : 'default'"
              @click="handleToggleAutoRefresh"
            >
              <el-icon><Timer /></el-icon>
              {{ autoRefresh ? '停止自动刷新' : '自动刷新' }}
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="logs-container">
        <div
          v-if="logs.length === 0"
          class="text-center py-8 text-gray-500"
        >
          <el-icon size="48"><DocumentCopy /></el-icon>
          <p class="mt-2">暂无日志记录</p>
        </div>
        
        <div v-else class="logs-list">
          <div
            v-for="log in logs"
            :key="log.id"
            class="log-item border-b border-gray-100 py-2"
            :class="getLogItemClass(log.level)"
          >
            <div class="flex items-start space-x-3">
              <el-tag
                :type="getLogLevelType(log.level)"
                size="small"
                class="flex-shrink-0 mt-1"
              >
                {{ log.level.toUpperCase() }}
              </el-tag>
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2 mb-1">
                  <span class="text-sm text-gray-500">{{ formatTime(log.timestamp) }}</span>
                  <span class="text-sm text-gray-600">[{{ log.service }}]</span>
                </div>
                <p class="text-sm break-words">{{ log.message }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import {
    Delete,
    DocumentCopy,
    Timer
} from '@element-plus/icons-vue'
import { computed } from 'vue'

// 类型定义
interface LogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info' | 'debug'
  service: string
  message: string
}

// Props
interface Props {
  logs: LogEntry[]
  logLevel: string
  autoRefresh: boolean
}

const props = defineProps<Props>()

// Emits
interface Emits {
  'level-change': [level: string]
  'clear-logs': []
  'toggle-auto-refresh': []
}

const emit = defineEmits<Emits>()

// 本地状态
const localLogLevel = computed({
  get: () => props.logLevel,
  set: (value: string) => emit('level-change', value)
})

// 方法
const handleToggleAutoRefresh = () => {
  emit('toggle-auto-refresh')
}

const getLogLevelType = (level: string) => {
  const typeMap: Record<string, string> = {
    error: 'danger',
    warning: 'warning',
    info: 'primary',
    debug: 'info'
  }
  return typeMap[level] || 'info'
}

const getLogItemClass = (level: string) => {
  const classMap: Record<string, string> = {
    error: 'bg-red-50',
    warning: 'bg-yellow-50',
    info: 'bg-blue-50',
    debug: 'bg-gray-50'
  }
  return classMap[level] || ''
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}
</script>

<style scoped>
.logs-container {
  max-height: 400px;
  overflow-y: auto;
}

.log-item {
  transition: background-color 0.2s ease;
}

.log-item:hover {
  background-color: #f8f9fa;
}
</style>

