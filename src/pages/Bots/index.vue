<template>
  <div class="p-6">
    <!-- 页面头部 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">机器人管理</h1>
        <p class="text-gray-600 mt-1">管理和监控您的TRON机器人配置和网络设置</p>
      </div>
      <div class="flex gap-3 mt-4 sm:mt-0">
        <button
          @click="refreshData"
          :disabled="loading"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw :class="{ 'animate-spin': loading }" class="w-4 h-4" />
          刷新
        </button>
        <button
          @click="() => checkTelegramConnection()"
          :disabled="connectivityState.checking"
          :class="{
            'px-4 py-2 border rounded-lg transition-colors flex items-center gap-2': true,
            'text-green-600 bg-green-50 border-green-200 hover:bg-green-100': connectivityState.status === 'connected',
            'text-red-600 bg-red-50 border-red-200 hover:bg-red-100': connectivityState.status === 'disconnected',
            'text-yellow-600 bg-yellow-50 border-yellow-200 hover:bg-yellow-100': connectivityState.status === 'slow',
            'text-gray-700 bg-white border-gray-300 hover:bg-gray-50': connectivityState.status === null,
            'opacity-50 cursor-not-allowed': connectivityState.checking
          }"
        >
          <component 
            :is="getConnectivityIcon()" 
            :class="{ 'animate-spin': connectivityState.checking }" 
            class="w-4 h-4" 
          />
          {{ getConnectivityText() }}
        </button>
        <button
          @click="exportData"
          class="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
        >
          <Download class="w-4 h-4" />
          导出
        </button>
        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          创建机器人
        </button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <BotFilters
      v-model="searchForm"
      :networks="networks"
      :selected-bots="selectedBots"
      @search="handleSearch"
      @reset="resetSearch"
      @batch-enable="handleBatchEnable"
      @batch-disable="handleBatchDisable"
      @clear-selection="clearSelection"
    />

    <!-- 机器人卡片列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" :class="{ 'opacity-50': loading }">
        <BotCard
          v-for="bot in filteredBots"
          :key="`${bot.id}-${bot.network_id || 'no-network'}-${bot.updated_at || Date.now()}-${Math.random()}`"
          :bot="bot"
          :is-selected="selectedBots.includes(bot.id)"
          @select="handleSelectBot"
          @toggle-status="handleToggleStatus"
          @edit="handleEdit"
          @configure-network="handleConfigureNetwork"
          @dropdown-command="handleDropdownCommand"
          @open-notifications="handleOpenNotifications"
        />
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && filteredBots.length === 0" class="text-center py-12">
      <Bot class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无机器人</h3>
      <p class="text-gray-500 mb-4">开始创建您的第一个Telegram机器人配置</p>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
      >
        <Plus class="w-4 h-4" />
        创建机器人
      </button>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="flex justify-center mt-8">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-700">
          共 {{ total }} 条记录
        </span>
        <div class="flex gap-1">
          <button
            @click="handleCurrentChange(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span class="px-3 py-1 text-sm text-gray-700">
            第 {{ currentPage }} / {{ Math.ceil(total / pageSize) }} 页
          </span>
          <button
            @click="handleCurrentChange(currentPage + 1)"
            :disabled="currentPage >= Math.ceil(total / pageSize)"
            class="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 创建机器人弹窗 -->
    <BotCreateModal
      v-model:visible="showCreateModal"
      @create="handleCreateBot"
    />

    <!-- 编辑机器人弹窗 -->
    <BotEditModal
      v-model:visible="showEditModal"
      :bot-data="selectedBot"
      @save="handleUpdateBot"
      @refresh="handleRefreshBots"
    />

    <!-- 网络配置弹窗 -->
    <NetworkConfigModal
      v-model:visible="showNetworkModal"
      entity-type="bot"
      :entity-data="selectedBot ? { id: selectedBot.id, name: selectedBot.name } : null"
      @success="handleNetworkUpdated"
    />

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :visible="showConfirmDialog"
      :title="confirmDialogConfig.title"
      :message="confirmDialogConfig.message"
      :details="confirmDialogConfig.details"
      :warning="confirmDialogConfig.warning"
      :type="confirmDialogConfig.type"
      :confirm-text="confirmDialogConfig.confirmText"
      :cancel-text="confirmDialogConfig.cancelText"
      :loading="confirmDialogConfig.loading"
      @confirm="handleConfirm"
      @cancel="handleCancel"
      @close="handleCancel"
    />

    <!-- 机器人详情弹窗 -->
    <BotDetailDialog
      :visible="showBotDetailDialog"
      :bot-detail="selectedBotDetail"
      @close="closeBotDetailDialog"
    />

    <!-- 机器人日志弹窗 -->
    <BotLogsDialog
      :visible="showBotLogsDialog"
      :bot-logs="selectedBotLogs"
      :logs="botLogs"
      :loading="logsLoading"
      @close="closeBotLogsDialog"
      @refresh-logs="refreshBotLogs"
    />

    <!-- 手动同步对话框 -->
    <ManualSyncDialog
      v-model="showManualSyncDialog"
      :bot-data="manualSyncBotData"
      :current-form-data="manualSyncFormData"
      @sync-success="handleManualSyncSuccess"
    />

  </div>
</template>

<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import NetworkConfigModal from '@/components/NetworkConfigModal.vue'
import { botsAPI } from '@/services/api/bots/botsAPI'
import { ElMessage } from 'element-plus'
import { AlertTriangle, Bot, CheckCircle, Download, Plus, RefreshCw, Wifi, XCircle } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import BotCard from './components/BotCard.vue'
import BotCreateModal from './components/BotCreateModal.vue'
import BotDetailDialog from './components/BotDetailDialog.vue'
import BotEditModal from './components/BotEditModal.vue'
import BotFilters from './components/BotFilters.vue'
import BotLogsDialog from './components/BotLogsDialog.vue'
import ManualSyncDialog from './components/ManualSyncDialog.vue'
import { useBotManagement } from './composables/useBotManagementIntegrated'

// 弹窗状态
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showNetworkModal = ref(false)
const showManualSyncDialog = ref(false)
const selectedBot = ref<any>(null)
const manualSyncBotData = ref<any>(null)
const manualSyncFormData = ref<any>(null)

// 注意：同步状态对话框相关变量已移除，改为手动同步模式

// Telegram API连接检测状态
const connectivityState = ref({
  checking: false,
  status: null as 'connected' | 'disconnected' | 'slow' | null,
  latency: null as number | null,
  error: null as string | null,
  suggestions: [] as string[],
  lastChecked: null as Date | null
})

// 防抖控制：防止用户快速重复点击
let lastManualCheck = 0


// 使用组合式函数
const {
  // 状态
  loading,
  bots,
  networks,
  selectedBots,
  currentPage,
  pageSize,
  total,
  searchForm,
  showConfirmDialog,
  confirmDialogConfig,
  showBotDetailDialog,
  selectedBotDetail,
  showBotLogsDialog,
  selectedBotLogs,
  botLogs,
  logsLoading,
  
  // 计算属性
  filteredBots,
  
  // 方法
  refreshData,
  handleSearch,
  resetSearch,
  handleToggleStatus,
  handleDropdownCommand,
  closeBotDetailDialog,
  closeBotLogsDialog,
  refreshBotLogs,
  handleCurrentChange,
  handleSelectBot,
  clearSelection,
  handleBatchEnable,
  handleBatchDisable,
  exportData,
  handleConfirm,
  handleCancel
} = useBotManagement()

// 页面特有方法
const handleEdit = (bot: any) => {
  // 简化处理，避免过度复杂化
  selectedBot.value = bot
  showEditModal.value = true
}

const handleConfigureNetwork = (bot: any) => {
  selectedBot.value = bot
  showNetworkModal.value = true
}

const handleCreateBot = async (data: any) => {
  try {
    const createData = {
      name: data.name,
      username: data.username,
      token: data.token,
      description: data.description,
      short_description: data.short_description,
      network_id: data.network_id,
      work_mode: data.work_mode || 'polling',
      webhook_url: data.webhook_url,
      webhook_secret: data.webhook_secret,
      max_connections: data.max_connections || 40,
      welcome_message: data.welcome_message,
      help_message: data.help_message,
      custom_commands: data.custom_commands || [],
      menu_button_enabled: data.menu_button_enabled || false,
      menu_button_text: data.menu_button_text || '菜单',
      menu_type: data.menu_type || 'commands',
      web_app_url: data.web_app_url,
      menu_commands: data.menu_commands || [],
      keyboard_config: data.keyboard_config,
      is_active: data.is_active !== undefined ? data.is_active : true
    }
    
    console.log('🚀 开始创建机器人，数据:', createData)
    
    const response = await botsAPI.createBot(createData)
    
    if (response.data?.success) {
      console.log('✅ 机器人创建API调用成功')
      
      // 显示成功消息
      ElMessage.success('机器人创建成功！数据已保存到数据库')
      
      showCreateModal.value = false
      await refreshData()
      
      // 自动弹出手动同步对话框
      const createdBot = response.data.data.bot
      if (createdBot) {
        // 确保传递完整的机器人数据，包括token用于同步
        manualSyncBotData.value = {
          ...createdBot,
          token: createData.token // 添加token用于同步
        }
        manualSyncFormData.value = { ...createData }
        showManualSyncDialog.value = true
        
        // 额外提示用户可以选择同步
        setTimeout(() => {
          ElMessage.info('机器人已创建完成，现在可以选择性地同步设置到Telegram')
        }, 500)
      }
      
    } else {
      throw new Error(response.data?.message || '创建失败')
    }
  } catch (error: any) {
    console.error('❌ 创建机器人失败:', error)
    ElMessage.error(error.message || '创建机器人失败')
  }
}

const handleUpdateBot = async (data: any) => {
  try {
    const updateData = {
      name: data.name,
      username: data.username,
      token: data.token,
      description: data.description,
      short_description: data.short_description,
      network_id: data.network_id,
      work_mode: data.work_mode,
      webhook_url: data.webhook_url,
      webhook_secret: data.webhook_secret,
      max_connections: data.max_connections,
      welcome_message: data.welcome_message,
      help_message: data.help_message,
      custom_commands: data.custom_commands || [],
      menu_button_enabled: data.menu_button_enabled || false,
      menu_button_text: data.menu_button_text || '菜单',
      menu_type: data.menu_type || 'commands',
      web_app_url: data.web_app_url,
      menu_commands: data.menu_commands || [],
      keyboard_config: data.keyboard_config && Object.keys(data.keyboard_config).length > 0 ? data.keyboard_config : null,
      is_active: data.is_active
    }
    
    console.log('🚀 开始更新机器人，数据:', updateData)
    
    const response = await botsAPI.updateBot(data.id, updateData)
    
    if (response.data?.success) {
      console.log('✅ 机器人更新API调用成功')
      
      // 显示成功消息
      ElMessage.success('机器人更新成功！数据已保存到数据库，如需同步到Telegram请使用手动同步功能')
      
      showEditModal.value = false
      selectedBot.value = null
      await refreshData()
      
    } else {
      throw new Error(response.data?.message || '更新失败')
    }
  } catch (error: any) {
    console.error('❌ 更新机器人失败:', error)
    
    // 针对超时错误给出更友好的提示
    if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) {
      ElMessage({
        type: 'warning',
        message: error.friendlyMessage || '操作超时，数据库更新可能已完成，请刷新页面查看最新状态',
        duration: 6000,
        showClose: true
      })
      
      // 自动刷新数据
      setTimeout(async () => {
        try {
          await refreshData()
          console.log('🔄 数据已自动刷新')
        } catch (refreshError) {
          console.warn('自动刷新失败:', refreshError)
        }
      }, 2000)
      
    } else {
      ElMessage.error(error.friendlyMessage || error.message || '更新机器人失败')
    }
  }
}

// 处理手动同步成功
const handleManualSyncSuccess = (syncResult?: any) => {
  console.log('📡 手动同步完成:', syncResult)
  if (syncResult?.success) {
    ElMessage.success('Telegram同步完成！')
  } else if (syncResult?.hasPartialSuccess) {
    ElMessage.warning('Telegram同步部分成功，请查看详细日志')
  }
  
  // 刷新机器人数据以获取最新状态
  refreshData()
}

const handleNetworkUpdated = async () => {
  console.log('🔄 [Bots] 网络配置更新，开始刷新数据...')
  await refreshData()
  console.log('✅ [Bots] 数据刷新完成')
}

// 处理健康检查后的刷新
const handleRefreshBots = async () => {
  console.log('🔄 [Bots] 健康检查完成，开始刷新机器人列表...')
  try {
    await refreshData()
    console.log('✅ [Bots] 机器人列表刷新完成')
  } catch (error) {
    console.error('❌ [Bots] 刷新机器人列表失败:', error)
  }
}

// Telegram API连接检测
const checkTelegramConnection = async (silent = false) => {
  if (connectivityState.value.checking) return

  // 防抖：手动检测间隔至少3秒
  if (!silent) {
    const now = Date.now()
    if (now - lastManualCheck < 3000) {
      ElMessage.info('检测过于频繁，请稍后再试')
      return
    }
    lastManualCheck = now
  }

  console.log('🔍 开始检测Telegram API连接...')
  connectivityState.value.checking = true
  connectivityState.value.status = null

  try {
    const response = await botsAPI.checkTelegramApiConnectivity()
    
    if (response.data?.success && response.data.data?.accessible) {
      const data = response.data.data
      
      // 根据延迟设置状态
      const status = data.status === 'excellent' ? 'connected' :
                   data.status === 'good' ? 'connected' :
                   'slow'
      
      connectivityState.value = {
        checking: false,
        status,
        latency: data.latency || null,
        error: null,
        suggestions: data.suggestions || [],
        lastChecked: new Date()
      }

      console.log(`✅ Telegram API连接正常，延迟: ${data.latency}ms`)
      
      // 只在非静默模式下显示成功消息
      if (!silent) {
        const statusText = status === 'connected' && data.status === 'excellent' ? '优秀' :
                          status === 'connected' && data.status === 'good' ? '良好' :
                          '较慢'
        ElMessage.success(`Telegram API连接正常，网络状态: ${statusText} (${data.latency}ms)`)
        
        // 如果有建议，显示警告信息
        if (data.suggestions && data.suggestions.length > 0) {
          ElMessage({
            type: 'warning',
            message: `网络建议: ${data.suggestions[0]}`,
            duration: 5000
          })
        }
      }
      
    } else {
      // 连接失败
      const errorData = response.data?.data
      connectivityState.value = {
        checking: false,
        status: 'disconnected',
        latency: null,
        error: errorData?.error || '连接失败',
        suggestions: errorData?.suggestions || [],
        lastChecked: new Date()
      }

      console.error('❌ Telegram API连接失败:', errorData?.error)
      
      // 只在非静默模式下显示错误消息
      if (!silent) {
        const suggestions = errorData?.suggestions || []
        const primaryMessage = '🚨 Telegram API连接失败！'
        const suggestionText = suggestions.length > 0 ? 
          `\n建议：${suggestions.slice(0, 2).join('; ')}` : 
          '\n建议：检查网络设置或更换IP地址'

        ElMessage({
          type: 'error',
          message: primaryMessage + suggestionText,
          duration: 8000,
          showClose: true
        })

        // 如果有多个建议，分别显示
        if (suggestions.length > 2) {
          setTimeout(() => {
            ElMessage({
              type: 'warning',
              message: `其他建议：${suggestions.slice(2).join('; ')}`,
              duration: 6000,
              showClose: true
            })
          }, 1000)
        }
      }
    }
  } catch (error: any) {
    console.error('❌ 检测Telegram API连接失败:', error)
    
    connectivityState.value = {
      checking: false,
      status: 'disconnected',
      latency: null,
      error: error.message || '检测失败',
      suggestions: ['请检查网络连接', '尝试更换IP地址'],
      lastChecked: new Date()
    }

    // 只在非静默模式下显示错误消息
    if (!silent) {
      ElMessage({
        type: 'error',
        message: `网络检测失败: ${error.message || '未知错误'}`,
        duration: 5000,
        showClose: true
      })
    }
  }
}

// 获取连接状态图标
const getConnectivityIcon = () => {
  if (connectivityState.value.checking) return RefreshCw
  
  switch (connectivityState.value.status) {
    case 'connected':
      return CheckCircle
    case 'slow':
      return AlertTriangle
    case 'disconnected':
      return XCircle
    default:
      return Wifi
  }
}

// 获取连接状态文本
const getConnectivityText = () => {
  if (connectivityState.value.checking) return '检测中...'
  
  switch (connectivityState.value.status) {
    case 'connected':
      return `API正常 (${connectivityState.value.latency}ms)`
    case 'slow':
      return `连接较慢 (${connectivityState.value.latency}ms)`
    case 'disconnected':
      return 'API不可用'
    default:
      return '检测连接'
  }
}

// 处理通知管理（现在通过路由跳转）
const handleOpenNotifications = (bot: any) => {
  console.log('🚀 This event is no longer used, navigation is handled in BotCard component')
}

// 生命周期
onMounted(() => {
  refreshData()
  
  // 页面加载后自动检测一次Telegram API连接（静默模式）
  setTimeout(() => {
    checkTelegramConnection(true) // 静默模式，不显示消息提示
  }, 2000)
  
  // 每10分钟自动检测一次（静默模式，避免过于频繁的消息提示）
  const connectivityCheckInterval = setInterval(() => {
    // 只有在用户不在执行其他操作时才自动检测
    if (!connectivityState.value.checking && !loading.value) {
      console.log('🔄 执行定期Telegram API连接检测...')
      checkTelegramConnection(true) // 静默模式
    }
  }, 10 * 60 * 1000) // 10分钟
  
  // 监听API错误事件，自动建议检查连接
  const handleConnectivitySuggestion = (event: any) => {
    const { reason, message } = event.detail
    console.log('📡 收到连接检测建议:', { reason, message })
    
    // 如果当前连接状态未知或已断开，显示建议检测的消息
    if (!connectivityState.value.checking && 
        (connectivityState.value.status === null || connectivityState.value.status === 'disconnected')) {
      
      ElMessage({
        type: 'info',
        message: `${message}。点击"检测连接"按钮进行检查`,
        duration: 6000,
        showClose: true
      })
      
      // 可选：自动进行一次检测（静默模式）
      setTimeout(() => {
        if (!connectivityState.value.checking) {
          console.log('🔄 自动执行连接检测...')
          checkTelegramConnection(true) // 静默模式，避免重复消息
        }
      }, 3000)
    }
  }
  
  // 添加事件监听
  window.addEventListener('api:suggest_connectivity_check', handleConnectivitySuggestion)
  
  // 页面卸载时清理定时器和事件监听
  const cleanup = () => {
    clearInterval(connectivityCheckInterval)
    window.removeEventListener('api:suggest_connectivity_check', handleConnectivitySuggestion)
  }
  
  // 页面卸载时清理定时器
  onBeforeUnmount(cleanup)
})
</script>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .md\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.gap-4 {
  gap: 1rem;
}

.gap-6 {
  gap: 1.5rem;
}
</style>