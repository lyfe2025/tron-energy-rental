<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900">账户详情</h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <div v-if="account" class="space-y-6">
        <!-- 基本信息 -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">账户ID</label>
              <p class="text-sm text-gray-900">{{ account.id }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <span :class="getStatusClass(account.status)" class="inline-flex px-2 py-1 text-xs font-medium rounded-full">
                {{ getStatusText(account.status) }}
              </span>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">钱包地址</label>
              <div class="flex items-center space-x-2">
                <p class="text-sm text-gray-900 font-mono">{{ account.tron_address }}</p>
                <button
                  @click="copyToClipboard(account.tron_address)"
                  :class="[
                    'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                    copyStatus === 'success' 
                      ? 'bg-green-100 text-green-600 border border-green-300' 
                      : copyStatus === 'error'
                      ? 'bg-red-100 text-red-600 border border-red-300'
                      : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-transparent'
                  ]"
                  :title="copyStatus === 'success' ? '已复制' : copyStatus === 'error' ? '复制失败' : '复制地址'"
                  :disabled="copyStatus === 'success'"
                >
                  <Check v-if="copyStatus === 'success'" class="w-4 h-4" />
                  <X v-else-if="copyStatus === 'error'" class="w-4 h-4" />
                  <Copy v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div v-if="realTimeAccountData.realTimeData.value" class="md:col-span-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">TRX余额</label>
              <p class="text-sm text-gray-900">{{ realTimeAccountData.formatTrx(realTimeAccountData.realTimeData.value.balance) }}</p>
            </div>
            <div v-if="realTimeAccountData.realTimeData.value" class="md:col-span-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">USDT余额</label>
              <div class="flex items-center space-x-2">
                <p class="text-sm text-gray-900" :class="realTimeAccountData.realTimeData.value.usdtInfo?.error ? 'text-gray-500' : 'text-gray-900'">
                  {{ realTimeAccountData.realTimeData.value.usdtBalance ? realTimeAccountData.realTimeData.value.usdtBalance.toFixed(6) : '0.000000' }} USDT
                </p>
                <span v-if="realTimeAccountData.realTimeData.value.usdtInfo?.error" 
                  class="text-xs text-orange-600 cursor-help px-1 py-0.5 bg-orange-50 rounded" 
                  :title="realTimeAccountData.realTimeData.value.usdtInfo.error">
                  ⚠️
                </span>
              </div>
            </div>
            
            <!-- 合约地址信息 -->
            <div v-if="realTimeAccountData.realTimeData.value?.contractInfo" class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">USDT合约地址</label>
              <div class="bg-gray-50 rounded p-2 flex items-center justify-between">
                <code class="text-xs font-mono text-gray-700">
                  {{ realTimeAccountData.realTimeData.value.contractInfo.address }}
                </code>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500">{{ realTimeAccountData.realTimeData.value.contractInfo.decimals }}位精度</span>
                  <span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {{ realTimeAccountData.realTimeData.value.contractInfo.symbol }}
                  </span>
                </div>
              </div>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">最后更新时间</label>
              <p class="text-sm text-gray-900">{{ formatDate(account.last_updated_at) }}</p>
            </div>
          </div>
        </div>

        <!-- 能量信息 -->
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">能量信息</h3>
            <button
              @click="fetchRealTimeData"
              :disabled="realTimeAccountData.loading.value"
              class="flex items-center space-x-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              <RefreshCw :class="{ 'animate-spin': realTimeAccountData.loading.value }" class="w-4 h-4" />
              <span>{{ realTimeAccountData.loading.value ? '获取中...' : '刷新' }}</span>
            </button>
          </div>
          
          <div v-if="realTimeAccountData.realTimeData.value" class="space-y-4">
            <!-- 主要指标 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{{ realTimeAccountData.formatEnergy(realTimeAccountData.realTimeData.value.energy.total) }}</div>
                <div class="text-sm text-gray-600">理论总能量</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-orange-600">{{ realTimeAccountData.formatEnergy(realTimeAccountData.realTimeData.value.energy.available) }}</div>
                <div class="text-sm text-gray-600">实际可用能量</div>
              </div>
            </div>
            
            <!-- 详细指标 -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div class="text-center bg-green-50 p-2 rounded">
                <div class="font-semibold text-green-600">{{ realTimeAccountData.formatEnergy(realTimeAccountData.realTimeData.value.energy.limit || 0) }}</div>
                <div class="text-green-700">质押获得</div>
              </div>
              <div class="text-center bg-red-50 p-2 rounded">
                <div class="font-semibold text-red-600">{{ realTimeAccountData.formatEnergy(realTimeAccountData.realTimeData.value.energy.used || 0) }}</div>
                <div class="text-red-700">已使用</div>
              </div>
              <div class="text-center bg-yellow-50 p-2 rounded">
                <div class="font-semibold text-yellow-600">{{ Math.floor(((realTimeAccountData.realTimeData.value.energy.delegatedOut || 0) / 1000000) * 76.2).toLocaleString() }}</div>
                <div class="text-yellow-700">代理出去</div>
              </div>
              <div class="text-center bg-purple-50 p-2 rounded">
                <div class="font-semibold text-purple-600">{{ Math.floor(((realTimeAccountData.realTimeData.value.energy.delegatedIn || 0) / 1000000) * 76.2).toLocaleString() }}</div>
                <div class="text-purple-700">代理获得</div>
              </div>
            </div>
          </div>
          
          <div v-else-if="realTimeAccountData.loading.value" class="flex items-center justify-center py-8">
            <RefreshCw class="animate-spin w-6 h-6 text-gray-400 mr-2" />
            <span class="text-gray-500">正在获取实时数据...</span>
          </div>
          
          <div v-else class="text-center py-4 text-gray-500">
            暂无实时数据
          </div>
          
          <!-- 能量使用率 -->
          <div class="mt-4">
            <div class="flex justify-between text-sm text-gray-600 mb-1">
              <span>能量使用率</span>
              <span>{{ usagePercentage }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${usagePercentage}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 带宽信息 -->
        <div class="bg-purple-50 rounded-lg p-4">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-medium text-gray-900">带宽信息</h3>
            <div class="text-right">
              <div class="text-xs text-gray-500" v-if="realTimeAccountData.realTimeData.value">
                🕐 {{ formatDate(new Date().toISOString()) }}
              </div>
              <button 
                @click="toggleDataExplanation"
                class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer transition-colors flex items-center space-x-1" 
                :title="showDataExplanation ? '收起数据说明' : '查看数据说明'">
                <span>ℹ️</span>
                <span>{{ showDataExplanation ? '收起说明' : '数据说明' }}</span>
                <svg :class="{ 'rotate-180': showDataExplanation }" class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <div v-if="realTimeAccountData.realTimeData.value" class="space-y-4">
            <!-- 主要指标 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-600">{{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value.bandwidth.total) }}</div>
                <div class="text-sm text-gray-600">理论总带宽</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-orange-600">{{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value.bandwidth.available) }}</div>
                <div class="text-sm text-gray-600">实际可用带宽</div>
              </div>
            </div>
            
            <!-- 详细指标 -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div class="text-center bg-green-50 p-2 rounded">
                <div class="font-semibold text-green-600">{{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value.bandwidth.limit || 0) }}</div>
                <div class="text-green-700">质押获得</div>
              </div>
              <div class="text-center bg-blue-50 p-2 rounded">
                <div class="font-semibold text-blue-600">600</div>
                <div class="text-blue-700">免费带宽</div>
              </div>
              <div class="text-center bg-red-50 p-2 rounded">
                <div class="font-semibold text-red-600">{{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value.bandwidth.used || 0) }}</div>
                <div class="text-red-700">已使用</div>
                <div v-if="realTimeAccountData.realTimeData.value.bandwidth.freeUsed !== undefined" class="text-xs text-red-500 mt-1">
                  免费: {{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value.bandwidth.freeUsed || 0) }}
                  质押: {{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value.bandwidth.stakedUsed || 0) }}
                </div>
              </div>
              <div class="text-center bg-yellow-50 p-2 rounded">
                <div class="font-semibold text-yellow-600">{{ Math.floor(((realTimeAccountData.realTimeData.value.bandwidth.delegatedOut || 0) / 1000000) * 1000).toLocaleString() }}</div>
                <div class="text-yellow-700">代理出去</div>
              </div>
              <div class="text-center bg-purple-50 p-2 rounded">
                <div class="font-semibold text-purple-600">{{ Math.floor(((realTimeAccountData.realTimeData.value.bandwidth.delegatedIn || 0) / 1000000) * 1000).toLocaleString() }}</div>
                <div class="text-purple-700">代理获得</div>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-4 text-gray-500">
            暂无实时数据
          </div>
          
          <!-- 带宽使用率 -->
          <div class="mt-4">
            <div class="flex justify-between text-sm text-gray-600 mb-1">
              <span>带宽使用率</span>
              <span>{{ bandwidthUsagePercentage }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-purple-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${bandwidthUsagePercentage}%` }"
              ></div>
            </div>
          </div>
          
          <!-- 数据差异说明（可收起/展开） -->
          <Transition name="slide-fade" mode="out-in">
            <div v-show="showDataExplanation" class="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <div class="flex items-start space-x-2">
                <span class="flex-shrink-0">💡</span>
                <div>
                  <div class="font-medium">数据来源说明</div>
                  <div class="mt-1">
                    带宽使用数据来自TRON网络实时API，获取时间: {{ realTimeAccountData.realTimeData.value ? formatDate(new Date().toISOString()) : '--' }}。
                    如与区块浏览器数据有微小差异（通常±20个单位内），属正常现象，因为：
                  </div>
                  <ul class="mt-1 ml-4 space-y-0.5 text-xs">
                    <li>• 数据获取时间点不同</li>
                    <li>• API缓存和同步延迟</li>
                    <li>• 网络状态实时变化</li>
                  </ul>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 成本信息 -->
        <div class="bg-green-50 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">成本信息</h3>
          
          <div v-if="realTimeAccountData.realTimeData.value" class="space-y-4">
            <!-- 单位成本 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-white rounded-lg p-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">能量单位成本</label>
                <p class="text-lg font-semibold text-blue-600">{{ realTimeAccountData.realTimeData.value.estimatedCostPerEnergy.toFixed(6) }} TRX</p>
                <p class="text-xs text-gray-500">100 sun = 0.0001 TRX</p>
              </div>
              <div class="bg-white rounded-lg p-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">带宽单位成本</label>
                <p class="text-lg font-semibold text-purple-600">{{ realTimeAccountData.realTimeData.value.estimatedCostPerBandwidth?.toFixed(6) || '0.001000' }} TRX</p>
                <p class="text-xs text-gray-500">1,000 sun = 0.001 TRX</p>
              </div>
            </div>
            
            <!-- 总价值 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-white rounded-lg p-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">能量总价值</label>
                <p class="text-lg font-semibold text-green-600">
                  {{ (realTimeAccountData.realTimeData.value.energy.total * realTimeAccountData.realTimeData.value.estimatedCostPerEnergy).toFixed(6) }} TRX
                </p>
                <p class="text-xs text-gray-500">{{ realTimeAccountData.realTimeData.value.energy.total.toLocaleString() }} 能量单位</p>
              </div>
              <div class="bg-white rounded-lg p-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">带宽总价值</label>
                <p class="text-lg font-semibold text-indigo-600">
                  {{ (realTimeAccountData.realTimeData.value.bandwidth.total * (realTimeAccountData.realTimeData.value.estimatedCostPerBandwidth || 0.001)).toFixed(6) }} TRX
                </p>
                <p class="text-xs text-gray-500">{{ realTimeAccountData.realTimeData.value.bandwidth.total.toLocaleString() }} 带宽单位</p>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-4 text-gray-500">
            暂无实时数据
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button
            @click="$emit('edit', account)"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Edit class="w-4 h-4" />
            <span>编辑账户</span>
          </button>
          <button
            @click="$emit('close')"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500">未找到账户信息</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRealTimeAccountData } from '@/composables/useRealTimeAccountData'
import { Check, Copy, Edit, RefreshCw, X } from 'lucide-vue-next'
import { toast } from 'sonner'
import { computed, ref, watch } from 'vue'
import type { EnergyPoolAccount } from '../composables/useEnergyPool'

interface Props {
  isOpen: boolean
  account: EnergyPoolAccount | null
  currentNetworkId?: string
  currentNetwork?: any
}

interface Emits {
  close: []
  edit: [account: EnergyPoolAccount]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 复制状态管理
const copyStatus = ref<'idle' | 'success' | 'error'>('idle')

// 数据说明展开状态
const showDataExplanation = ref(false)

// 使用实时账户数据composable
const realTimeAccountData = useRealTimeAccountData()

// 获取实时TRON数据
const fetchRealTimeData = async () => {
  if (!props.account) return

  console.log('🔍 [AccountDetailsModal] 开始获取实时数据:', {
    accountId: props.account.id,
    address: props.account.tron_address,
    currentNetworkId: props.currentNetworkId,
    currentNetwork: props.currentNetwork
  })

  await realTimeAccountData.fetchRealTimeData(
    props.account.tron_address,
    props.currentNetworkId
  )
}

// 计算能量使用率 - 使用实时数据
const usagePercentage = computed(() => {
  if (!realTimeAccountData.realTimeData.value?.energy || realTimeAccountData.realTimeData.value.energy.total === 0) return 0
  const used = realTimeAccountData.realTimeData.value.energy.used || 0
  return Math.round((used / realTimeAccountData.realTimeData.value.energy.total) * 100)
})

// 计算带宽使用率 - 使用实时数据
const bandwidthUsagePercentage = computed(() => {
  if (!realTimeAccountData.realTimeData.value?.bandwidth || realTimeAccountData.realTimeData.value.bandwidth.total === 0) return 0
  const used = realTimeAccountData.realTimeData.value.bandwidth.used || 0
  return Math.round((used / realTimeAccountData.realTimeData.value.bandwidth.total) * 100)
})

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copyStatus.value = 'success'
    toast.success('地址已复制到剪贴板')
    
    // 3秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle'
    }, 3000)
  } catch (error) {
    console.error('Failed to copy:', error)
    copyStatus.value = 'error'
    toast.error('复制失败')
    
    // 2秒后重置错误状态
    setTimeout(() => {
      copyStatus.value = 'idle'
    }, 2000)
  }
}

// 切换数据说明显示状态
const toggleDataExplanation = () => {
  showDataExplanation.value = !showDataExplanation.value
}

// 监听模态框开启状态，自动获取实时数据
watch(() => props.isOpen, async (newValue) => {
  if (newValue && props.account) {
    await fetchRealTimeData()
  }
}, { immediate: true })

// 监听账户变化，清空数据
watch(() => props.account, (newAccount) => {
  if (!newAccount) {
    realTimeAccountData.clearData()
  }
}, { immediate: true })

// 格式化日期
const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取状态样式类
const getStatusClass = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-800'
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// 获取状态文本
const getStatusText = (status: string): string => {
  switch (status) {
    case 'active':
      return '已启用'
    case 'inactive':
      return '已停用'
    case 'maintenance':
      return '维护中'
    default:
      return '未知'
  }
}
</script>

<style scoped>
/* 平滑过渡动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
  max-height: 200px;
  opacity: 1;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  opacity: 1;
  max-height: 200px;
  transform: translateY(0);
}
</style>