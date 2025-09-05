<!--
 * 机器人网络管理页面 - 重构后的主组件
 * 职责：协调各个子组件，管理页面状态和路由
-->
<template>
  <div class="p-6">
    <!-- 页面头部 -->
    <BotNetworkHeader
      :bot-info="botInfo"
      :loading="loading"
      @back="handleBack"
      @refresh="refreshData"
      @add-network="showAddDialog = true"
    />

    <!-- 机器人信息卡片 -->
    <BotInfoCard
      :bot-info="botInfo"
      :network-count="botNetworks.length"
    />

    <!-- 网络列表 -->
    <NetworkGrid
      :networks="botNetworks"
      :loading="loading"
      @add-network="showAddDialog = true"
      @toggle-network="handleToggleNetwork"
      @test-connection="handleTestConnection"
      @edit-network="handleEditNetwork"
      @dropdown-command="handleDropdownCommand"
    />

    <!-- 添加网络对话框 -->
    <AddNetworkModal
      v-model:visible="showAddDialog"
      :available-networks="availableNetworks"
      :connected-networks="connectedNetworkIds"
      @add-network="handleAddNetwork"
    />

    <!-- 编辑网络配置对话框 -->
    <EditNetworkModal
      v-model:visible="showEditDialog"
      :network="editingNetwork"
      @save="handleSaveNetwork"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 组件导入
import AddNetworkModal from './components/BotNetworks/AddNetworkModal.vue'
import BotInfoCard from './components/BotNetworks/BotInfoCard.vue'
import BotNetworkHeader from './components/BotNetworks/BotNetworkHeader.vue'
import EditNetworkModal from './components/BotNetworks/EditNetworkModal.vue'
import NetworkGrid from './components/BotNetworks/NetworkGrid.vue'

// Composable导入
import { useBotNetworks, type AvailableNetwork, type BotNetwork } from './components/BotNetworks/useBotNetworks'

// 路由
const route = useRoute()
const router = useRouter()

// 获取机器人ID
const botId = route.params.id as string

// 使用业务逻辑composable
const {
  // 状态
  loading,
  botInfo,
  botNetworks,
  availableNetworks,

  // 方法
  refreshData,
  toggleNetwork,
  testConnection,
  saveNetworkConfig,
  addNetwork,
  handleDropdownCommand
} = useBotNetworks(botId)

// 模态框状态
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const editingNetwork = ref<BotNetwork | null>(null)

// 计算属性：已连接的网络ID列表
const connectedNetworkIds = computed(() => {
  return botNetworks.value.map(network => network.id)
})

// 事件处理方法
const handleBack = () => {
  router.push('/config/bots')
}

const handleToggleNetwork = async (network: BotNetwork) => {
  await toggleNetwork(network)
}

const handleTestConnection = async (network: BotNetwork) => {
  await testConnection(network)
}

const handleEditNetwork = (network: BotNetwork) => {
  editingNetwork.value = network
  showEditDialog.value = true
}

const handleSaveNetwork = async (network: BotNetwork) => {
  try {
    await saveNetworkConfig(network)
    showEditDialog.value = false
    editingNetwork.value = null
  } catch (error) {
    // 错误已在composable中处理
  }
}

const handleAddNetwork = async (network: AvailableNetwork) => {
  try {
    await addNetwork(network)
    showAddDialog.value = false
  } catch (error) {
    // 错误已在composable中处理
  }
}

// 生命周期
onMounted(() => {
  refreshData()
})
</script>