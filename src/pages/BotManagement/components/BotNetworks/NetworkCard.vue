<!--
 * 单个网络卡片组件
 * 职责：展示单个网络的详细信息和操作按钮
-->
<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
    <!-- 网络卡片头部 -->
    <div class="p-4 border-b border-gray-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Network class="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">{{ network.name }}</h3>
            <p class="text-sm text-gray-500">Chain ID: {{ network.chain_id }}</p>
          </div>
        </div>
        <el-switch
          :model-value="network.is_active"
          @change="handleToggle"
          :loading="network.updating"
        />
      </div>
    </div>

    <!-- 网络配置信息 -->
    <div class="p-4">
      <div class="space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">状态:</span>
          <el-tag
            :type="network.is_active ? 'success' : 'danger'"
            size="small"
          >
            {{ network.is_active ? '启用' : '禁用' }}
          </el-tag>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">RPC地址:</span>
          <span class="text-gray-700 truncate ml-2" :title="network.rpc_url">
            {{ network.rpc_url }}
          </span>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">连接状态:</span>
          <div class="flex items-center space-x-1">
            <div 
              :class="[
                'w-2 h-2 rounded-full',
                network.connection_status === 'connected' ? 'bg-green-500' :
                network.connection_status === 'connecting' ? 'bg-yellow-500' :
                'bg-red-500'
              ]"
            ></div>
            <span class="text-xs">
              {{ getConnectionStatusText(network.connection_status) }}
            </span>
          </div>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">最后检查:</span>
          <span class="text-gray-700">{{ formatDate(network.last_check_at) }}</span>
        </div>
      </div>
    </div>

    <!-- 网络操作 -->
    <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
      <div class="flex space-x-2">
        <el-button size="small" @click="handleTest">
          <Zap class="w-3 h-3 mr-1" />
          测试
        </el-button>
        <el-button size="small" @click="handleEdit">
          <Edit class="w-3 h-3 mr-1" />
          编辑
        </el-button>
      </div>
      <el-dropdown @command="handleDropdownCommand">
        <el-button size="small" text>
          <MoreHorizontal class="w-4 h-4" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="sync">同步配置</el-dropdown-item>
            <el-dropdown-item command="logs">查看日志</el-dropdown-item>
            <el-dropdown-item command="remove" divided>
              <span class="text-red-600">移除关联</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '@/utils/date'
import { Edit, MoreHorizontal, Network, Zap } from 'lucide-vue-next'

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
  network: BotNetwork
}

interface Emits {
  (e: 'toggle', network: BotNetwork): void
  (e: 'test', network: BotNetwork): void
  (e: 'edit', network: BotNetwork): void
  (e: 'dropdown-command', command: string, network: BotNetwork): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleToggle = () => {
  emit('toggle', props.network)
}

const handleTest = () => {
  emit('test', props.network)
}

const handleEdit = () => {
  emit('edit', props.network)
}

const handleDropdownCommand = (command: string) => {
  emit('dropdown-command', command, props.network)
}

const getConnectionStatusText = (status: string) => {
  switch (status) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中'
    case 'disconnected': return '未连接'
    default: return '未知'
  }
}
</script>

<style scoped>
.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.space-x-1 > * + * {
  margin-left: 0.25rem;
}

.space-x-2 > * + * {
  margin-left: 0.5rem;
}

.space-x-3 > * + * {
  margin-left: 0.75rem;
}
</style>
