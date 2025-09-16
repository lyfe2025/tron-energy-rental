<!--
  提取资金模态框组件
  优化版本：结构清晰，不会超出页面
-->
<template>
  <div :class="modalClasses.overlay">
    <div :class="[modalClasses.container, modalClasses.containerSize.medium]">
      <!-- 头部 -->
      <div :class="modalClasses.header">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">提取资金</h3>
            <p class="text-sm text-blue-600 mt-1" v-if="state.networkParams">
              {{ state.networkParams.networkName }} · 提取已解质押的TRX
            </p>
          </div>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 内容 -->
      <div :class="modalClasses.content">
        <div class="space-y-6">
          <!-- 提取说明 -->
          <div class="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <svg class="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-medium text-green-900 mb-1">资金提取说明</h4>
                <p class="text-xs text-green-700">只能提取已完成解质押等待期的TRX。提取后资金将直接转入您的账户余额。</p>
              </div>
            </div>
          </div>

          <!-- 可提取资金概览 -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              可提取资金
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- 可立即提取 -->
              <div class="bg-white rounded-lg p-4 border border-green-200">
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600 mb-1">1,250.00</div>
                  <div class="text-sm text-gray-600">TRX</div>
                  <div class="text-xs text-green-600 mt-1">可立即提取</div>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-200">
                  <div class="text-xs text-gray-500 space-y-1">
                    <div class="flex justify-between">
                      <span>能量解质押:</span>
                      <span>800.00 TRX</span>
                    </div>
                    <div class="flex justify-between">
                      <span>带宽解质押:</span>
                      <span>450.00 TRX</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 等待中的资金 -->
              <div class="bg-white rounded-lg p-4 border border-orange-200">
                <div class="text-center">
                  <div class="text-2xl font-bold text-orange-600 mb-1">500.00</div>
                  <div class="text-sm text-gray-600">TRX</div>
                  <div class="text-xs text-orange-600 mt-1">等待解锁中</div>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-200">
                  <div class="text-xs text-gray-500 space-y-1">
                    <div class="flex justify-between">
                      <span>预计可提取:</span>
                      <span>2天后</span>
                    </div>
                    <div class="flex justify-between">
                      <span>解锁进度:</span>
                      <span>85%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 提取记录 -->
          <div>
            <h4 class="text-sm font-medium text-gray-900 mb-3">最近提取记录</h4>
            <div class="bg-white border border-gray-200 rounded-lg">
              <div class="divide-y divide-gray-200">
                <div class="p-4 flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">提取成功</p>
                      <p class="text-xs text-gray-500">2024-09-15 14:30</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-green-600">+300.00 TRX</p>
                    <p class="text-xs text-gray-500">已到账</p>
                  </div>
                </div>
                
                <div class="p-4 flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">提取处理中</p>
                      <p class="text-xs text-gray-500">2024-09-16 10:20</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-orange-600">+150.00 TRX</p>
                    <p class="text-xs text-gray-500">处理中</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 账户信息 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">提取到账户</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ accountAddress || '选择的账户地址' }}
                  </p>
                  <p class="text-xs text-gray-500">当前余额: 1,850.50 TRX</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="state.error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ state.error }}</p>
          </div>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div :class="modalClasses.footer">
        <div class="flex space-x-3">
          <button
            type="button"
            @click="$emit('close')"
            :class="buttonClasses.secondary"
            class="flex-1"
          >
            取消
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="state.loading || !state.networkParams || !hasWithdrawableAmount"
            :class="buttonClasses.primary"
            class="flex-1"
          >
            <span v-if="state.loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
            <span v-else-if="hasWithdrawableAmount">提取全部 (1,250.00 TRX)</span>
            <span v-else>暂无可提取资金</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WithdrawOperationProps } from './shared/types'
import { buttonClasses, modalClasses, useStakeModal } from './shared/useStakeModal'

interface Emits {
  close: []
  success: []
}

const props = defineProps<WithdrawOperationProps>()
const emit = defineEmits<Emits>()

const {
  state
} = useStakeModal(props)

// 计算是否有可提取金额
const hasWithdrawableAmount = computed(() => {
  // TODO: 从API获取实际的可提取金额
  return true // 模拟有可提取金额
})

// 处理表单提交
const handleSubmit = async () => {
  if (!state.value.networkParams || !hasWithdrawableAmount.value) return

  try {
    // TODO: 实现提取逻辑
    state.value.loading = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    emit('success')
    alert('提取成功！资金已转入您的账户')
  } catch (err: any) {
    state.value.error = err.message || '提取失败，请重试'
  } finally {
    state.value.loading = false
  }
}
</script>
