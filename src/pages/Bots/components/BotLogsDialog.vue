<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="$emit('close')"></div>

      <!-- 弹窗内容 -->
      <div class="inline-block w-full max-w-6xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <!-- 头部 -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900">机器人运行日志</h3>
            <p v-if="botLogs" class="text-sm text-gray-500 mt-1">
              机器人: {{ botLogs.name }} (@{{ botLogs.username }})
            </p>
          </div>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- 日志过滤器 -->
        <div class="flex flex-wrap items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">日志级别:</label>
            <select v-model="selectedLevel" class="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">全部</option>
              <option value="info">信息</option>
              <option value="warn">警告</option>
              <option value="error">错误</option>
              <option value="debug">调试</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">日志类型:</label>
            <select v-model="selectedCategory" class="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">全部</option>
              <option value="user_interaction">用户交互</option>
              <option value="system">系统事件</option>
              <option value="bot_response">机器人响应</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">时间范围:</label>
            <select v-model="selectedTimeRange" class="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1h">最近1小时</option>
              <option value="6h">最近6小时</option>
              <option value="24h">最近24小时</option>
              <option value="7d">最近7天</option>
              <option value="all">全部</option>
            </select>
          </div>
          <button
            @click="refreshLogs"
            :disabled="loading"
            class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <RefreshCw :class="{ 'animate-spin': loading }" class="w-4 h-4" />
            刷新
          </button>
        </div>

        <!-- 日志内容 -->
        <div class="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
          <!-- 加载状态 -->
          <div v-if="loading" class="flex items-center justify-center h-full">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
            <span class="ml-2 text-green-400">加载日志中...</span>
          </div>

          <!-- 日志列表 -->
          <div v-else-if="filteredLogs.length > 0" class="space-y-1">
            <div
              v-for="(log, index) in filteredLogs"
              :key="index"
              class="flex items-start gap-3 py-1 hover:bg-gray-900 rounded px-2 -mx-2"
            >
              <!-- 日志图标和类型 -->
              <div class="flex items-center gap-1 flex-shrink-0">
                <component :is="getLogIcon(log.action)" class="w-4 h-4" :class="getLogIconColor(log.action)" />
              </div>
              
              <!-- 时间戳 -->
              <span class="text-gray-400 text-xs whitespace-nowrap mt-0.5">
                {{ formatLogTime(log.timestamp) }}
              </span>
              
              <!-- 日志级别 -->
              <span :class="getLogLevelClass(log.level)" class="text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap">
                {{ log.level.toUpperCase() }}
              </span>
              
              <!-- 日志内容 -->
              <span class="text-gray-300 flex-1 break-all">
                {{ log.message }}
                <span v-if="log.source === 'file'" class="text-xs text-gray-500 ml-2">[文件]</span>
                <span v-if="log.source === 'database'" class="text-xs text-blue-400 ml-2">[数据库]</span>
              </span>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="flex items-center justify-center h-full text-gray-400">
            <div class="text-center">
              <FileText class="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无日志记录</p>
              <p class="text-sm mt-1">该机器人可能还没有产生日志或日志已被清理</p>
            </div>
          </div>
        </div>

        <!-- 日志统计 -->
        <div v-if="logs.length > 0" class="mt-4 p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center justify-between text-sm text-gray-600">
            <span>共 {{ logs.length }} 条日志记录</span>
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1">
                <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                错误: {{ getLogCountByLevel('error') }}
              </span>
              <span class="flex items-center gap-1">
                <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
                警告: {{ getLogCountByLevel('warn') }}
              </span>
              <span class="flex items-center gap-1">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                信息: {{ getLogCountByLevel('info') }}
              </span>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            @click="exportLogs"
            class="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
          >
            <Download class="w-4 h-4" />
            导出日志
          </button>
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, Bot, Download, FileText, MessageCircle, Play, RefreshCw, Settings, Square, User, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  action?: string
  source?: string
}

interface Props {
  visible: boolean
  botLogs: any
  logs: LogEntry[]
  loading: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  'refresh-logs': []
}>()

// 过滤器状态
const selectedLevel = ref('')
const selectedCategory = ref('')
const selectedTimeRange = ref('24h')

// 过滤后的日志
const filteredLogs = computed(() => {
  let filtered = [...props.logs]
  
  // 按级别过滤
  if (selectedLevel.value) {
    filtered = filtered.filter(log => log.level === selectedLevel.value)
  }
  
  // 按类型分类过滤
  if (selectedCategory.value) {
    const categoryActions = {
      'user_interaction': ['user_message_received', 'user_callback_received', 'command_handled'],
      'system': ['bot_started', 'bot_stopped', 'commands_sync_success', 'bot_initialized_with_config', 'bot_error'],
      'bot_response': ['text_response', 'help_response', 'menu_response', 'balance_response', 'send_message']
    }
    
    const actions = categoryActions[selectedCategory.value as keyof typeof categoryActions] || []
    filtered = filtered.filter(log => actions.includes(log.action || ''))
  }
  
  // 按时间范围过滤
  if (selectedTimeRange.value !== 'all') {
    const now = new Date()
    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }
    
    const rangeMs = timeRanges[selectedTimeRange.value as keyof typeof timeRanges]
    const cutoffTime = new Date(now.getTime() - rangeMs)
    
    filtered = filtered.filter(log => new Date(log.timestamp) >= cutoffTime)
  }
  
  // 按时间倒序排列（最新的在前）
  return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

// 格式化日志时间
const formatLogTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取日志级别样式
const getLogLevelClass = (level: string) => {
  const classes = {
    error: 'bg-red-900 text-red-200',
    warn: 'bg-yellow-900 text-yellow-200',
    info: 'bg-blue-900 text-blue-200',
    debug: 'bg-gray-700 text-gray-300'
  }
  return classes[level as keyof typeof classes] || classes.info
}

// 获取指定级别的日志数量
const getLogCountByLevel = (level: string) => {
  return props.logs.filter(log => log.level === level).length
}

// 获取日志图标
const getLogIcon = (action: string) => {
  const iconMap: Record<string, any> = {
    'user_message_received': User,
    'user_callback_received': User,
    'command_handled': MessageCircle,
    'text_response': Bot,
    'help_response': Bot,
    'menu_response': Bot,
    'balance_response': Bot,
    'send_message': Bot,
    'bot_started': Play,
    'bot_stopped': Square,
    'bot_error': AlertTriangle,
    'commands_sync_success': Settings,
    'bot_initialized_with_config': Settings
  }
  return iconMap[action] || FileText
}

// 获取日志图标颜色
const getLogIconColor = (action: string) => {
  const colorMap: Record<string, string> = {
    'user_message_received': 'text-blue-400',
    'user_callback_received': 'text-blue-400',
    'command_handled': 'text-purple-400',
    'text_response': 'text-green-400',
    'help_response': 'text-green-400',
    'menu_response': 'text-green-400',
    'balance_response': 'text-green-400',
    'send_message': 'text-green-400',
    'bot_started': 'text-green-400',
    'bot_stopped': 'text-red-400',
    'bot_error': 'text-red-400',
    'commands_sync_success': 'text-yellow-400',
    'bot_initialized_with_config': 'text-yellow-400'
  }
  return colorMap[action] || 'text-gray-400'
}

// 刷新日志
const refreshLogs = () => {
  // 触发父组件重新获取日志
  emit('refresh-logs')
}

// 导出日志
const exportLogs = () => {
  try {
    const exportData = {
      bot_name: props.botLogs?.name || 'Unknown',
      bot_username: props.botLogs?.username || 'Unknown',
      export_time: new Date().toISOString(),
      filters: {
        level: selectedLevel.value || 'all',
        time_range: selectedTimeRange.value
      },
      logs: filteredLogs.value
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bot-logs-${props.botLogs?.username || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('导出日志失败:', error)
  }
}
</script>

<style scoped>
.space-y-1 > * + * {
  margin-top: 0.25rem;
}

/* 自定义滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #374151;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #6b7280;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>