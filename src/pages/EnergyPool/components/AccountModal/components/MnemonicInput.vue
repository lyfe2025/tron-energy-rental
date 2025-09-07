<template>
  <div>
    <label for="mnemonic" class="block text-sm font-medium text-gray-700 mb-1">
      助记词 *
    </label>
    <textarea
      id="mnemonic"
      :model-value="modelValue"
      @input="onInput"
      @blur="onBlur"
      rows="3"
      placeholder="请输入12或24个助记词，用空格分隔"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
      :class="{ 'border-red-500': error }"
    ></textarea>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    
    <!-- 生成私钥按钮 -->
    <div class="mt-2">
      <button
        type="button"
        @click="onGenerate"
        :disabled="!modelValue || generating"
        class="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
      >
        <Loader2 v-if="generating" class="w-3 h-3 animate-spin" />
        <span>{{ generating ? '生成中...' : '从助记词生成私钥' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

interface Props {
  modelValue: string
  error: string
  generating: boolean
}

interface Emits {
  'update:modelValue': [value: string]
  generate: []
  blur: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const onInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

const onBlur = () => {
  emit('blur')
}

const onGenerate = () => {
  emit('generate')
}
</script>
