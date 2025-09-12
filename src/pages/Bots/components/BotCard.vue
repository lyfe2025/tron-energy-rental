<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
    <!-- 卡片头部 -->
    <div class="p-4 border-b border-gray-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <input
            type="checkbox"
            :checked="isSelected"
            @change="handleSelect"
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bot class="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">{{ bot.name }}</h3>
            <p class="text-sm text-gray-500">@{{ bot.username }}</p>
          </div>
        </div>
        <div class="flex items-center">
          <button
            @click="handleToggleStatus"
            :disabled="bot.updating"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :class="bot.is_active ? 'bg-blue-600' : 'bg-gray-200'"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="bot.is_active ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="p-4">
      <div class="space-y-3">
        <!-- 基本信息 -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">状态:</span>
          <span
            class="px-2 py-1 text-xs font-medium rounded-full"
            :class="bot.is_active ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'"
          >
            {{ bot.is_active ? '启用' : '禁用' }}
          </span>
        </div>
        
        <!-- 网络配置 -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">网络配置:</span>
          <div class="flex items-center gap-2">
            <!-- 网络配置状态显示 -->
            <span 
              v-if="bot.current_network && bot.current_network.name && bot.current_network.name.trim()"
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="getNetworkStatusColor(bot.current_network.status)"
            >
              {{ bot.current_network.name }}
            </span>
            <span 
              v-else 
              class="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full"
            >
              未配置
            </span>
          </div>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">网络状态:</span>
          <div class="flex items-center gap-2">
            <div 
              v-if="bot.current_network && bot.current_network.name && bot.current_network.name.trim()"
              class="flex items-center gap-1"
            >
              <div 
                class="w-2 h-2 rounded-full"
                :class="bot.current_network.status === 'active' ? 'bg-green-500' : 'bg-red-500'"
              ></div>
              <span class="text-xs font-medium">
                {{ bot.current_network.status === 'active' ? '正常' : '异常' }}
              </span>
              <span class="text-xs text-gray-500">
                ({{ getNetworkTypeText(bot.current_network?.type || '') }})
              </span>
            </div>
            <span v-else class="text-xs text-gray-500">--</span>
          </div>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">配置模板:</span>
          <span class="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
            {{ getTemplateLabel(bot.template || 'custom') }}
          </span>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">总用户数:</span>
          <span class="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-full">
            {{ bot.total_users || 0 }}
          </span>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">总订单数:</span>
          <span class="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
            {{ bot.total_orders || 0 }}
          </span>
        </div>
        
        <!-- 健康状态 -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">健康状态:</span>
          <div class="flex items-center gap-2">
            <div class="relative group">
              <span 
                :class="getHealthStatusColor(bot.health_status)"
                class="px-2 py-1 text-xs font-medium rounded-full cursor-pointer"
              >
                {{ getHealthStatusText(bot.health_status) }}
              </span>
              <!-- 详细信息悬浮提示 -->
              <div 
                v-if="bot.health_status === 'unhealthy' && lastHealthCheckResult"
                class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap max-w-xs"
              >
                <div class="font-medium mb-1">检查失败原因:</div>
                <div>{{ lastHealthCheckResult.error_message || '未知错误' }}</div>
                <div class="text-gray-300 text-xs mt-1">
                  检查时间: {{ formatTime(lastHealthCheckResult.last_check) }}
                </div>
                <!-- 小箭头 -->
                <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
              </div>
            </div>
            <button
              @click="handleHealthCheck"
              :disabled="healthChecking || !bot.id"
              class="inline-flex items-center gap-1 px-1 py-0.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="检查机器人健康状态"
            >
              <Loader2 v-if="healthChecking" :size="10" class="animate-spin" />
              <Activity v-else :size="10" />
            </button>
          </div>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">创建时间:</span>
          <span class="text-gray-700 text-xs">{{ formatDateToSeconds(bot.created_at) }}</span>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">最后更新:</span>
          <span class="text-gray-700 text-xs">{{ formatDateToSeconds(bot.updated_at) }}</span>
        </div>

      </div>
    </div>

    <!-- 卡片操作 -->
    <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
      <div class="flex space-x-2">
        <button
          @click="handlePreview"
          class="px-2 py-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
        >
          <ExternalLink class="w-3 h-3" />
          预览
        </button>
        <button
          @click="$emit('edit', bot)"
          class="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          <Edit class="w-3 h-3" />
          编辑
        </button>
        <button
          @click="$emit('configure-network', bot)"
          class="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          <Network class="w-3 h-3" />
          网络配置
        </button>
        <button
          @click="handleNotificationPanel"
          class="px-2 py-1 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors flex items-center gap-1"
          title="通知管理"
        >
          <Bell class="w-3 h-3" />
          通知配置
        </button>
      </div>
      <div class="relative">
        <button
          @click="toggleMenu"
          class="p-1 text-gray-700 hover:bg-gray-200 rounded transition-colors"
        >
          <MoreHorizontal class="w-4 h-4" />
        </button>
        <div
          v-if="bot.showMenu"
          class="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
        >
          <button
            @click="handleDropdownCommand('view')"
            class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
          >
            查看详情
          </button>
          <button
            @click="handleDropdownCommand('notifications')"
            class="w-full px-3 py-2 text-left text-sm text-purple-700 hover:bg-purple-50"
          >
            通知配置
          </button>
          <button
            @click="handleDropdownCommand('copy')"
            class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            复制配置
          </button>
          <button
            @click="handleDropdownCommand('logs')"
            class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            查看日志
          </button>
          <div class="border-t border-gray-200"></div>
          <button
            @click="handleDropdownCommand('delete')"
            class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 last:rounded-b-lg"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { botsAPI } from '@/services/api/bots/botsAPI'
import { ElMessage } from 'element-plus'
import { Activity, Bell, Bot, Edit, ExternalLink, Loader2, MoreHorizontal, Network } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatTime, getHealthStatusColor, getHealthStatusText } from '../composables/useBotFormShared'

// 类型定义
interface CurrentNetwork {
  id: string
  name: string
  type: string
  status: string
  created_at?: string
  updated_at?: string
}

interface BotConfig {
  id: string
  name: string
  username: string
  token: string
  is_active: boolean
  current_network?: CurrentNetwork
  template?: string
  created_at: string
  updated_at: string
  updating?: boolean
  showMenu?: boolean
  total_users?: number
  total_orders?: number
  health_status?: 'healthy' | 'unhealthy' | 'unknown'
  last_health_check?: string
}

// Props
interface Props {
  bot: BotConfig
  isSelected: boolean
}

const props = defineProps<Props>()

// Emits
interface Emits {
  'select': [id: string, selected: boolean]
  'toggle-status': [bot: BotConfig]
  'edit': [bot: BotConfig]
  'configure-network': [bot: BotConfig]
  'dropdown-command': [command: string, bot: BotConfig]
  'open-notifications': [bot: BotConfig]
  'update:health-status': [value: { botId: string; status: string; lastCheck: string }]
}

const emit = defineEmits<Emits>()

// 路由实例
const router = useRouter()

// 响应式数据
const healthChecking = ref(false)
const lastHealthCheckResult = ref<any>(null)

// 监控网络配置变化
watch(() => props.bot.current_network, (newVal, oldVal) => {
  // 可根据需要添加特定的处理逻辑
}, { immediate: true, deep: true })

// 方法
const handleSelect = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked
  emit('select', props.bot.id, checked)
}

const handleToggleStatus = () => {
  emit('toggle-status', props.bot)
}

const toggleMenu = () => {
  props.bot.showMenu = !props.bot.showMenu
}

const handleDropdownCommand = (command: string) => {
  console.log('🎯 [BotCard] handleDropdownCommand:', command, props.bot)
  props.bot.showMenu = false
  if (command === 'notifications') {
    // 跳转到通知配置页面
    router.push(`/bots/${props.bot.id}/notification-config`)
  } else {
    emit('dropdown-command', command, props.bot)
  }
}

// 处理通知管理面板
const handleNotificationPanel = () => {
  console.log('🔔 Opening notification config page for bot:', props.bot.name)
  // 跳转到通知配置页面
  router.push(`/bots/${props.bot.id}/notification-config`)
}

// 健康检查处理
const handleHealthCheck = async () => {
  if (!props.bot?.id || healthChecking.value) {
    return
  }
  
  try {
    healthChecking.value = true
    console.log('开始健康检查:', props.bot.id)
    
    const response = await botsAPI.performHealthCheck(props.bot.id)
    const result = response.data
    
    // 保存健康检查结果
    if (result?.success && result?.data) {
      lastHealthCheckResult.value = result.data
      console.log('健康检查结果:', result.data)
      
      if ((result.data as any).status === 'healthy') {
        ElMessage.success('健康检查通过')
      } else {
        ElMessage.warning(`健康检查发现问题：${(result.data as any).error_message || '未知错误'}`)
      }
      
      // 触发父组件刷新机器人列表
      emit('update:health-status', {
        botId: props.bot.id,
        status: (result.data as any).status || 'unknown',
        lastCheck: (result.data as any).last_check || new Date().toISOString()
      })
    } else {
      ElMessage.error(`健康检查失败：${result?.message || '未知错误'}`)
    }
    
  } catch (error: any) {
    console.error('健康检查失败:', error)
    ElMessage.error(`健康检查失败：${error.message || '未知错误'}`)
    
    // 即使出错也保存错误信息
    lastHealthCheckResult.value = {
      error_message: error.message || '健康检查请求失败',
      status: 'unhealthy',
      last_check: new Date().toISOString()
    }
  } finally {
    healthChecking.value = false
  }
}

// 预览机器人
const handlePreview = () => {
  if (props.bot.username) {
    const telegramUrl = `https://t.me/${props.bot.username}`
    window.open(telegramUrl, '_blank')
  } else {
    console.warn('机器人用户名不存在，无法打开预览')
  }
}

// 工具方法
const getTemplateLabel = (template: string) => {
  const templateMap: Record<string, string> = {
    energy: '能量租赁',
    service: '客服机器人',
    custom: '自定义'
  }
  return templateMap[template] || '自定义'
}

const getNetworkTypeText = (type: string) => {
  switch (type) {
    case 'mainnet': return '主网'
    case 'testnet': return '测试网'
    case 'devnet': return '开发网'
    default: return type
  }
}

const getNetworkStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'text-green-700 bg-green-100'
    case 'inactive': return 'text-red-700 bg-red-100'
    default: return 'text-gray-700 bg-gray-100'
  }
}

// 格式化日期到秒级精度
const formatDateToSeconds = (dateString?: string) => {
  if (!dateString) return '--'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '--'
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return '--'
  }
}
</script>

