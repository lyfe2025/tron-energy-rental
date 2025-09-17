<!--
  代理数量输入组件
-->
<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">代理数量</label>
    <div class="relative">
      <input
        :value="amount"
        @input="handleAmountInput"
        type="text"
        pattern="[0-9]*\.?[0-9]*"
        required
        class="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
        placeholder="请输入代理数量"
      />
      <div class="absolute inset-y-0 right-0 flex items-center pr-4">
        <span class="text-gray-500 font-medium text-sm">{{ resourceType === 'ENERGY' ? '能量' : '带宽' }}</span>
      </div>
    </div>
    <div class="flex items-center justify-between mt-2">
      <p class="text-xs text-gray-500" v-if="loadingResources">
        <span class="animate-pulse">获取资源信息中...</span>
      </p>
      <p class="text-xs text-gray-500" v-else>
        可代理: {{ availableAmount.toLocaleString() }} {{ resourceType === 'ENERGY' ? '能量' : '带宽' }}
      </p>
      <div class="text-xs">
        <button 
          type="button" 
          @click="$emit('setMaxAmount')" 
          class="text-green-600 hover:text-green-700 underline"
          :disabled="loadingResources || availableAmount <= 0"
          :class="{ 'opacity-50 cursor-not-allowed': loadingResources || availableAmount <= 0 }"
        >
          全部代理
        </button>
      </div>
    </div>

    <!-- 验证错误提示 -->
    <div v-if="validationError" class="mt-2 text-xs text-red-600">
      {{ validationError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNumberInput } from '@/composables/useNumberInput'

interface Props {
  amount: string
  resourceType: 'ENERGY' | 'BANDWIDTH'
  availableAmount: number
  loadingResources: boolean
  validationError?: string  // 新增验证错误
}

interface Emits {
  'update:amount': [value: string]
  'setMaxAmount': []
  'validate': []  // 新增验证触发事件
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { validateNumberInput } = useNumberInput()

const handleAmountInput = (event: Event) => {
  validateNumberInput(event, (value) => {
    emit('update:amount', value)
    // 触发验证，使用防抖避免频繁验证
    setTimeout(() => {
      emit('validate')
    }, 300)
  })
}
</script>
