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

    <!-- 钱包私钥获取指南 -->
    <div v-if="inputMode === 'direct'" class="mb-4">
      <button
        type="button"
        @click="showWalletGuide = !showWalletGuide"
        class="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        <HelpCircle class="w-4 h-4 mr-1" />
        <span>如何从钱包软件获取私钥？</span>
        <ChevronDown 
          :class="{ 'transform rotate-180': showWalletGuide }"
          class="w-4 h-4 ml-1 transition-transform duration-200"
        />
      </button>
      
      <div v-if="showWalletGuide" class="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="text-sm text-gray-700 space-y-4">
          <!-- 安全提醒 -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div class="flex items-start">
              <AlertTriangle class="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div class="text-xs text-yellow-800">
                <strong>安全提醒：</strong>私钥是您钱包的核心机密，请确保在安全的环境中操作，避免截图或记录。
              </div>
            </div>
          </div>

          <!-- TronLink 钱包 -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
              <Wallet class="w-4 h-4 mr-2 text-blue-600" />
              TronLink 钱包
            </h4>
            <ol class="text-xs text-gray-600 space-y-1 ml-6 list-decimal">
              <li>打开 TronLink 浏览器扩展或手机应用</li>
              <li>确保已选择正确的钱包账户</li>
              <li>点击右上角菜单图标 → 选择"设置"</li>
              <li>找到"账户管理"或"导出私钥"选项</li>
              <li>输入钱包密码进行验证</li>
              <li>复制显示的私钥（64位十六进制字符串）</li>
            </ol>
          </div>

          <!-- imToken 钱包 -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
              <Smartphone class="w-4 h-4 mr-2 text-green-600" />
              imToken 钱包
            </h4>
            <ol class="text-xs text-gray-600 space-y-1 ml-6 list-decimal">
              <li>打开 imToken 手机应用</li>
              <li>进入对应的 TRON 钱包</li>
              <li>点击"我" → "管理钱包"</li>
              <li>选择要导出的钱包，点击"导出私钥"</li>
              <li>输入钱包密码或使用生物识别验证</li>
              <li>复制显示的私钥</li>
            </ol>
          </div>

          <!-- Trust Wallet -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
              <Shield class="w-4 h-4 mr-2 text-purple-600" />
              Trust Wallet
            </h4>
            <ol class="text-xs text-gray-600 space-y-1 ml-6 list-decimal">
              <li>打开 Trust Wallet 应用</li>
              <li>点击右下角"设置"</li>
              <li>选择"钱包" → 点击要导出的钱包</li>
              <li>选择"显示私钥"</li>
              <li>输入安全密码或使用生物识别</li>
              <li>复制私钥（注意不要包含前缀"0x"）</li>
            </ol>
          </div>

          <!-- 其他钱包 -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
              <MoreHorizontal class="w-4 h-4 mr-2 text-gray-600" />
              其他钱包软件
            </h4>
            <div class="text-xs text-gray-600 space-y-1">
              <p>大多数钱包的操作步骤类似：</p>
              <ul class="ml-4 list-disc space-y-1">
                <li>找到"设置"或"安全"菜单</li>
                <li>寻找"导出私钥"、"显示私钥"或"备份"选项</li>
                <li>通过密码或生物识别验证身份</li>
                <li>复制完整的私钥字符串</li>
              </ul>
            </div>
          </div>

          <!-- 格式说明 -->
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div class="text-xs text-gray-700">
              <strong>私钥格式：</strong>64位十六进制字符串（如：a1b2c3d4...），不包含"0x"前缀。
              <br>
              <strong>兼容性：</strong>本系统使用标准BIP44路径（m/44'/195'/0'/0/0），与主流TRON钱包完全兼容。
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 助记词输入（当选择助记词模式时） -->
    <MnemonicInput
      v-if="inputMode === 'mnemonic'"
      :model-value="mnemonicValue"
      @update:model-value="onMnemonicUpdate"
      :error="mnemonicError"
      :generating="generating"
      :generated="privateKeyGenerated || false"
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
import {
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
  HelpCircle,
  MoreHorizontal,
  Shield,
  Smartphone,
  Wallet
} from 'lucide-vue-next'
import { nextTick, ref, watch } from 'vue'
import type { PrivateKeyInputMode } from '../types/account-modal.types'
import MnemonicInput from './MnemonicInput.vue'

interface Props {
  modelValue: string
  error: string
  inputMode: PrivateKeyInputMode
  mnemonicValue: string
  mnemonicError: string
  generating: boolean
  privateKeyGenerated?: boolean
}

interface Emits {
  'update:modelValue': [value: string]
  'update:inputMode': [mode: PrivateKeyInputMode]
  'update:mnemonicValue': [value: string]
  generate: []
  blur: []
  mnemonicBlur: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showPrivateKey = ref(false)
const showWalletGuide = ref(false)

// 监听 modelValue 的变化，强制更新输入框的值
watch(() => props.modelValue, (newValue) => {
  console.log('🔍 [PrivateKeyInput] modelValue 变化:', {
    newValue: newValue,
    hasValue: !!newValue,
    valueLength: newValue ? newValue.length : 0
  })
  
  // 强制更新输入框的值
  nextTick(() => {
    const privateKeyInput = document.getElementById('private_key') as HTMLInputElement
    if (privateKeyInput && newValue) {
      privateKeyInput.value = newValue
      console.log('✅ [PrivateKeyInput] 输入框值已更新:', privateKeyInput.value)
    }
  })
}, { immediate: true })

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

const onMnemonicUpdate = (value: string) => {
  emit('update:mnemonicValue', value)
}

const togglePrivateKeyVisibility = () => {
  showPrivateKey.value = !showPrivateKey.value
}
</script>
