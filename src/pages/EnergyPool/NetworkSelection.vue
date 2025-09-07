<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 页面标题 -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ getPageTitle() }}</h1>
        <p class="text-gray-600">{{ getPageDescription() }}</p>
      </div>

      <!-- 网络选择卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="network in networks"
          :key="network.id"
          class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border-2 border-transparent hover:border-blue-500"
          @click="handleNetworkClick(network)"
        >
          <div class="p-6">
            <!-- 网络图标和名称 -->
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                   :class="getNetworkIconClass(network.type)">
                <span class="text-white font-bold text-lg">{{ getNetworkIcon(network.type) }}</span>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">{{ network.name }}</h3>
                <p class="text-sm text-gray-500">{{ getNetworkTypeText(network.type) }}</p>
              </div>
            </div>

            <!-- 网络状态 -->
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm text-gray-600">状态</span>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="network.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                {{ network.is_active ? '活跃' : '停用' }}
              </span>
            </div>

            <!-- 网络信息 -->
            <div class="space-y-2 text-sm text-gray-600">
              <div class="flex justify-between">
                <span>RPC节点</span>
                <span class="text-right truncate ml-2">{{ network.rpc_url }}</span>
              </div>
              <div class="flex justify-between" v-if="network.explorer_url">
                <span>浏览器</span>
                <span class="text-right truncate ml-2">{{ network.explorer_url }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="mt-6 flex space-x-3">
              <!-- 根据intent显示对应按钮，如果没有intent则显示全部 -->
              <template v-if="!route.query.intent">
                <button
                  @click.stop="goToAccounts(network)"
                  class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  :disabled="!network.is_active"
                >
                  账户管理
                </button>
                <button
                  @click.stop="goToStake(network)"
                  class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                  :disabled="!network.is_active"
                >
                  质押管理
                </button>
              </template>
              <template v-else-if="route.query.intent === 'accounts'">
                <button
                  @click.stop="goToAccounts(network)"
                  class="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  :disabled="!network.is_active"
                >
                  进入账户管理
                </button>
              </template>
              <template v-else-if="route.query.intent === 'stake'">
                <button
                  @click.stop="goToStake(network)"
                  class="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                  :disabled="!network.is_active"
                >
                  进入质押管理
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">加载网络信息中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="networks.length === 0" class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无可用网络</h3>
        <p class="text-gray-600">请联系管理员配置网络信息</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { networkApi } from '@/api/network'
import { getNetworkIcon, getNetworkIconClass, getNetworkTypeText } from '@/utils/network'
import { toast } from 'sonner'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface Network {
  id: number
  name: string
  type: string
  rpc_url: string
  explorer_url?: string
  is_active: boolean
}

const router = useRouter()
const route = useRoute()
const loading = ref(true)
const networks = ref<Network[]>([])


// 选择网络
const selectNetwork = (network: Network) => {
  if (!network.is_active) {
    toast.error('该网络当前不可用')
    return
  }
  // 这里可以添加网络选择的逻辑
}

// 处理网络卡片点击
const handleNetworkClick = (network: Network) => {
  if (!network.is_active) {
    toast.error('该网络当前不可用')
    return
  }
  
  const intent = route.query.intent as string
  if (intent === 'accounts') {
    goToAccounts(network)
  } else if (intent === 'stake') {
    goToStake(network)
  } else {
    // 没有明确意图时，不做任何操作，让用户点击按钮选择
    selectNetwork(network)
  }
}

// 获取页面标题
const getPageTitle = () => {
  const intent = route.query.intent as string
  if (intent === 'accounts') {
    return '账户管理 - 选择网络'
  } else if (intent === 'stake') {
    return '质押管理 - 选择网络'
  }
  return '能量池管理'
}

// 获取页面描述
const getPageDescription = () => {
  const intent = route.query.intent as string
  if (intent === 'accounts') {
    return '请选择要管理账户的网络'
  } else if (intent === 'stake') {
    return '请选择要进行质押管理的网络'
  }
  return '请选择要管理的网络'
}

// 跳转到账户管理
const goToAccounts = (network: Network) => {
  if (!network.is_active) {
    toast.error('该网络当前不可用')
    return
  }
  // 检查当前路由，决定跳转目标
  const currentRoute = router.currentRoute.value
  if (currentRoute.name === 'config-energy-pools') {
    // 从配置管理进入，跳转到配置管理的账户页面
    router.push({
      name: 'config-energy-pools-network',
      params: { networkId: network.id }
    })
  } else {
    // 从能量池管理进入，跳转到能量池账户页面
    router.push({
      name: 'energy-pool-accounts',
      params: { networkId: network.id }
    })
  }
}

// 跳转到质押管理
const goToStake = (network: Network) => {
  if (!network.is_active) {
    toast.error('该网络当前不可用')
    return
  }
  router.push({
    name: 'energy-pool-stake',
    params: { networkId: network.id }
  })
}

// 根据意图自动跳转
const autoNavigateByIntent = (network: Network) => {
  const intent = route.query.intent as string
  if (intent === 'accounts') {
    goToAccounts(network)
  } else if (intent === 'stake') {
    goToStake(network)
  }
}

// 加载网络列表
const loadNetworks = async () => {
  try {
    loading.value = true
    console.log('🔍 [NetworkSelection] 开始加载网络列表...')
    const response = await networkApi.getNetworks()
    console.log('📡 [NetworkSelection] API响应:', response)
    
    // request工具会将后端响应包装成 {success: true, data: {networks: [...], pagination: {...}}}
    // 所以我们需要从 response.data.data.networks 获取网络列表
    if (response.success && response.data) {
      const allNetworks = response.data.data?.networks || response.data.networks || []
      // 只显示活跃的网络
      networks.value = allNetworks.filter((network: Network) => network.is_active)
    } else {
      networks.value = []
      throw new Error(response.error || '获取网络列表失败')
    }
    
    console.log('✅ [NetworkSelection] 网络列表加载完成:', {
      count: networks.value.length,
      networks: networks.value.map(n => ({ id: n.id, name: n.name, type: n.type, is_active: n.is_active }))
    })
  } catch (error: any) {
    console.error('❌ [NetworkSelection] 加载网络列表失败:', error)
    toast.error(error.message || '加载网络列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadNetworks()
})
</script>

<style scoped>
.grid {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

button:disabled {
  @apply opacity-50 cursor-not-allowed;
}
</style>