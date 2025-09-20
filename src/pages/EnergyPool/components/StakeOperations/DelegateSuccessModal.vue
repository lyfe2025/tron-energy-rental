<!--
  代理资源成功弹窗
  显示代理操作成功信息，提供查看交易链接
-->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
      <!-- 关闭按钮 -->
      <div class="flex justify-end p-4">
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 内容 -->
      <div class="px-8 pb-8 text-center">
        <!-- 成功图标 -->
        <div class="flex justify-center mb-6">
          <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <!-- 标题 -->
        <h3 class="text-xl font-semibold text-gray-900 mb-4">代理资源成功</h3>

        <!-- 详细信息 -->
        <div class="text-gray-600 text-sm mb-6">
          为 <span class="font-mono text-gray-900">{{ formatAddress(transactionData?.receiverAddress || '') }}</span> 
          代理 {{ formatAmount(transactionData?.amount || '0') }} {{ resourceTypeName }}
        </div>

        <!-- 查看交易链接 -->
        <div class="mb-6">
          <button
            v-if="txid"
            @click="viewTransaction"
            class="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center justify-center mx-auto"
          >
            查看交易
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="px-6 pb-6">
        <button
          @click="$emit('close')"
          class="w-full px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-medium transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DelegateTransactionData } from './DelegateTransactionConfirmModal/index.vue'

interface Props {
  transactionData: DelegateTransactionData
  txid?: string
  explorerUrl?: string
}

interface Emits {
  close: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()


// 计算属性
const resourceTypeName = computed(() => {
  return props.transactionData?.resourceType === 'ENERGY' ? '能量' : '带宽'
})

// 方法
const formatAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 8)}...${address.slice(-8)}`
}

const formatAmount = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return Math.round(num).toLocaleString()
}

const viewTransaction = () => {
  if (props.txid && props.explorerUrl) {
    const url = `${props.explorerUrl}/#/transaction/${props.txid}`
    window.open(url, '_blank')
  } else if (props.txid) {
    const url = `https://tronscan.org/#/transaction/${props.txid}`
    window.open(url, '_blank')
  }
}
</script>
