<!--
  代理接收方地址输入和验证组件
-->
<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">接收方地址</label>
    <div class="relative">
      <input
        :value="receiverAddress"
        @input="handleAddressInput"
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

    <!-- 地址验证状态 -->
    <div v-if="receiverAddress || isValidating" class="mt-3">
      <!-- 验证中状态 -->
      <div v-if="isValidating" class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-blue-700">正在验证地址格式...</p>
            <p class="text-xs text-gray-500 mt-1 truncate">
              {{ receiverAddress }}
            </p>
          </div>
        </div>
      </div>

      <!-- 验证成功状态 -->
      <div v-else-if="validation && validation.isValid" class="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-green-700">
              地址格式验证通过
              <span v-if="validation.confidence !== 'high'" class="text-xs text-orange-600 ml-1">
                ({{ validation.confidence === 'medium' ? '中等可信度' : '低可信度' }})
              </span>
            </p>
            <p class="text-xs text-gray-500 mt-1 truncate">
              {{ validation.normalizedAddress || receiverAddress }}
            </p>
            <!-- 显示警告信息 -->
            <div v-if="validation.errors.length > 0" class="mt-2 space-y-1">
              <p v-for="error in validation.errors" :key="error" class="text-xs text-orange-600">
                ⚠️ {{ error }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 验证失败状态 -->
      <div v-else-if="validation && !validation.isValid" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-red-700">地址格式验证失败</p>
            <p class="text-xs text-gray-500 mt-1 truncate">
              {{ receiverAddress }}
            </p>
            <!-- 显示错误信息 -->
            <div v-if="validation.errors.length > 0" class="mt-2 space-y-1">
              <p v-for="error in validation.errors" :key="error" class="text-xs text-red-600">
                ❌ {{ error }}
              </p>
            </div>
            <p class="text-xs text-blue-600 mt-2">
              💡 TRON地址应以T开头，包含34个字符
            </p>
          </div>
        </div>
      </div>

      <!-- 未验证状态（有输入但还未验证） -->
      <div v-else-if="receiverAddress && !validation" class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-700">等待地址验证</p>
            <p class="text-xs text-gray-500 mt-1 truncate">
              {{ receiverAddress }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TronAddressValidationResult } from '@/utils/tronAddressValidator'

interface Props {
  receiverAddress: string
  validation: TronAddressValidationResult | null
  isValidating: boolean
}

interface Emits {
  'update:receiverAddress': [value: string]
  'validate': [address: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleAddressInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:receiverAddress', target.value)
  
  // 如果有输入且值不为空，触发验证
  if (target.value && target.value.trim()) {
    emit('validate', target.value.trim())
  }
}
</script>
