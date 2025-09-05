<template>
  <!-- 操作按钮 -->
  <div class="flex flex-wrap gap-4 mb-6">
    <button
      @click="$emit('refreshStatus')"
      :disabled="loading.refresh"
      class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': loading.refresh }]" />
      刷新状态
    </button>
    
    <button
      @click="$emit('showAddModal')"
      class="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
    >
      <Plus class="h-4 w-4 mr-2" />
      添加账户
    </button>

    <!-- 批量操作按钮 -->
    <div v-if="selectedAccounts.length > 0" class="flex items-center gap-2">
      <span class="text-sm text-gray-600">已选择 {{ selectedAccounts.length }} 个账户</span>
      <button
        @click="$emit('batchEnable')"
        :disabled="loading.batch"
        class="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        <Play class="h-4 w-4 mr-1" />
        批量启用
      </button>
      <button
        @click="$emit('batchDisable')"
        :disabled="loading.batch"
        class="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        <Power class="h-4 w-4 mr-1" />
        批量停用
      </button>
      <button
        @click="$emit('showBatchNetworkModal')"
        class="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        <Network class="h-4 w-4 mr-1" />
        批量设置网络
      </button>
      <button
        @click="$emit('batchSync')"
        :disabled="loading.batch"
        class="flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
      >
        <RefreshCw class="h-4 w-4 mr-1" />
        批量同步
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
    Network,
    Play,
    Plus,
    Power,
    RefreshCw
} from 'lucide-vue-next';

interface Props {
  loading: any
  selectedAccounts: string[]
}

defineProps<Props>()

defineEmits<{
  refreshStatus: []
  showAddModal: []
  batchEnable: []
  batchDisable: []
  showBatchNetworkModal: []
  batchSync: []
}>()
</script>

<style scoped>
</style>
