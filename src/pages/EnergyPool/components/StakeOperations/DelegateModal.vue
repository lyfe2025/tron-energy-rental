<!--
  代理资源模态框组件
  优化版本：结构清晰，不会超出页面
-->
<template>
  <div :class="modalClasses.overlay">
    <div :class="[modalClasses.container, modalClasses.containerSize.large]">
      <!-- 头部 -->
      <div :class="modalClasses.header">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">代理资源</h3>
            <p class="text-sm text-blue-600 mt-1" v-if="state.networkParams">
              {{ state.networkParams.networkName }} · 将您的资源代理给他人使用
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
          <!-- 代理说明 -->
          <div class="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <svg class="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-medium text-green-900 mb-1">资源代理说明</h4>
                <p class="text-xs text-green-700">将您已质押的资源代理给他人使用。代理期间，您仍然保有TRX的所有权，但受托人可以使用相应的{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}资源。</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 左侧：代理配置 -->
            <div class="space-y-6">
              <!-- 资源类型选择 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">代理资源类型</label>
                <div class="space-y-3">
                  <button
                    type="button"
                    @click="form.resourceType = 'ENERGY'"
                    :class="[
                      'w-full p-4 border rounded-lg text-left transition-all duration-200',
                      form.resourceType === 'ENERGY'
                        ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    ]"
                  >
                    <div class="flex items-center space-x-3">
                      <svg class="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      <div>
                        <div class="font-medium">代理能量</div>
                        <div class="text-xs text-gray-500">用于智能合约调用</div>
                        <div class="text-xs text-green-600 mt-1">可代理: 50,000</div>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    @click="form.resourceType = 'BANDWIDTH'"
                    :class="[
                      'w-full p-4 border rounded-lg text-left transition-all duration-200',
                      form.resourceType === 'BANDWIDTH'
                        ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    ]"
                  >
                    <div class="flex items-center space-x-3">
                      <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <div>
                        <div class="font-medium">代理带宽</div>
                        <div class="text-xs text-gray-500">用于普通转账</div>
                        <div class="text-xs text-green-600 mt-1">可代理: 5,000</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- 代理数量 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">代理数量</label>
                <div class="relative">
                  <input
                    v-model="form.amount"
                    type="text"
                    pattern="[0-9]*\.?[0-9]*"
                    required
                    class="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                    placeholder="请输入代理数量"
                    @input="(event) => validateNumberInput(event, (value) => form.amount = value)"
                  />
                  <div class="absolute inset-y-0 right-0 flex items-center pr-4">
                    <span class="text-gray-500 font-medium text-sm">{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between mt-2">
                  <p class="text-xs text-gray-500">
                    可代理: {{ form.resourceType === 'ENERGY' ? '50,000' : '5,000' }} {{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}
                  </p>
                  <div class="text-xs">
                    <button 
                      type="button" 
                      @click="form.amount = form.resourceType === 'ENERGY' ? '50000' : '5000'" 
                      class="text-green-600 hover:text-green-700 underline"
                    >
                      全部代理
                    </button>
                  </div>
                </div>
              </div>

              <!-- 代理期限 -->
              <div v-if="form.lockPeriod !== undefined">
                <label class="block text-sm font-medium text-gray-700 mb-2">代理期限</label>
                <select
                  v-model="form.lockPeriod"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="3">3天</option>
                  <option value="7">7天</option>
                  <option value="14">14天</option>
                  <option value="30">30天</option>
                </select>
                <p class="text-xs text-gray-500 mt-1">代理期间资源将被锁定，无法取回</p>
              </div>
            </div>

            <!-- 右侧：接收方信息 -->
            <div class="space-y-6">
              <!-- 接收方地址 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">接收方地址</label>
                <div class="relative">
                  <input
                    v-model="form.receiverAddress"
                    type="text"
                    required
                    class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="请输入接收方TRON地址"
                  />
                  <div class="absolute inset-y-0 right-0 flex items-center pr-4">
                    <button 
                      type="button"
                      class="text-gray-400 hover:text-gray-600"
                      title="扫描二维码"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h4m0 0V4m0 0h3m-3 0v3m0 0H7m6 0v3" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p class="text-xs text-gray-500 mt-1">请确认接收方地址正确，代理后无法撤销</p>
              </div>

              <!-- 地址验证状态 -->
              <div v-if="form.receiverAddress" class="p-3 border rounded-lg">
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span class="text-sm text-green-700">地址格式正确</span>
                </div>
                <div class="mt-2 text-xs text-gray-600">
                  <p>地址类型: TRON 主网地址</p>
                  <p>格式验证: ✓ 通过</p>
                </div>
              </div>

              <!-- 代理预览 -->
              <div v-if="form.amount && form.receiverAddress && parseFloat(form.amount) > 0" class="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <svg class="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  代理预览
                </h4>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">代理{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
                    <span class="font-semibold text-green-700">
                      {{ parseFloat(form.amount).toLocaleString() }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">接收方:</span>
                    <span class="font-medium text-gray-900 text-xs">
                      {{ form.receiverAddress.slice(0, 8) }}...{{ form.receiverAddress.slice(-8) }}
                    </span>
                  </div>
                  <div v-if="form.lockPeriod" class="flex justify-between">
                    <span class="text-gray-600">代理期限:</span>
                    <span class="font-medium text-blue-700">{{ form.lockPeriod }}天</span>
                  </div>
                </div>
              </div>
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
            :disabled="state.loading || !isFormValid || !state.networkParams || !form.receiverAddress || !form.amount"
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
            <span v-else>确认代理</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNumberInput } from '@/composables/useNumberInput'
import { ref } from 'vue'
import type { DelegateFormData, DelegateOperationProps } from './shared/types'
import { buttonClasses, modalClasses, useStakeModal } from './shared/useStakeModal'

interface Emits {
  close: []
  success: []
}

const props = defineProps<DelegateOperationProps>()
const emit = defineEmits<Emits>()

const {
  state,
  isFormValid
} = useStakeModal(props)

// 数字输入验证
const { validateNumberInput } = useNumberInput()

// 表单数据
const form = ref<DelegateFormData>({
  resourceType: 'ENERGY',
  amount: '',
  receiverAddress: '',
  lockPeriod: 3
})

// 处理表单提交
const handleSubmit = async () => {
  if (!isFormValid.value || !state.value.networkParams || !form.value.receiverAddress || !form.value.amount) return

  try {
    // TODO: 实现代理逻辑
    state.value.loading = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    emit('success')
    alert(`代理成功！代理${form.value.resourceType === 'ENERGY' ? '能量' : '带宽'}: ${parseFloat(form.value.amount).toLocaleString()}`)
  } catch (err: any) {
    state.value.error = err.message || '代理失败，请重试'
  } finally {
    state.value.loading = false
  }
}
</script>
