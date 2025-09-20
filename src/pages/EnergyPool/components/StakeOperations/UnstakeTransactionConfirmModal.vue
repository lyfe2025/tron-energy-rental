<!--
  TRON解锁交易确认弹窗
  仿照官方TRONLink钱包的解锁交易确认界面
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
          <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <!-- 交易详情 -->
        <div class="text-center space-y-2">
          <div class="text-xl font-semibold text-gray-900">解锁 TRX</div>
          <div class="text-2xl font-bold text-red-600">解锁 {{ transactionData.amount }} TRX</div>
        </div>

        <!-- 详细信息 -->
        <div class="space-y-4">
          <!-- 释放资源 -->
          <div class="flex items-center justify-between py-2">
            <span class="text-gray-600 text-sm">释放资源</span>
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

          <!-- 释放投票权 -->
          <div class="flex items-center justify-between py-2">
            <span class="text-gray-600 text-sm">释放投票权</span>
            <span class="font-medium text-gray-900">{{ transactionData.amount }} 票</span>
          </div>

          <!-- 解锁说明 -->
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div class="flex items-start space-x-2">
              <svg class="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div class="text-sm">
                <div class="font-medium text-orange-900 mb-1">解锁说明</div>
                <div class="text-orange-700 space-y-1">
                  <p>• 解锁后需要等待 <span class="font-semibold">{{ networkParams?.unlockPeriodText || '14天' }}</span> 才能提取TRX</p>
                  <p>• 解锁期间将无法获得 {{ transactionData.resourceType === 'ENERGY' ? '能量' : '带宽' }} 资源收益</p>
                  <p>• 解锁操作不可逆转</p>
                </div>
              </div>
            </div>
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
                      <div class="font-medium">资源 = 带宽扣除</div>
                      <div class="space-y-1">
                        <p><strong>带宽扣除：</strong>解锁交易只消耗带宽，若账户带宽不足，则需要 TRX 支付</p>
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

        <!-- TRON费用数据获取状态 -->
        <div v-if="feesError" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <svg class="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span class="text-sm text-yellow-800">{{ feesError }}</span>
            </div>
            <button 
              @click="fetchTransactionFees"
              class="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded"
            >
              重试
            </button>
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
                交易总消耗为该笔交易消耗的所有资源（主要是带宽）和手续费
              </p>
              <div class="text-xs text-gray-700 font-medium">
                交易总消耗 = 交易资源 + 手续费
              </div>
              <div class="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                数据来源：TRON官方API实时获取，确保费用预估的准确性
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
                          <p>解锁交易主要消耗带宽资源，不涉及智能合约调用</p>
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
                      <p>解锁交易一般不需要额外的TRX手续费，仅消耗带宽资源</p>
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
                <span class="text-gray-900">UnfreezeBalanceV2</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">释放资源量:</span>
                <span class="text-gray-900">
                  {{ formatResource(estimatedResource) }} {{ transactionData.resourceType === 'ENERGY' ? '能量' : '带宽' }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">解锁期:</span>
                <span class="text-gray-900">{{ networkParams?.unlockPeriodText || '14天' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">资金可提取时间:</span>
                <span class="text-red-600 font-medium">{{ networkParams?.unlockPeriodText || '14天' }} 后</span>
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
            取消
          </button>
          <button
            @click="handleConfirm"
            :disabled="loading"
            class="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center"
          >
            <span v-if="loading" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              解锁中...
            </span>
            <span v-else>解锁并提取</span>
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

export interface UnstakeTransactionData {
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  accountAddress: string
  poolId: string
  accountId?: string
}

interface Props {
  transactionData: UnstakeTransactionData
  networkParams?: NetworkParameters
  estimatedResource: number
  accountName?: string
}

interface Emits {
  confirm: [data: UnstakeTransactionData]
  reject: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const route = useRoute()

const loading = ref(false)
const showDetails = ref(false)
const transactionFees = ref<TransactionFees | null>(null)
const feesLoading = ref(false)
const feesError = ref<string | null>(null)

// 获取网络ID
const networkId = computed(() => route.params.networkId as string)

// 计算属性
const networkName = computed(() => {
  return props.networkParams?.networkName || 'TRON 网络'
})

const estimatedBandwidthFee = computed(() => {
  if (feesLoading.value) {
    return '获取中...'
  }
  if (feesError.value) {
    return '获取失败'
  }
  if (transactionFees.value === null) {
    return '未知'
  }
  return transactionFees.value.bandwidthFee?.toString() || '0'
})

const estimatedServiceFee = computed(() => {
  if (feesLoading.value) {
    return '获取中...'
  }
  if (feesError.value) {
    return '获取失败'
  }
  if (transactionFees.value === null) {
    return '未知'
  }
  return transactionFees.value.serviceFee?.toString() || '0'
})

// 获取交易费用 - 从TRON官方API
const fetchTransactionFees = async () => {
  if (!props.transactionData || !networkId.value) return
  
  feesLoading.value = true
  feesError.value = null
  
  try {
    console.log('[UnstakeTransactionConfirmModal] 获取TRON官方解锁交易费用...')
    const fees = await transactionFeeService.calculateUnstakingFees({
      amount: props.transactionData.amount,
      resourceType: props.transactionData.resourceType,
      networkId: networkId.value,
      accountAddress: props.transactionData.accountAddress
    })
    
    transactionFees.value = fees
    console.log('[UnstakeTransactionConfirmModal] TRON官方解锁费用获取成功:', fees)
    
  } catch (error) {
    console.error('[UnstakeTransactionConfirmModal] TRON官方解锁费用获取失败:', error)
    feesError.value = 'TRON网络数据获取失败'
    // 不设置默认值，保持真实性
  } finally {
    feesLoading.value = false
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
  
  // 🔍 详细调试信息
  console.log('🔍 [UnstakeTransactionConfirmModal] 用户点击解锁并提取按钮');
  console.log('🔍 [UnstakeTransactionConfirmModal] props.transactionData:', JSON.stringify(props.transactionData, null, 2));
  console.log('🔍 [UnstakeTransactionConfirmModal] 解锁交易数据详情:', {
    amount: props.transactionData?.amount,
    amountType: typeof props.transactionData?.amount,
    resourceType: props.transactionData?.resourceType,
    accountAddress: props.transactionData?.accountAddress,
    accountAddressLength: props.transactionData?.accountAddress?.length,
    poolId: props.transactionData?.poolId,
    accountId: props.transactionData?.accountId,
    完整数据: props.transactionData
  });
  
  // 验证关键数据
  if (!props.transactionData?.accountAddress) {
    console.error('🔍 [UnstakeTransactionConfirmModal] ❌ accountAddress 缺失！');
  } else if (!props.transactionData.accountAddress.startsWith('T') || props.transactionData.accountAddress.length !== 34) {
    console.error('🔍 [UnstakeTransactionConfirmModal] ❌ 无效的TRON地址格式:', props.transactionData.accountAddress);
  } else {
    console.log('🔍 [UnstakeTransactionConfirmModal] ✅ TRON地址格式正确');
  }
  
  if (!props.transactionData?.amount || props.transactionData.amount <= 0) {
    console.error('🔍 [UnstakeTransactionConfirmModal] ❌ 解锁金额无效:', props.transactionData?.amount);
  } else {
    console.log('🔍 [UnstakeTransactionConfirmModal] ✅ 解锁金额有效:', props.transactionData.amount, 'TRX');
    console.log('🔍 [UnstakeTransactionConfirmModal] 🔢 转换为SUN:', props.transactionData.amount * 1000000);
  }
  
  try {
    console.log('🔍 [UnstakeTransactionConfirmModal] 即将发送confirm事件...');
    emit('confirm', props.transactionData)
  } finally {
    loading.value = false
  }
}
</script>
