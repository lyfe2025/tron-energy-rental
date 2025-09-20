<!--
  交易费用组件
-->
<template>
  <div class="space-y-4">
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
    <div v-if="feeState.error" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <svg class="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="text-sm text-yellow-800">{{ feeState.error }}</span>
        </div>
        <button 
          @click="$emit('retryFees')"
          class="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded"
        >
          重试
        </button>
      </div>
    </div>

    <!-- 查看交易总消耗 -->
    <button 
      @click="$emit('toggleDetails')"
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
</template>

<script setup lang="ts">
import type { NetworkParameters } from '@/services/networkParametersService'
import type { TransactionFeeState, UnstakeTransactionData } from '../types'

interface Props {
  transactionData: UnstakeTransactionData
  networkParams?: NetworkParameters
  estimatedResource: number
  estimatedBandwidthFee: string
  estimatedServiceFee: string
  feeState: TransactionFeeState
  showDetails: boolean
  formatResource: (amount: number) => string
}

interface Emits {
  retryFees: []
  toggleDetails: []
}

defineProps<Props>()
defineEmits<Emits>()
</script>
