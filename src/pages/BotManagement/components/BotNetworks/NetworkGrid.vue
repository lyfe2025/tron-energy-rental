<!--
 * 网络网格列表组件
 * 职责：网络卡片的网格布局展示和空状态处理
-->
<template>
  <div v-loading="loading">
    <div v-if="networks.length === 0" class="text-center py-12">
      <Network class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无关联网络</h3>
      <p class="text-gray-500 mb-4">为机器人添加网络配置以开始使用</p>
      <el-button type="primary" @click="handleAddNetwork">
        <Plus class="w-4 h-4 mr-2" />
        添加网络
      </el-button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NetworkCard
        v-for="network in networks"
        :key="network.id"
        :network="network"
        @toggle="handleToggleNetwork"
        @test="handleTestConnection"
        @edit="handleEditNetwork"
        @dropdown-command="handleDropdownCommand"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Network, Plus } from 'lucide-vue-next'
import NetworkCard from './NetworkCard.vue'

interface BotNetwork {
  id: string
  name: string
  chain_id: string
  rpc_url: string
  is_active: boolean
  connection_status: 'connected' | 'connecting' | 'disconnected'
  last_check_at: string
  priority: number
  updating?: boolean
}

interface Props {
  networks: BotNetwork[]
  loading: boolean
}

interface Emits {
  (e: 'add-network'): void
  (e: 'toggle-network', network: BotNetwork): void
  (e: 'test-connection', network: BotNetwork): void
  (e: 'edit-network', network: BotNetwork): void
  (e: 'dropdown-command', command: string, network: BotNetwork): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const handleAddNetwork = () => {
  emit('add-network')
}

const handleToggleNetwork = (network: BotNetwork) => {
  emit('toggle-network', network)
}

const handleTestConnection = (network: BotNetwork) => {
  emit('test-connection', network)
}

const handleEditNetwork = (network: BotNetwork) => {
  emit('edit-network', network)
}

const handleDropdownCommand = (command: string, network: BotNetwork) => {
  emit('dropdown-command', command, network)
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
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.gap-6 {
  gap: 1.5rem;
}
</style>
