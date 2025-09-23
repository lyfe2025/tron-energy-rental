<template>
  <div v-loading="loading" class="bg-white rounded-lg shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">网络列表</h3>
        <div class="flex items-center space-x-2">
          <el-button 
            size="small" 
            @click="emit('batch-enable')" 
            :disabled="selectedNetworks.length === 0"
          >
            批量启用
          </el-button>
          <el-button 
            size="small" 
            @click="emit('batch-disable')" 
            :disabled="selectedNetworks.length === 0"
          >
            批量禁用
          </el-button>
        </div>
      </div>
    </div>
    
    <el-table
      :data="networks"
      @selection-change="handleSelectionChange"
      class="w-full"
    >
      <el-table-column type="selection" width="55" />
      
      <el-table-column prop="name" label="网络名称" min-width="150" />
      
      <el-table-column prop="network_type" label="网络类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.network_type)" size="small">
            {{ getTypeLabel(row.network_type) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="rpc_url" label="RPC地址" min-width="200" show-overflow-tooltip />
      
      <el-table-column label="合约地址" min-width="360" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="space-y-1">
            <div 
              v-if="getUSDTContract(row)" 
              class="flex items-center text-sm"
            >
              <span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mr-2 flex-shrink-0">
                USDT
              </span>
              <code class="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded break-all">
                {{ getUSDTContract(row) }}
              </code>
            </div>
            <div v-else class="text-xs text-gray-400">
              未配置合约地址
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column prop="health_status" label="连接状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.health_status)" size="small">
            {{ getStatusLabel(row.health_status) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="timeout_ms" label="超时时间" width="100">
        <template #default="{ row }">
          <span>{{ row.timeout_ms }}ms</span>
        </template>
      </el-table-column>
      
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-switch
            v-model="row.is_active"
            @change="emit('toggle-status', row)"
            :loading="row.updating"
          />
        </template>
      </el-table-column>
      
      <el-table-column label="最后检查" width="120">
        <template #default="{ row }">
          <span class="text-sm text-gray-500">
            {{ formatDate(row.last_check_at) }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <div class="flex items-center space-x-2">
            <el-button size="small" @click="emit('test', row)">
              <Zap class="w-3 h-3 mr-1" />
              测试
            </el-button>
            <el-button size="small" @click="emit('edit', row)">
              <Edit class="w-3 h-3 mr-1" />
              编辑
            </el-button>
            <el-dropdown @command="(command) => emit('dropdown-command', command, row)">
              <el-button size="small" text>
                <MoreHorizontal class="w-4 h-4" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="view">查看详情</el-dropdown-item>
                  <el-dropdown-item command="logs">查看日志</el-dropdown-item>
                  <el-dropdown-item command="sync">同步配置</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <span class="text-red-600">删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 空状态 -->
    <div v-if="!loading && networks.length === 0" class="text-center py-12">
      <Network class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无网络配置</h3>
      <p class="text-gray-500 mb-4">开始添加您的第一个TRON网络配置</p>
      <el-button type="primary" @click="emit('create')">
        <Plus class="w-4 h-4 mr-2" />
        添加网络
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TronNetwork } from '@/types/network'
import { formatDate } from '@/utils/date'
import { Edit, MoreHorizontal, Network, Plus, Zap } from 'lucide-vue-next'

// 扩展TronNetwork类型，添加前端UI状态字段
interface TronNetworkWithUI extends TronNetwork {
  // 前端扩展字段
  connection_status?: 'connected' | 'connecting' | 'disconnected'
  latency?: number
  last_check_at?: string
  updating?: boolean
}

const props = defineProps<{
  networks: TronNetworkWithUI[]
  selectedNetworks: TronNetworkWithUI[]
  loading: boolean
}>()

const emit = defineEmits<{
  'selection-change': [selection: TronNetworkWithUI[]]
  'batch-enable': []
  'batch-disable': []
  'toggle-status': [network: TronNetworkWithUI]
  'test': [network: TronNetworkWithUI]
  'edit': [network: TronNetworkWithUI]
  'dropdown-command': [command: string, network: TronNetworkWithUI]
  'create': []
}>()

const handleSelectionChange = (selection: TronNetworkWithUI[]) => {
  emit('selection-change', selection)
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'mainnet': return '主网'
    case 'testnet': return '测试网'
    case 'private': return '私有网'
    default: return '未知'
  }
}

const getTypeTagType = (type: string) => {
  switch (type) {
    case 'mainnet': return 'success'
    case 'testnet': return 'warning'
    case 'private': return 'info'
    default: return 'info'
  }
}

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'healthy': return 'success'
    case 'unhealthy': return 'danger'
    case 'unknown': return 'info'
    default: return 'info'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'healthy': return '健康'
    case 'unhealthy': return '异常'
    case 'unknown': return '未知'
    default: return '未知'
  }
}

const getUSDTContract = (network: TronNetworkWithUI) => {
  if (!network.config?.contract_addresses?.USDT) {
    return null
  }
  return network.config.contract_addresses.USDT.address
}
</script>

