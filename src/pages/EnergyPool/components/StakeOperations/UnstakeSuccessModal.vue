<!--
  TRX解质押成功提示弹窗
  仿照质押成功弹窗的样式和功能
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
        <h3 class="text-xl font-semibold text-gray-900 mb-6">TRX 解锁成功</h3>

        <!-- 解锁资源信息 -->
        <div class="mb-4">
          <p class="text-gray-700 text-base">
            解锁 <span class="font-semibold">{{ formatNumber(data.amount) }}</span> TRX，
            失去 <span class="font-semibold">{{ formatNumber(lostResource) }}</span> {{ resourceTypeName }}
            和 <span class="font-semibold">{{ formatNumber(data.amount) }}</span> 投票权
          </p>
        </div>

        <!-- 提取时间信息 -->
        <div class="mb-8">
          <p class="text-xs text-gray-500">
            * 本次解锁的 TRX 请在 {{ withdrawTime }} 后提取
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

        <!-- 关闭按钮 -->
        <div>
          <button
            @click="handleClose"
            class="w-full py-4 px-6 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-medium text-center transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface UnstakeSuccessData {
  amount: number // 解质押的TRX数量
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lostResource: number // 失去的资源量
  unfreezeTime?: string // 解质押时间（ISO字符串）
  unlockPeriodText?: string // 网络解锁期文本（如"14天"）
  transactionHash?: string // 交易哈希
}

interface Props {
  data: UnstakeSuccessData
}

interface Emits {
  close: []
  viewTransaction: [hash: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const lostResource = computed(() => {
  return props.data.lostResource || 0
})

const resourceTypeName = computed(() => {
  return props.data.resourceType === 'ENERGY' ? '能量' : '带宽'
})

const withdrawTime = computed(() => {
  try {
    // 优先使用解质押时间，如果没有则使用当前时间
    const unfreezeTimeStr = props.data.unfreezeTime || new Date().toISOString()
    const unfreezeTime = new Date(unfreezeTimeStr)
    
    if (isNaN(unfreezeTime.getTime())) {
      throw new Error('无效的解质押时间格式')
    }
    
    // 解析解锁期文本，提取天数（如"14天" -> 14）
    let unlockDays = 14 // 默认14天
    if (props.data.unlockPeriodText) {
      const match = props.data.unlockPeriodText.match(/(\d+)天/)
      if (match) {
        unlockDays = parseInt(match[1], 10)
      }
    }
    
    // 计算提取时间：解质押时间 + 解锁期
    const withdrawTime = new Date(unfreezeTime.getTime() + unlockDays * 24 * 60 * 60 * 1000)
    
    return withdrawTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-')
  } catch (error) {
    console.warn('[UnstakeSuccessModal] 时间计算失败:', error)
    return '2025-09-21 15:36:15'
  }
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
    console.warn('[UnstakeSuccessModal] 交易哈希不可用')
  }
}
</script>
