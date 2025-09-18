<!--
  TRX质押成功提示弹窗
  仿照官方TRON钱包的成功提示界面
-->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <!-- 关闭按钮 -->
      <div class="flex justify-end p-4">
        <button 
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 内容 -->
      <div class="px-6 pb-6 text-center">
        <!-- 成功图标 -->
        <div class="flex justify-center mb-6">
          <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <!-- 成功标题 -->
        <h3 class="text-xl font-semibold text-gray-900 mb-6">TRX 质押成功</h3>

        <!-- 获得资源信息 -->
        <div class="mb-8">
          <p class="text-gray-700 text-base">
            获得 <span class="font-semibold">{{ formatNumber(estimatedResource) }}</span> {{ resourceTypeName }}，
            同时获得 <span class="font-semibold">{{ formatNumber(votingPower) }}</span> 投票权
          </p>
        </div>

        <!-- 查看交易链接 -->
        <div class="mb-6">
          <button 
            @click="handleViewTransaction"
            :disabled="!data.transactionHash"
            :class="[
              'text-sm font-medium transition-colors',
              data.transactionHash 
                ? 'text-blue-600 hover:text-blue-700 cursor-pointer' 
                : 'text-gray-400 cursor-not-allowed'
            ]"
          >
            查看交易 >
          </button>
        </div>

        <!-- 操作按钮 -->
        <div class="space-y-3">
          <!-- 投票获取奖励按钮 -->
          <button
            @click="handleVoteReward"
            class="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-center transition-colors"
          >
            投票获取奖励（最高APY 2.04%）
          </button>

          <!-- 为他人代理资源按钮 -->
          <button
            @click="handleDelegateResource"
            class="w-full py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-center transition-colors border border-gray-200"
          >
            为他人代理资源
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface StakeSuccessData {
  amount: number // 质押的TRX数量
  resourceType: 'ENERGY' | 'BANDWIDTH'
  estimatedResource: number // 预估获得的资源
  transactionHash?: string // 交易哈希
}

interface Props {
  data: StakeSuccessData
}

interface Emits {
  close: []
  viewTransaction: [hash: string]
  voteReward: []
  delegateResource: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const estimatedResource = computed(() => {
  return props.data.estimatedResource
})

const votingPower = computed(() => {
  // 投票权等于质押的TRX数量
  return props.data.amount
})

const resourceTypeName = computed(() => {
  return props.data.resourceType === 'ENERGY' ? '能量' : '带宽'
})

// 方法
const formatNumber = (num: number) => {
  return Math.round(num).toLocaleString()
}

const handleClose = () => {
  emit('close')
}

const handleViewTransaction = () => {
  if (props.data.transactionHash) {
    emit('viewTransaction', props.data.transactionHash)
  } else {
    console.warn('[StakeSuccessModal] 交易哈希不可用')
  }
}

const handleVoteReward = () => {
  emit('voteReward')
  // 可以跳转到投票页面或打开投票模态框
}

const handleDelegateResource = () => {
  emit('delegateResource')
  // 可以打开代理资源模态框
}
</script>
