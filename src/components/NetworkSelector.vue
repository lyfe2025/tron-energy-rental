<template>
  <div class="network-selector">
    <!-- 当前选择的网络显示 -->
    <div v-if="selectedNetwork && !showSelector" class="selected-network-display">
      <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div class="flex items-center space-x-3">
          <div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Network class="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 class="font-medium text-gray-900">{{ selectedNetwork.name }}</h4>
            <div class="flex items-center space-x-2 text-sm text-gray-500">
              <span>{{ selectedNetwork.type }}</span>
              <span v-if="selectedNetwork.chain_id">• Chain ID: {{ selectedNetwork.chain_id }}</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="selectedNetwork.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                {{ selectedNetwork.is_active ? '活跃' : '非活跃' }}
              </span>
            </div>
          </div>
        </div>
        <button
          @click="showSelector = true"
          class="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
        >
          更换网络
        </button>
      </div>
    </div>

    <!-- 网络选择器 -->
    <div v-if="!selectedNetwork || showSelector" class="network-selection">
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ label || '选择TRON网络' }}
          <span v-if="required" class="text-red-500">*</span>
        </label>
        <div v-if="description" class="text-sm text-gray-500 mb-3">
          {{ description }}
        </div>
      </div>

      <!-- 搜索框 -->
      <div v-if="searchable" class="mb-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索网络..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <!-- 网络列表 -->
      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div v-if="filteredNetworks.length === 0" class="text-center py-8 text-gray-500">
          <Network class="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{{ searchQuery ? '未找到匹配的网络' : '暂无可用网络' }}</p>
        </div>
        
        <div
          v-for="network in filteredNetworks"
          :key="network.id"
          class="network-option border rounded-lg p-3 cursor-pointer transition-all duration-200"
          :class="{
            'border-blue-500 bg-blue-50 ring-2 ring-blue-200': modelValue === network.id,
            'border-gray-200 hover:border-gray-300 hover:bg-gray-50': modelValue !== network.id,
            'opacity-50 cursor-not-allowed': !network.is_active && filterActive
          }"
          @click="selectNetwork(network)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Network class="h-4 w-4 text-blue-600" />
              </div>
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <h4 class="font-medium text-gray-900">{{ network.name }}</h4>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        :class="getNetworkTypeClass(network.type)">
                    {{ getNetworkTypeLabel(network.type) }}
                  </span>
                </div>
                <div class="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                  <span v-if="network.chain_id">Chain ID: {{ network.chain_id }}</span>
                  <span v-if="network.chain_id && network.rpc_url">•</span>
                  <span v-if="network.rpc_url" class="truncate max-w-48">{{ network.rpc_url }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="network.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                {{ network.is_active ? '活跃' : '非活跃' }}
              </span>
              <div v-if="modelValue === network.id" class="h-5 w-5 text-blue-600">
                <Check class="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="showSelector" class="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
        <button
          @click="cancelSelection"
          class="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          @click="confirmSelection"
          :disabled="!tempSelectedNetwork"
          class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          确认选择
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-2 text-gray-600">加载网络列表...</span>
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="text-center py-8">
      <div class="text-red-600 mb-2">{{ error }}</div>
      <button
        @click="loadNetworks"
        class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        重新加载
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Network, Search, Check } from 'lucide-vue-next'
import { networkApi } from '@/api/network'
import type { TronNetwork } from '@/types/network'

interface Props {
  modelValue?: string | null
  label?: string
  description?: string
  required?: boolean
  searchable?: boolean
  filterActive?: boolean // 是否只显示活跃网络
  placeholder?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string | null): void
  (e: 'change', network: TronNetwork | null): void
}

const props = withDefaults(defineProps<Props>(), {
  searchable: true,
  filterActive: true,
  placeholder: '请选择网络'
})

const emit = defineEmits<Emits>()

// 响应式数据
const networks = ref<TronNetwork[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const showSelector = ref(false)
const tempSelectedNetwork = ref<string | null>(null)

// 计算属性
const selectedNetwork = computed(() => {
  return networks.value.find(n => n.id === props.modelValue) || null
})

const filteredNetworks = computed(() => {
  let filtered = networks.value
  
  // 过滤活跃网络
  if (props.filterActive) {
    filtered = filtered.filter(n => n.is_active)
  }
  
  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(n => 
      n.name.toLowerCase().includes(query) ||
      n.type.toLowerCase().includes(query) ||
      (n.chain_id && String(n.chain_id).toLowerCase().includes(query)) ||
      (n.rpc_url && n.rpc_url.toLowerCase().includes(query))
    )
  }
  
  // 按优先级和名称排序
  return filtered.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }
    return a.name.localeCompare(b.name)
  })
})

// 方法
const loadNetworks = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await networkApi.getNetworks()
    // 修复：后端返回的数据结构是 {data: {networks: [...], pagination: {...}}}
    networks.value = Array.isArray(response.data?.networks) ? response.data.networks : []
  } catch (err: any) {
    error.value = err.message || '加载网络列表失败'
    console.error('加载网络列表失败:', err)
  } finally {
    loading.value = false
  }
}

const selectNetwork = (network: TronNetwork) => {
  if (!network.is_active && props.filterActive) {
    return
  }
  
  if (showSelector.value) {
    tempSelectedNetwork.value = network.id
  } else {
    emit('update:modelValue', network.id)
    emit('change', network)
  }
}

const confirmSelection = () => {
  if (tempSelectedNetwork.value) {
    const network = networks.value.find(n => n.id === tempSelectedNetwork.value)
    emit('update:modelValue', tempSelectedNetwork.value)
    emit('change', network || null)
  }
  showSelector.value = false
  tempSelectedNetwork.value = null
}

const cancelSelection = () => {
  showSelector.value = false
  tempSelectedNetwork.value = null
}

const getNetworkTypeClass = (type: string) => {
  switch (type) {
    case 'mainnet':
      return 'bg-green-100 text-green-800'
    case 'testnet':
      return 'bg-yellow-100 text-yellow-800'
    case 'private':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getNetworkTypeLabel = (type: string) => {
  switch (type) {
    case 'mainnet':
      return '主网'
    case 'testnet':
      return '测试网'
    case 'private':
      return '私有网'
    default:
      return type
  }
}

// 监听器
watch(() => props.modelValue, (newValue) => {
  if (showSelector.value) {
    tempSelectedNetwork.value = newValue
  }
})

// 生命周期
onMounted(() => {
  loadNetworks()
})
</script>

<style scoped>
.network-selector {
  @apply w-full;
}

.network-option:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.selected-network-display {
  transition: all 0.2s ease-in-out;
}

.network-selection {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>