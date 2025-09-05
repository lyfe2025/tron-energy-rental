<template>
  <div class="p-6">
    <!-- 页面头部 -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">TRON网络管理</h1>
        <p class="text-gray-600 mt-1">管理TRON区块链网络配置和连接状态</p>
      </div>
      <div class="flex space-x-3">
        <el-button @click="refreshData" :loading="loading">
          <RefreshCw class="w-4 h-4 mr-2" />
          刷新
        </el-button>
        <el-button @click="testAllConnections" :loading="testingAll">
          <Zap class="w-4 h-4 mr-2" />
          测试全部
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <Plus class="w-4 h-4 mr-2" />
          添加网络
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <NetworkStats :stats="stats" />

    <!-- 搜索和筛选 -->
    <NetworkFilters
      v-model:search-form="searchForm"
      @search="handleSearch"
      @reset="resetSearch"
    />

    <!-- 网络列表 -->
    <NetworkTable
      :networks="filteredNetworks"
      :selected-networks="selectedNetworks"
      :loading="loading"
      @selection-change="handleSelectionChange"
      @batch-enable="handleBatchEnable"
      @batch-disable="handleBatchDisable"
      @toggle-status="handleToggleStatus"
      @test="handleTest"
      @edit="handleEdit"
      @dropdown-command="handleDropdownCommand"
      @create="handleCreate"
    />

    <!-- 分页 -->
    <div v-if="total > pageSize" class="flex justify-center mt-6">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 详情对话框 -->
    <TronNetworkDetail
      v-model="showDetail"
      :network-id="detailNetworkId"
      @edit="handleDetailEdit"
    />

    <!-- 网络日志对话框 -->
    <TronNetworkLogs
      v-model="showLogs"
      :network-id="logsNetworkId"
    />

    <!-- 同步配置对话框 -->
    <TronNetworkSync
      v-model="showSync"
      :network-id="syncNetworkId"
      @success="handleSyncSuccess"
    />

    <!-- 网络编辑Modal -->
    <NetworkEditModal
      v-model:visible="showEditModal"
      :network-data="editingNetwork"
      @success="handleEditSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import NetworkEditModal from '@/components/NetworkEditModal.vue'
import TronNetworkDetail from '@/components/TronNetworkDetail.vue'
import TronNetworkLogs from '@/components/TronNetworkLogs.vue'
import TronNetworkSync from '@/components/TronNetworkSync.vue'
import { Plus, RefreshCw, Zap } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import NetworkFilters from './components/NetworkFilters.vue'
import NetworkStats from './components/NetworkStats.vue'
import NetworkTable from './components/NetworkTable.vue'
import { useTronNetworks } from './composables/useTronNetworks'

// 路由
const router = useRouter()

// 使用组合式函数
const {
  // 状态
  loading,
  testingAll,
  networks,
  selectedNetworks,
  currentPage,
  pageSize,
  total,
  searchForm,
  
  // 计算属性
  stats,
  filteredNetworks,
  
  // 方法
  refreshData,
  testAllConnections,
  handleSearch,
  resetSearch,
  handleTest,
  handleToggleStatus,
  handleSelectionChange,
  handleBatchEnable,
  handleBatchDisable,
  handleDelete,
  copyToClipboard,
  handleSizeChange,
  handleCurrentChange
} = useTronNetworks()

// 对话框状态
const showDetail = ref(false)
const detailNetworkId = ref<string>('')
const showLogs = ref(false)
const logsNetworkId = ref('')
const showSync = ref(false)
const syncNetworkId = ref('')
const showEditModal = ref(false)
const editingNetwork = ref<any>(null)

// 业务逻辑方法
const handleCreate = () => {
  editingNetwork.value = null
  showEditModal.value = true
}

const handleEdit = (network: any) => {
  editingNetwork.value = network
  showEditModal.value = true
}

const handleViewDetail = (network: any) => {
  detailNetworkId.value = network.id
  showDetail.value = true
}

const handleDetailEdit = (networkId: string) => {
  const network = networks.value.find(n => n.id === networkId)
  if (network) {
    handleEdit(network)
  }
}

const handleViewLogs = (network: any) => {
  logsNetworkId.value = network.id
  showLogs.value = true
}

const handleSyncConfig = (network: any) => {
  syncNetworkId.value = network.id
  showSync.value = true
}

const handleSyncSuccess = () => {
  refreshData()
}

const handleEditSuccess = () => {
  refreshData()
}

const handleDropdownCommand = async (command: string, network: any) => {
  switch (command) {
    case 'view':
      handleViewDetail(network)
      break
    case 'logs':
      handleViewLogs(network)
      break
    case 'sync':
      handleSyncConfig(network)
      break
    case 'delete':
      await handleDelete(network)
      break
  }
}
</script>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.gap-6 {
  gap: 1.5rem;
}

.gap-4 {
  gap: 1rem;
}
</style>