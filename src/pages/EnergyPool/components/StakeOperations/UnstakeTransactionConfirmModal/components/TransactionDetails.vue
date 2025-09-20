<!--
  交易详情组件
-->
<template>
  <div class="space-y-6">
    <!-- 网络和账户信息 -->
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm text-blue-600 font-medium">{{ accountName || '测试账户' }}</div>
        <div class="text-xs text-gray-500 mt-1">{{ networkName }}</div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NetworkParameters } from '@/services/networkParametersService'
import type { UnstakeTransactionData } from '../types'

interface Props {
  transactionData: UnstakeTransactionData
  networkParams?: NetworkParameters
  accountName?: string
  networkName: string
  truncateAddress: (address: string) => string
}

defineProps<Props>()
</script>
