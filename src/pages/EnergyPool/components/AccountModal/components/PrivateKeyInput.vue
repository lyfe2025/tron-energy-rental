<template>
  <div>
    <!-- 私钥输入方式选择 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        私钥输入方式 *
      </label>
      <div class="flex space-x-4 mb-3">
        <label class="flex items-center">
          <input
            type="radio"
            value="direct"
            :checked="inputMode === 'direct'"
            @change="onModeChange('direct')"
            class="mr-2"
          />
          <span class="text-sm">直接输入私钥</span>
        </label>
        <label class="flex items-center">
          <input
            type="radio"
            value="mnemonic"
            :checked="inputMode === 'mnemonic'"
            @change="onModeChange('mnemonic')"
            class="mr-2"
          />
          <span class="text-sm">通过助记词生成</span>
        </label>
      </div>
    </div>

    <!-- 助记词输入（当选择助记词模式时） -->
    <MnemonicInput
      v-if="inputMode === 'mnemonic'"
      v-model="mnemonicValue"
      :error="mnemonicError"
      :generating="generating"
      @generate="onGenerate"
      @blur="onMnemonicBlur"
    />

    <!-- 私钥输入/显示 -->
    <div>
      <label for="private_key" class="block text-sm font-medium text-gray-700 mb-1">
        私钥 *
        <span v-if="inputMode === 'mnemonic'" class="text-xs text-gray-500">
          （由助记词自动生成）
        </span>
      </label>
      <div class="relative">
        <input
          id="private_key"
          :model-value="modelValue"
          @input="onInput"
          @blur="onBlur"
          :type="showPrivateKey ? 'text' : 'password'"
          :required="inputMode === 'direct'"
          :readonly="inputMode === 'mnemonic'"
          :placeholder="inputMode === 'direct' ? '请输入私钥' : '将从助记词自动生成'"
          class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{ 
            'border-red-500': error,
            'bg-gray-100': inputMode === 'mnemonic'
          }"
        />
        <button
          type="button"
          @click="togglePrivateKeyVisibility"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <Eye v-if="!showPrivateKey" class="w-5 h-5" />
          <EyeOff v-else class="w-5 h-5" />
        </button>
      </div>
      <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'
import { ref } from 'vue'
import type { PrivateKeyInputMode } from '../types/account-modal.types'
import MnemonicInput from './MnemonicInput.vue'

interface Props {
  modelValue: string
  error: string
  inputMode: PrivateKeyInputMode
  mnemonicValue: string
  mnemonicError: string
  generating: boolean
}

interface Emits {
  'update:modelValue': [value: string]
  'update:inputMode': [mode: PrivateKeyInputMode]
  'update:mnemonicValue': [value: string]
  generate: []
  blur: []
  mnemonicBlur: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const showPrivateKey = ref(false)

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const onBlur = () => {
  emit('blur')
}

const onModeChange = (mode: PrivateKeyInputMode) => {
  emit('update:inputMode', mode)
}

const onGenerate = () => {
  emit('generate')
}

const onMnemonicBlur = () => {
  emit('mnemonicBlur')
}

const togglePrivateKeyVisibility = () => {
  showPrivateKey.value = !showPrivateKey.value
}
</script>
