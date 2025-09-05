<template>
  <!-- 账户列表 -->
  <div class="bg-white rounded-lg shadow">
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">能量池账户</h2>
    </div>
    
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="$emit('toggleSelectAll')"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">账户信息</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">优先级</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">配置网络</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总能量</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">可用能量</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成本/能量</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="account in filteredAccounts" :key="account.id" class="hover:bg-gray-50" :class="{ 'bg-blue-50': selectedAccounts.includes(account.id) }">
            <td class="px-6 py-4 whitespace-nowrap">
              <input
                type="checkbox"
                :checked="selectedAccounts.includes(account.id)"
                @change="$emit('toggleAccountSelection', account.id)"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                  <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Wallet class="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">{{ account.name }}</div>
                  <div class="text-sm text-gray-500">{{ formatAddress(account.tron_address) }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getAccountTypeClass(account.account_type)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                {{ getAccountTypeText(account.account_type) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ account.priority || 50 }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getStatusClass(account.status)" class="px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-full">
                {{ getStatusText(account.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <div class="flex flex-col">
                  <span
                    v-if="account.network_config"
                    class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mb-1"
                  >
                    {{ account.network_config.name }}
                  </span>
                  
                  <!-- 网络状态显示 -->
                  <div v-if="account.network_config?.id" class="mb-1">
                    <NetworkStatus
                      :network-id="account.network_config.id"
                      :show-details="false"
                      :show-refresh="false"
                      :auto-refresh="true"
                      :refresh-interval="60"
                    />
                  </div>
                </div>
                
                <button
                  v-if="!account.network_config?.id"
                  @click="$emit('handleAccountNetworkSetting', account)"
                  class="px-2 py-1 text-xs text-gray-500 border border-dashed border-gray-300 rounded-full hover:border-blue-500 hover:text-blue-500"
                >
                  + 设置网络
                </button>
                <button
                  v-else
                  @click="$emit('handleAccountNetworkSetting', account)"
                  class="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  更改
                </button>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatEnergy(account.total_energy) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatEnergy(account.available_energy) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ account.cost_per_energy }} TRX
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div class="flex items-center justify-end space-x-2">
                <!-- 维护中状态显示特殊按钮 -->
                <button
                  v-if="account.status === 'maintenance'"
                  class="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 cursor-not-allowed"
                  title="账户维护中"
                  disabled
                >
                  <Power class="h-4 w-4" />
                </button>
                <!-- 启用状态显示停用按钮 -->
                <button
                  v-else-if="account.status === 'active'"
                  @click="$emit('confirmDisableAccount', account)"
                  :disabled="loading.accounts"
                  class="text-red-600 hover:text-red-900 disabled:opacity-50"
                  title="停用账户"
                >
                  <Power class="h-4 w-4" />
                </button>
                <!-- 停用状态显示启用按钮 -->
                <button
                  v-else
                  @click="$emit('confirmEnableAccount', account)"
                  :disabled="loading.accounts"
                  class="text-green-600 hover:text-green-900 disabled:opacity-50"
                  title="启用账户"
                >
                  <Play class="h-4 w-4" />
                </button>
                <button
                  @click="$emit('manageNetworks', account)"
                  class="text-blue-600 hover:text-blue-900"
                  title="网络管理"
                >
                  <Network class="h-4 w-4" />
                </button>
                <button
                  @click="$emit('syncAccount', account)"
                  :disabled="loading.sync"
                  class="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                  title="同步账户"
                >
                  <RefreshCw :class="['h-4 w-4', { 'animate-spin': loading.sync && syncingAccountId === account.id }]" />
                </button>
                <button
                  @click="$emit('editAccount', account)"
                  class="text-indigo-600 hover:text-indigo-900"
                  title="编辑账户"
                >
                  <Edit class="h-4 w-4" />
                </button>
                <button
                  @click="$emit('viewDetails', account)"
                  class="text-gray-600 hover:text-gray-900"
                  title="查看详情"
                >
                  <Eye class="h-4 w-4" />
                </button>
                <button
                  @click="$emit('confirmDeleteAccount', account)"
                  class="text-red-600 hover:text-red-900"
                  title="删除账户"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div v-if="filteredAccounts.length === 0" class="text-center py-12">
      <Database class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">暂无账户</h3>
      <p class="mt-1 text-sm text-gray-500">开始添加能量池账户来管理能量资源</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import NetworkStatus from '@/components/NetworkStatus.vue'
import {
    Database,
    Edit,
    Eye,
    Network,
    Play,
    Power,
    RefreshCw,
    Trash2,
    Wallet
} from 'lucide-vue-next'
import type { EnergyPoolAccount } from '../composables/useEnergyPool'

interface Props {
  filteredAccounts: EnergyPoolAccount[]
  selectedAccounts: string[]
  isAllSelected: boolean
  loading: any
  syncingAccountId: string | null
  formatEnergy: (value: number) => string
  formatAddress: (address: string) => string
  getStatusClass: (status: string) => string
  getStatusText: (status: string) => string
  getAccountTypeText: (type: string) => string
  getAccountTypeClass: (type: string) => string
}

defineProps<Props>()

defineEmits<{
  toggleSelectAll: []
  toggleAccountSelection: [accountId: string]
  handleAccountNetworkSetting: [account: EnergyPoolAccount]
  confirmDisableAccount: [account: EnergyPoolAccount]
  confirmEnableAccount: [account: EnergyPoolAccount]
  manageNetworks: [account: EnergyPoolAccount]
  syncAccount: [account: EnergyPoolAccount]
  editAccount: [account: EnergyPoolAccount]
  viewDetails: [account: EnergyPoolAccount]
  confirmDeleteAccount: [account: EnergyPoolAccount]
}>()
</script>

<style scoped>
</style>
