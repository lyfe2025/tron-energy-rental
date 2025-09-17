<!--
  解质押TRX模态框组件
  优化版本：结构清晰，不会超出页面
-->
<template>
  <div :class="modalClasses.overlay">
    <div :class="[modalClasses.container, modalClasses.containerSize.medium]">
      <!-- 头部 -->
      <div :class="modalClasses.header">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">解质押TRX</h3>
            <p class="text-sm text-blue-600 mt-1" v-if="state.networkParams">
              {{ state.networkParams.networkName }} · 解锁期: {{ state.networkParams.unlockPeriodText }}
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
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 解质押说明 -->
          <div class="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <svg class="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.662-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-medium text-orange-900 mb-1">解质押说明</h4>
                <p class="text-xs text-orange-700">解质押后需要等待{{ state.networkParams?.unlockPeriodText || '14天' }}才能提取TRX。解质押期间无法获得资源收益。</p>
              </div>
            </div>
          </div>

          <!-- 资源类型选择 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">解质押资源类型</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="form.resourceType = 'ENERGY'"
                :class="[
                  'p-4 border rounded-lg text-center transition-all duration-200',
                  form.resourceType === 'ENERGY'
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-md'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                ]"
              >
                <div class="flex items-center justify-center mb-2">
                  <svg class="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div class="font-medium mb-1">解质押能量</div>
                <div class="text-xs text-gray-500">释放智能合约资源</div>
              </button>
              <button
                type="button"
                @click="form.resourceType = 'BANDWIDTH'"
                :class="[
                  'p-4 border rounded-lg text-center transition-all duration-200',
                  form.resourceType === 'BANDWIDTH'
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-md'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                ]"
              >
                <div class="flex items-center justify-center mb-2">
                  <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div class="font-medium mb-1">解质押带宽</div>
                <div class="text-xs text-gray-500">释放转账资源</div>
              </button>
            </div>
          </div>

          <!-- 解质押金额 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">解质押数量</label>
            <div class="relative">
              <input
                v-model="form.amount"
                type="text"
                pattern="[0-9]*\.?[0-9]*"
                required
                class="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                placeholder="请输入解质押数量"
                @input="(event) => validateNumberInput(event, (value) => form.amount = value)"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-4">
                <span class="text-gray-500 font-medium">TRX</span>
              </div>
            </div>
            <div class="flex items-center justify-between mt-2">
              <p class="text-xs text-gray-500">
                可解质押: 100 TRX
              </p>
              <div class="text-xs">
                <button 
                  type="button" 
                  @click="form.amount = '100'" 
                  class="text-red-600 hover:text-red-700 underline"
                >
                  全部解质押
                </button>
              </div>
            </div>
          </div>

          <!-- 账户信息 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">解质押账户</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ accountAddress || '选择的账户地址' }}
                  </p>
                  <p class="text-xs text-gray-500">从该账户解质押资源</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 解质押预览 -->
          <div v-if="form.amount && parseFloat(form.amount) > 0" class="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
            <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <svg class="w-4 h-4 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              解质押操作预览
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">解质押数量:</span>
                <span class="font-semibold text-lg text-red-700">
                  {{ parseFloat(form.amount).toLocaleString() }} TRX
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">释放{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
                <span class="font-medium text-orange-700">
                  {{ formatResource(calculateEstimatedResource(form.amount, form.resourceType), form.resourceType) }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">资金可提取时间:</span>
                <span class="font-medium text-red-700">
                  {{ state.networkParams?.unlockPeriodText || '14天' }} 后
                </span>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-orange-200">
              <p class="text-xs text-gray-600 leading-relaxed">
                <span class="text-red-600">重要提醒:</span> 解质押操作不可逆转，解质押期间将无法获得{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}资源收益。
              </p>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="state.error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ state.error }}</p>
          </div>
        </form>
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
            :disabled="state.loading || !isFormValid || !state.networkParams"
            :class="buttonClasses.danger"
            class="flex-1"
          >
            <span v-if="state.loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
            <span v-else>确认解质押</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNumberInput } from '@/composables/useNumberInput'
import { ref } from 'vue'
import type { UnstakeFormData, UnstakeOperationProps } from './shared/types'
import { buttonClasses, modalClasses, useStakeModal } from './shared/useStakeModal'

interface Emits {
  close: []
  success: []
}

const props = defineProps<UnstakeOperationProps>()
const emit = defineEmits<Emits>()

const {
  state,
  isFormValid,
  formatResource,
  calculateEstimatedResource
} = useStakeModal(props)

// 数字输入验证
const { validateNumberInput } = useNumberInput()

// 表单数据
const form = ref<UnstakeFormData>({
  resourceType: 'ENERGY',
  amount: ''
})

// 处理表单提交
const handleSubmit = async () => {
  if (!isFormValid.value || !state.value.networkParams) return

  try {
    // TODO: 实现解质押逻辑
    state.value.loading = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    emit('success')
    alert(`解质押成功！解质押金额: ${parseFloat(form.value.amount).toLocaleString()} TRX`)
  } catch (err: any) {
    state.value.error = err.message || '解质押失败，请重试'
  } finally {
    state.value.loading = false
  }
}
</script>
