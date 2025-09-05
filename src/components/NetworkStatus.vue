<template>
  <div class="network-status">
    <!-- 网络状态指示器 -->
    <div class="flex items-center space-x-2">
      <div 
        :class="[
          'w-3 h-3 rounded-full',
          statusColor
        ]"
      ></div>
      <span class="text-sm font-medium">{{ statusText }}</span>
      
      <!-- 刷新按钮 -->
      <button
        v-if="showRefresh"
        @click="handleRefresh"
        :disabled="loading"
        class="ml-2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        :title="'刷新网络状态'"
      >
        <svg 
          :class="['w-4 h-4', { 'animate-spin': loading }]"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          ></path>
        </svg>
      </button>
    </div>
    
    <!-- 详细信息 -->
    <div v-if="showDetails && networkInfo" class="mt-2 text-xs text-gray-600">
      <div>网络: {{ networkInfo.name }} ({{ networkInfo.type }})</div>
      <div v-if="networkInfo.rpc_url">RPC: {{ networkInfo.rpc_url }}</div>
      <div v-if="networkInfo.chain_id">Chain ID: {{ networkInfo.chain_id }}</div>
      <div v-if="lastChecked">最后检查: {{ formatTime(lastChecked) }}</div>
    </div>
    
    <!-- 错误信息 -->
    <div v-if="error" class="mt-2 text-xs text-red-600">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { networkApi } from '@/api/network'
import type { TronNetwork } from '@/types/network'

interface Props {
  networkId?: string | null
  showRefresh?: boolean
  showDetails?: boolean
  autoRefresh?: boolean
  refreshInterval?: number // 秒
}

interface Emits {
  (e: 'status-change', status: 'connected' | 'disconnected' | 'error'): void
}

const props = withDefaults(defineProps<Props>(), {
  showRefresh: true,
  showDetails: false,
  autoRefresh: false,
  refreshInterval: 30
})

const emit = defineEmits<Emits>()

const loading = ref(false)
const networkInfo = ref<TronNetwork | null>(null)
const status = ref<'connected' | 'disconnected' | 'error'>('disconnected')
const error = ref<string | null>(null)
const lastChecked = ref<Date | null>(null)
const refreshTimer = ref<NodeJS.Timeout | null>(null)

// 计算状态颜色
const statusColor = computed(() => {
  switch (status.value) {
    case 'connected':
      return 'bg-green-500'
    case 'disconnected':
      return 'bg-gray-400'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
})

// 计算状态文本
const statusText = computed(() => {
  if (loading.value) {
    return '检查中...'
  }
  
  switch (status.value) {
    case 'connected':
      return '已连接'
    case 'disconnected':
      return '未连接'
    case 'error':
      return '连接错误'
    default:
      return '未知状态'
  }
})

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 检查网络状态
const checkNetworkStatus = async () => {
  if (!props.networkId) {
    status.value = 'disconnected'
    networkInfo.value = null
    error.value = null
    emit('status-change', 'disconnected')
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    // 获取网络信息
    const networkResponse = await networkApi.getNetwork(props.networkId)
    networkInfo.value = networkResponse.data
    
    // 根据网络状态判断连接状态
    if (networkInfo.value?.is_active) {
      status.value = 'connected'
      emit('status-change', 'connected')
    } else {
      status.value = 'disconnected'
      emit('status-change', 'disconnected')
    }
    
    lastChecked.value = new Date()
  } catch (err: any) {
    console.error('检查网络状态失败:', err)
    status.value = 'error'
    error.value = err.response?.data?.message || '检查网络状态失败'
    emit('status-change', 'error')
  } finally {
    loading.value = false
  }
}

// 手动刷新
const handleRefresh = () => {
  checkNetworkStatus()
}

// 设置自动刷新
const setupAutoRefresh = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }
  
  if (props.autoRefresh && props.networkId) {
    refreshTimer.value = setInterval(() => {
      checkNetworkStatus()
    }, props.refreshInterval * 1000)
  }
}

// 监听网络ID变化
watch(() => props.networkId, () => {
  checkNetworkStatus()
  setupAutoRefresh()
}, { immediate: true })

// 监听自动刷新设置变化
watch([() => props.autoRefresh, () => props.refreshInterval], () => {
  setupAutoRefresh()
})

// 组件挂载时检查状态
onMounted(() => {
  if (props.networkId) {
    checkNetworkStatus()
  }
  setupAutoRefresh()
})

// 组件卸载时清理定时器
const cleanup = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

// 暴露方法给父组件
defineExpose({
  refresh: handleRefresh,
  cleanup
})
</script>

<style scoped>
.network-status {
  @apply inline-block;
}
</style>