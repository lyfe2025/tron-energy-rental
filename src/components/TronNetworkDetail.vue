<template>
  <el-dialog
    v-model="visible"
    title="TRON网络详情"
    width="800px"
    :before-close="handleClose"
  >
    <div v-loading="loading" class="network-detail">
      <div v-if="networkDetail" class="space-y-6">
        <!-- 基本信息 -->
        <el-card>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-lg font-medium">基本信息</span>
              <el-tag :type="getTypeTagType(networkDetail.network.type)">
                {{ getTypeLabel(networkDetail.network.type) }}
              </el-tag>
            </div>
          </template>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-gray-600">网络名称</label>
              <p class="font-medium">{{ networkDetail.network.name }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">网络ID</label>
              <p class="font-mono text-sm">{{ networkDetail.network.id }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">RPC地址</label>
              <p class="font-mono text-sm break-all">{{ networkDetail.network.rpc_url }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">链ID</label>
              <p class="font-medium">{{ networkDetail.network.chain_id }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">API Key</label>
              <p class="font-mono text-sm break-all">{{ networkDetail.network.api_key ? '••••••••••••••••' + networkDetail.network.api_key.slice(-4) : '未设置' }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">浏览器地址</label>
              <p class="font-mono text-sm break-all">{{ networkDetail.network.explorer_url }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">健康状态</label>
              <el-tag :type="getStatusTagType(networkDetail.network.health_status)">
                {{ getStatusLabel(networkDetail.network.health_status) }}
              </el-tag>
            </div>
          </div>
        </el-card>

        <!-- 配置信息 -->
        <el-card>
          <template #header>
            <span class="text-lg font-medium">配置信息</span>
          </template>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-gray-600">优先级</label>
              <p class="font-medium">{{ networkDetail.network.priority }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">超时时间</label>
              <p class="font-medium">{{ networkDetail.network.timeout_ms }}ms</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">重试次数</label>
              <p class="font-medium">{{ networkDetail.network.retry_count }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">速率限制</label>
              <p class="font-medium">{{ networkDetail.network.rate_limit }}/秒</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">是否激活</label>
              <el-tag :type="networkDetail.network.is_active ? 'success' : 'danger'">
                {{ networkDetail.network.is_active ? '已激活' : '未激活' }}
              </el-tag>
            </div>
            <div>
              <label class="text-sm text-gray-600">是否默认</label>
              <el-tag :type="networkDetail.network.is_default ? 'success' : 'info'">
                {{ networkDetail.network.is_default ? '默认网络' : '非默认' }}
              </el-tag>
            </div>
          </div>
        </el-card>

        <!-- 合约地址 -->
        <el-card>
          <template #header>
            <div class="flex items-center">
              <span class="text-lg font-medium">合约地址配置</span>
              <el-tag class="ml-2" size="small" type="info">TRC20</el-tag>
            </div>
          </template>
          
          <div v-if="getContractAddresses().length > 0" class="space-y-4">
            <div 
              v-for="contract in getContractAddresses()" 
              :key="contract.symbol"
              class="border rounded-lg p-4 bg-gray-50"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center">
                  <el-tag :type="contract.is_active ? 'success' : 'danger'" size="small" class="mr-2">
                    {{ contract.symbol }}
                  </el-tag>
                  <span class="text-sm font-medium text-gray-700">{{ contract.name }}</span>
                </div>
                <el-tag size="small" type="info">{{ contract.decimals }}位精度</el-tag>
              </div>
              <div class="mb-2">
                <label class="text-xs text-gray-500">合约地址</label>
                <div class="flex items-center mt-1">
                  <code class="flex-1 text-xs font-mono bg-white px-3 py-2 rounded border break-all">
                    {{ contract.address }}
                  </code>
                  <el-button 
                    size="small" 
                    text 
                    @click="copyToClipboard(contract.address)"
                    class="ml-2"
                  >
                    复制
                  </el-button>
                </div>
              </div>
              <div v-if="contract.description" class="text-xs text-gray-600">
                <label class="text-gray-500">描述：</label>{{ contract.description }}
              </div>
              <div v-if="contract.source" class="text-xs text-gray-500 mt-1">
                <label class="text-gray-500">来源：</label>{{ contract.source }}
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8 text-gray-500">
            <p class="text-sm">暂未配置任何合约地址</p>
            <p class="text-xs mt-1">可通过编辑功能添加合约地址配置</p>
          </div>
        </el-card>

        <!-- 使用统计 -->
        <el-descriptions title="使用统计" :column="3" border>
          <el-descriptions-item label="关联机器人">
            <span v-if="statsLoading">加载中...</span>
            <span v-else class="stat-number">{{ networkStats?.connected_bots || 0 }}</span> 个
          </el-descriptions-item>
          <el-descriptions-item label="能量池数量">
            <span v-if="statsLoading">加载中...</span>
            <span v-else class="stat-number">{{ networkStats?.energy_pools || 0 }}</span> 个
          </el-descriptions-item>
          <el-descriptions-item label="日交易量">
            <span v-if="statsLoading">加载中...</span>
            <span v-else class="stat-number">{{ networkStats?.daily_transactions || 0 }}</span> 笔
          </el-descriptions-item>
        </el-descriptions>

        <!-- 描述信息 -->
        <el-card v-if="networkDetail.network.description">
          <template #header>
            <span class="text-lg font-medium">描述信息</span>
          </template>
          
          <p class="text-gray-700">{{ networkDetail.network.description }}</p>
        </el-card>

        <!-- 时间信息 -->
        <el-card>
          <template #header>
            <span class="text-lg font-medium">时间信息</span>
          </template>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-gray-600">创建时间</label>
              <p class="font-medium">{{ formatDateTime(networkDetail.network.created_at) }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-600">更新时间</label>
              <p class="font-medium">{{ formatDateTime(networkDetail.network.updated_at) }}</p>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleEdit">编辑</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { networkApi } from '@/api/network'
import { useToast } from '@/composables/useToast'
import type { NetworkStats, TronNetwork } from '@/types/network'
import { ref, watch } from 'vue'

interface ContractAddress {
  address: string
  symbol: string
  name: string
  decimals: number
  type: string
  is_active: boolean
  description?: string
  source?: string
}

interface NetworkDetail {
  network: TronNetwork
  usage_stats: {
    connected_bots: number
    energy_pools: number
  }
}

interface Props {
  modelValue: boolean
  networkId?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'edit', networkId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, error } = useToast()

const visible = ref(false)
const loading = ref(false)
const networkDetail = ref<NetworkDetail | null>(null)
const networkStats = ref<NetworkStats | null>(null)
const statsLoading = ref(false)

watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal && props.networkId) {
    fetchNetworkDetail()
  }
})

watch(visible, (newVal) => {
  if (!newVal) {
    emit('update:modelValue', false)
  }
})

const fetchNetworkDetail = async () => {
  if (!props.networkId) return
  
  try {
    loading.value = true
    const response = await networkApi.getNetwork(props.networkId)
    // API直接返回网络数据，需要包装成期望的格式
    networkDetail.value = {
      network: response.data,
      usage_stats: {
        connected_bots: 0,
        energy_pools: 0
      }
    }
    // 同时获取统计数据
    await fetchNetworkStats()
  } catch (error) {
    console.error('获取网络详情失败:', error)
    error('获取网络详情失败')
  } finally {
    loading.value = false
  }
}

// 获取网络统计数据
const fetchNetworkStats = async () => {
  if (!props.networkId) return
  
  statsLoading.value = true
  try {
    const response = await networkApi.getNetworkStats(props.networkId)
    networkStats.value = response.data
  } catch (error) {
    console.error('获取网络统计数据失败:', error)
    // 不显示错误消息，因为这不是关键功能
  } finally {
    statsLoading.value = false
  }
}

const handleClose = () => {
  visible.value = false
}

const handleEdit = () => {
  if (props.networkId) {
    emit('edit', props.networkId)
    handleClose()
  }
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
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

const getContractAddresses = (): ContractAddress[] => {
  if (!networkDetail.value?.network.config?.contract_addresses) {
    return []
  }
  
  const contracts: ContractAddress[] = []
  const contractsObj = networkDetail.value.network.config.contract_addresses
  
  for (const [symbol, contractData] of Object.entries(contractsObj)) {
    contracts.push({
      symbol,
      ...(contractData as ContractAddress)
    })
  }
  
  return contracts
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    success('已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
    error('复制失败')
  }
}
</script>

<style scoped>
.network-detail {
  min-height: 400px;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

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

.gap-4 {
  gap: 1rem;
}

.break-all {
  word-break: break-all;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.font-medium {
  font-weight: 500;
}

.text-gray-600 {
  color: #6b7280;
}

.text-gray-700 {
  color: #374151;
}

.text-blue-600 {
  color: #2563eb;
}

.text-green-600 {
  color: #16a34a;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.justify-end {
  justify-content: flex-end;
}

.space-x-2 > * + * {
  margin-left: 0.5rem;
}
</style>