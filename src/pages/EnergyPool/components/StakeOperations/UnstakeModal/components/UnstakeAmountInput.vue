<!--
  解锁金额输入组件
-->
<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <label class="block text-sm font-medium text-gray-700">解锁数量</label>
      <div class="text-sm text-gray-600">
        可解锁：<span class="font-semibold text-blue-600">{{ availableAmount }} TRX</span> 
        <button 
          type="button" 
          @click="$emit('setMax')" 
          :disabled="disabled || parseFloat(availableAmount) <= 0"
          class="text-blue-500 font-bold hover:text-blue-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed ml-1"
        >
          MAX
        </button>
      </div>
    </div>
    <div class="relative">
      <input
        :value="modelValue"
        @input="handleInput"
        type="text"
        pattern="[0-9]*\.?[0-9]*"
        required
        :disabled="disabled"
        class="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg disabled:bg-gray-50 disabled:text-gray-500"
        placeholder="请输入解锁数量"
      />
      <div class="absolute inset-y-0 right-0 flex items-center pr-4">
        <span class="text-gray-500 font-medium">TRX</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  availableAmount: string
  disabled?: boolean
  validateNumberInput: (event: Event, callback: (value: string) => void) => void
}

interface Emits {
  'update:modelValue': [value: string]
  'setMax': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleInput = (event: Event) => {
  props.validateNumberInput(event, (value) => {
    emit('update:modelValue', value)
  })
}
</script>
