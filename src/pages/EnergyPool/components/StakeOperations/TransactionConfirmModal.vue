<!--
  TRON质押交易确认弹窗
  仿照官方TRONLink钱包的交易确认界面
-->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <!-- 头部 -->
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-center text-gray-900">确认交易信息</h3>
      </div>

      <!-- 内容 -->
      <div class="p-6 space-y-6">
        <!-- 网络和账户信息 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-blue-600 font-medium">{{ accountName || '测试账户' }}</div>
            <div class="text-xs text-gray-500 mt-1">{{ networkName }}</div>
          </div>
        </div>

        <!-- 交易类型图标 -->
        <div class="flex justify-center">
          <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <!-- 交易详情 -->
        <div class="text-center space-y-2">
          <div class="text-xl font-semibold text-gray-900">质押 2.0</div>
          <div class="text-2xl font-bold text-gray-900">质押 {{ transactionData.amount }} TRX</div>
        </div>

        <!-- 详细信息 -->
        <div class="space-y-4">
          <!-- 获取资源 -->
          <div class="flex items-center justify-between py-2">
            <span class="text-gray-600 text-sm">获取资源</span>
            <span class="font-medium text-gray-900">{{ transactionData.resourceType === 'ENERGY' ? '能量' : '带宽' }}</span>
          </div>

          <!-- 账户 -->
          <div class="flex flex-col py-2">
            <div class="flex items-center justify-between mb-1">
              <span class="text-gray-600 text-sm">账户</span>
              <span class="text-gray-500 text-sm">当前账户</span>
            </div>
            <div class="text-right">
              <div class="font-mono text-sm text-gray-900 break-all">
                {{ truncateAddress(transactionData.accountAddress) }}
              </div>
            </div>
          </div>

          <!-- 获取投票权 -->
          <div class="flex items-center justify-between py-2">
            <span class="text-gray-600 text-sm">获取投票权</span>
            <span class="font-medium text-gray-900">{{ transactionData.amount }} 票</span>
          </div>

          <!-- 预估用户扣除 -->
          <div class="border-t pt-4">
            <div class="flex items-center mb-2">
              <span class="text-gray-600 text-sm">预估用户扣除</span>
              <div class="relative ml-2 group">
                <button class="text-blue-500 hover:text-blue-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <!-- 预估用户扣除说明悬浮框 -->
                <div class="absolute bottom-full left-0 mb-2 w-72 bg-gray-800 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div class="space-y-1">
                    <p>预估用户扣除为用户支付该笔交易的费用，包括资源扣除和TRX扣除，实际资源扣除以链上数据为准</p>
                  </div>
                  <!-- 箭头 -->
                  <div class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            </div>

            <!-- 资源消耗 -->
            <div class="flex items-center justify-between py-1">
              <div class="flex items-center">
                <span class="text-gray-600 text-sm">资源</span>
                <div class="relative ml-1 group">
                  <button class="text-blue-500 hover:text-blue-600">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <!-- 资源说明悬浮框 -->
                  <div class="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div class="space-y-2">
                      <div class="font-medium">资源 = 带宽扣除＋能量扣除</div>
                      <div class="space-y-1">
                        <p><strong>带宽扣除：</strong>交易只能扣除免费带宽或质押带宽，若二者都不满足该笔交易消耗，则需要全部用 TRX 支付，无法部分扣除</p>
                        <p><strong>能量扣除：</strong>该合约按用户支付比例进行估算，交易支持扣除能量后剩余部分由 TRX 支付</p>
                      </div>
                    </div>
                    <!-- 箭头 -->
                    <div class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </div>
              <span class="font-medium text-gray-900">{{ estimatedBandwidthFee }} 带宽</span>
            </div>
          </div>

          <!-- 查看交易总消耗 -->
          <button 
            @click="toggleDetails"
            class="w-full flex items-center justify-between py-3 text-blue-600 hover:text-blue-700 border-t"
          >
            <span class="text-sm">查看交易总消耗</span>
            <svg :class="['w-4 h-4 transition-transform', showDetails ? 'rotate-90' : '']" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <!-- 交易总消耗详细信息 -->
          <div v-if="showDetails" class="bg-gray-50 rounded-lg p-4 space-y-4 text-sm">
            <!-- 标题说明 -->
            <div class="space-y-2">
              <h4 class="font-medium text-gray-900">交易总消耗</h4>
              <p class="text-xs text-gray-600">
                交易总消耗为该笔交易消耗的所有资源（能量和带宽）和手续费，其中能量包括用户和合约创建者消耗
              </p>
              <div class="text-xs text-gray-700 font-medium">
                交易总消耗 = 交易资源 + 手续费
              </div>
            </div>

            <!-- 交易资源详情 -->
            <div class="border-t pt-3">
              <div class="bg-white rounded p-3 space-y-2">
                <div class="flex justify-between items-center">
                  <div class="flex items-center">
                    <span class="text-gray-600 text-sm">交易资源</span>
                    <div class="relative ml-1 group">
                      <button class="text-blue-500 hover:text-blue-600">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <!-- 交易资源说明悬浮框 -->
                      <div class="absolute bottom-full left-0 mb-2 w-72 bg-gray-800 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div class="space-y-1">
                          <p>包括能量消耗和带宽消耗，其中，能量消耗根据合约创建者设置的比例分为用户消耗和合约创建者消耗</p>
                        </div>
                        <!-- 箭头 -->
                        <div class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  </div>
                  <span class="font-medium text-gray-900">{{ estimatedBandwidthFee }} 带宽</span>
                </div>
                
                <div class="pl-4 space-y-1 text-xs">
                  <div class="flex justify-between">
                    <span class="text-gray-600">用户</span>
                    <span class="text-gray-900">{{ estimatedBandwidthFee }} 带宽</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">合约创建者</span>
                    <span class="text-gray-900">{{ estimatedEnergyFee }} 能量</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 手续费 -->
            <div class="bg-white rounded p-3">
              <div class="flex justify-between items-center">
                <div class="flex items-center">
                  <span class="text-gray-600 text-sm">手续费</span>
                  <div class="relative ml-1 group">
                    <button class="text-blue-500 hover:text-blue-600">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <!-- 手续费说明悬浮框 -->
                    <div class="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <p>为交易所需的特定交易手续费，该部分由用户扣除，例如激活账户需要消耗 1 TRX</p>
                      <!-- 箭头 -->
                      <div class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
                <span class="font-medium text-gray-900">{{ estimatedServiceFee }} TRX</span>
              </div>
            </div>

            <!-- 其他交易信息 -->
            <div class="border-t pt-3 space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">交易类型:</span>
                <span class="text-gray-900">FreezeBalanceV2</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">预估获得资源:</span>
                <span class="text-gray-900">
                  {{ formatResource(estimatedResource) }} {{ transactionData.resourceType === 'ENERGY' ? '能量' : '带宽' }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">解锁期:</span>
                <span class="text-gray-900">{{ networkParams?.unlockPeriodText || '14天' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="p-6 border-t border-gray-200">
        <div class="flex space-x-4">
          <button
            @click="handleReject"
            :disabled="loading"
            class="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            拒绝
          </button>
          <button
            @click="handleConfirm"
            :disabled="loading"
            class="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center"
          >
            <span v-if="loading" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              签名中...
            </span>
            <span v-else>签名</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NetworkParameters } from '@/services/networkParametersService'
import { transactionFeeService, type TransactionFees } from '@/services/transactionFeeService'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

export interface TransactionData {
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  accountAddress: string
  poolId: string
  accountId?: string
}

interface Props {
  transactionData: TransactionData
  networkParams?: NetworkParameters
  estimatedResource: number
  accountName?: string
}

interface Emits {
  confirm: [data: TransactionData]
  reject: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const route = useRoute()

const loading = ref(false)
const showDetails = ref(false)
const transactionFees = ref<TransactionFees | null>(null)

// 获取网络ID
const networkId = computed(() => route.params.networkId as string)

// 计算属性
const networkName = computed(() => {
  return props.networkParams?.networkName || 'TRON 网络'
})

const estimatedBandwidthFee = computed(() => {
  return transactionFees.value?.bandwidthFee?.toString() || '254'
})

const estimatedEnergyFee = computed(() => {
  return transactionFees.value?.energyFee?.toString() || '0'  
})

const estimatedServiceFee = computed(() => {
  return transactionFees.value?.serviceFee?.toString() || '0'
})

// 获取交易费用
const fetchTransactionFees = async () => {
  if (!props.transactionData || !networkId.value) return
  
  try {
    console.log('[TransactionConfirmModal] 获取交易费用...')
    const fees = await transactionFeeService.calculateStakingFees({
      amount: props.transactionData.amount,
      resourceType: props.transactionData.resourceType,
      networkId: networkId.value,
      accountAddress: props.transactionData.accountAddress
    })
    
    transactionFees.value = fees
    console.log('[TransactionConfirmModal] 费用获取成功:', fees)
    
  } catch (error) {
    console.error('[TransactionConfirmModal] 费用获取失败:', error)
    // 使用默认值，不中断用户流程
  }
}

// 生命周期钩子
onMounted(() => {
  fetchTransactionFees()
})

// 方法
const truncateAddress = (address: string) => {
  if (!address) return ''
  if (address.length <= 20) return address
  return `${address.slice(0, 8)}...${address.slice(-8)}`
}

const formatResource = (amount: number) => {
  return Math.round(amount).toLocaleString()
}

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

const handleReject = () => {
  emit('reject')
}

const handleConfirm = async () => {
  loading.value = true
  try {
    emit('confirm', props.transactionData)
  } finally {
    loading.value = false
  }
}
</script>
