<!--
  交易结果信息弹窗 - 显示交易费用详细分解
  仿照TRON官方的交易总消耗信息展示
-->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <!-- 头部 -->
      <div class="px-6 py-4 text-center">
        <h3 class="text-lg font-semibold text-gray-900">交易总消耗</h3>
      </div>

      <!-- 内容 -->
      <div class="px-6 pb-4">
        <!-- 说明文字 -->
        <div class="text-sm text-gray-600 mb-4 leading-relaxed">
          <p class="mb-3">
            交易总消耗为该笔交易消耗的所有资源（能量和带宽）和手续费，其中能量包括用户和合约创建者消耗
          </p>
          <div class="font-medium text-gray-900 mb-4">
            交易总消耗 = 交易资源 + 手续费
          </div>
        </div>

        <!-- 交易资源部分 -->
        <div class="mb-4">
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <span class="text-gray-700 text-sm font-medium">交易资源</span>
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
            
            <!-- 详细分解 -->
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">用户</span>
                <span class="text-gray-900">{{ estimatedBandwidthFee }} 带宽</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">合约创建者</span>
                <span class="text-gray-900">{{ estimatedEnergyFee }} 能量</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 手续费部分 -->
        <div class="mb-6">
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <span class="text-gray-700 text-sm font-medium">手续费</span>
                <div class="relative ml-1 group">
                  <button class="text-blue-500 hover:text-blue-600">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <!-- 手续费说明悬浮框 -->
                  <div class="absolute bottom-full left-0 mb-2 w-60 bg-gray-800 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <p>TRON网络交易手续费，质押操作通常为0 TRX</p>
                    <!-- 箭头 -->
                    <div class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </div>
              <span class="font-medium text-gray-900">{{ estimatedServiceFee }} TRX</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="p-6 border-t border-gray-200">
        <button
          @click="handleConfirm"
          class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          我知道了
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { transactionFeeService, type TransactionFees } from '@/services/transactionFeeService'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

interface Props {
  estimatedResource: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
}

interface Emits {
  confirm: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const route = useRoute()

const transactionFees = ref<TransactionFees | null>(null)

// 获取网络ID
const networkId = computed(() => route.params.networkId as string)

// 计算属性  
const estimatedBandwidthFee = computed(() => {
  return transactionFees.value?.bandwidthFee?.toString() || '254'
})

const estimatedEnergyFee = computed(() => {
  return transactionFees.value?.energyFee?.toString() || '0'
})

const estimatedServiceFee = computed(() => {
  return transactionFees.value?.serviceFee?.toString() || '0'
})

// 获取交易费用 (使用默认参数，因为这是结果展示)
const fetchTransactionFees = async () => {
  try {
    console.log('[TransactionResultModal] 获取交易费用...')
    const fees = await transactionFeeService.calculateStakingFees({
      amount: 100, // 默认值，用于估算
      resourceType: props.resourceType,
      networkId: networkId.value,
      accountAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // 默认地址
    })
    
    transactionFees.value = fees
    console.log('[TransactionResultModal] 费用获取成功:', fees)
    
  } catch (error) {
    console.error('[TransactionResultModal] 费用获取失败:', error)
  }
}

// 生命周期钩子
onMounted(() => {
  fetchTransactionFees()
})

const handleConfirm = () => {
  emit('confirm')
}
</script>
