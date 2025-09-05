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
        :key="bot.id"
        :bot="bot"
        :is-selected="selectedBots.includes(bot.id)"
        @select="handleSelectBot"
        @toggle-status="handleToggleStatus"
        @edit="handleEdit"
        @configure-network="handleConfigureNetwork"
        @dropdown-command="handleDropdownCommand"
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
      :available-networks="availableNetworks"
      @create="handleCreateBot"
    />

    <!-- 编辑机器人弹窗 -->
    <BotEditModal
      v-model:visible="showEditModal"
      :bot-data="selectedBot"
      @save="handleUpdateBot"
    />

    <!-- 网络配置弹窗 -->
    <NetworkConfigModal
      v-model:visible="showNetworkModal"
      entity-type="bot"
      :entity-data="selectedBot ? { id: selectedBot.id, name: selectedBot.name } : null"
      @success="handleNetworkUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { botsAPI } from '@/services/api/bots/botsAPI'
import { ElMessage } from 'element-plus'
import { Bot, Download, Plus, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import BotCard from './components/BotCard.vue'
import BotCreateModal from './components/BotCreateModal.vue'
import BotEditModal from './components/BotEditModal.vue'
import BotFilters from './components/BotFilters.vue'
import NetworkConfigModal from '@/components/NetworkConfigModal.vue'
import { useBotManagement } from './composables/useBotManagementIntegrated'

// 弹窗状态
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showNetworkModal = ref(false)
const selectedBot = ref<any>(null)

// 可用网络列表（转换为创建弹窗所需的格式）
const availableNetworks = computed(() => {
  return networks.value.map(network => ({
    id: network.id,
    name: network.name,
    network_type: network.chain_id ? 'mainnet' : 'testnet', // 简单的转换逻辑
    is_active: true
  }))
})

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
  
  // 计算属性
  filteredBots,
  
  // 方法
  refreshData,
  handleSearch,
  resetSearch,
  handleToggleStatus,
  handleDropdownCommand,
  handleCurrentChange,
  handleSelectBot,
  clearSelection,
  handleBatchEnable,
  handleBatchDisable,
  exportData
} = useBotManagement()

// 页面特有方法
const handleEdit = (bot: any) => {
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
      webhook_url: data.webhook_url,
      welcome_message: data.welcome_message,
      help_message: data.help_message,
      status: data.is_active ? 'active' : 'inactive'
    }
    
    const response = await botsAPI.createBot(createData)
    
    if (response.data?.success) {
      // 如果选择了网络，为机器人配置网络
      if (data.network_id) {
        const botId = response.data.data?.bot?.id
        if (botId) {
          await botsAPI.setBotNetwork(botId, { network_id: data.network_id })
        }
      }
      
      showCreateModal.value = false
      await refreshData()
      ElMessage.success('机器人创建成功')
    } else {
      throw new Error(response.data?.message || '创建失败')
    }
  } catch (error: any) {
    console.error('创建机器人失败:', error)
    ElMessage.error(error.message || '创建机器人失败')
  }
}

const handleUpdateBot = async (data: any) => {
  try {
    const response = await botsAPI.updateBot(data.id, {
      name: data.name,
      token: data.token,
      description: data.description,
      webhook_url: data.webhook_url,
      welcome_message: data.welcome_message,
      help_message: data.help_message,
      status: data.status
    })
    
    if (response.data?.success) {
      showEditModal.value = false
      selectedBot.value = null
      await refreshData()
      ElMessage.success('机器人更新成功')
    } else {
      throw new Error(response.data?.message || '更新失败')
    }
  } catch (error: any) {
    console.error('更新机器人失败:', error)
    ElMessage.error(error.message || '更新机器人失败')
  }
}

const handleNetworkUpdated = async () => {
  await refreshData()
}

// 生命周期
onMounted(() => {
  refreshData()
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