<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
      <!-- 对话框头部 -->
      <div class="flex items-center gap-3 p-6 border-b border-gray-200">
        <div
          class="p-2 rounded-lg"
          :class="getIconContainerClass(type)"
        >
          <component
            :is="getIcon(type)"
            class="w-5 h-5"
            :class="getIconClass(type)"
          />
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ title }}
          </h3>
          <p v-if="subtitle" class="text-sm text-gray-500">
            {{ subtitle }}
          </p>
        </div>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 对话框内容 -->
      <div class="p-6">
        <div v-if="message" class="mb-4">
          <p class="text-gray-700">{{ message }}</p>
        </div>
        
        <div v-if="warning" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-start gap-2">
            <AlertTriangle class="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p class="text-sm text-yellow-800">{{ warning }}</p>
          </div>
        </div>
        
        <div v-if="details && details.length > 0" class="mb-4">
          <div class="bg-gray-50 rounded-lg p-3">
            <h4 class="text-sm font-medium text-gray-900 mb-2">详细信息：</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li v-for="(detail, index) in details" :key="index" class="flex items-start gap-2">
                <span class="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>{{ detail }}</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div v-if="inputRequired" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ inputLabel || '请输入确认信息' }}
          </label>
          <input
            v-model="inputValue"
            type="text"
            :placeholder="inputPlaceholder"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @keyup.enter="handleConfirm"
          />
        </div>
      </div>

      <!-- 对话框底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
        <button
          type="button"
          @click="handleClose"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {{ cancelText || '取消' }}
        </button>
        <button
          @click="handleConfirm"
          :disabled="loading || (inputRequired && !inputValue.trim())"
          class="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :class="getConfirmButtonClass(type)"
        >
          <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          {{ loading ? loadingText || '处理中...' : confirmText || '确认' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  HelpCircle
} from 'lucide-vue-next'

type DialogType = 'warning' | 'danger' | 'info' | 'success' | 'question'

interface Props {
  visible: boolean
  type?: DialogType
  title: string
  subtitle?: string
  message?: string
  warning?: string
  details?: string[]
  confirmText?: string
  cancelText?: string
  loadingText?: string
  loading?: boolean
  inputRequired?: boolean
  inputLabel?: string
  inputPlaceholder?: string
  inputValidator?: (value: string) => boolean
}

interface Emits {
  close: []
  confirm: [inputValue?: string]
}

const props = withDefaults(defineProps<Props>(), {
  type: 'warning',
  loading: false,
  inputRequired: false
})

const emit = defineEmits<Emits>()

// 响应式数据
const inputValue = ref('')

// 监听器
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      inputValue.value = ''
    }
  }
)

// 方法
const getIcon = (type: DialogType) => {
  switch (type) {
    case 'danger':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    case 'success':
      return CheckCircle
    case 'question':
      return HelpCircle
    default:
      return AlertTriangle
  }
}

const getIconClass = (type: DialogType) => {
  switch (type) {
    case 'danger':
      return 'text-red-600'
    case 'warning':
      return 'text-yellow-600'
    case 'info':
      return 'text-blue-600'
    case 'success':
      return 'text-green-600'
    case 'question':
      return 'text-purple-600'
    default:
      return 'text-yellow-600'
  }
}

const getIconContainerClass = (type: DialogType) => {
  switch (type) {
    case 'danger':
      return 'bg-red-100'
    case 'warning':
      return 'bg-yellow-100'
    case 'info':
      return 'bg-blue-100'
    case 'success':
      return 'bg-green-100'
    case 'question':
      return 'bg-purple-100'
    default:
      return 'bg-yellow-100'
  }
}

const getConfirmButtonClass = (type: DialogType) => {
  switch (type) {
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700'
    case 'warning':
      return 'bg-yellow-600 text-white hover:bg-yellow-700'
    case 'info':
      return 'bg-blue-600 text-white hover:bg-blue-700'
    case 'success':
      return 'bg-green-600 text-white hover:bg-green-700'
    case 'question':
      return 'bg-purple-600 text-white hover:bg-purple-700'
    default:
      return 'bg-yellow-600 text-white hover:bg-yellow-700'
  }
}

const handleConfirm = () => {
  if (props.inputRequired) {
    if (!inputValue.value.trim()) {
      return
    }
    if (props.inputValidator && !props.inputValidator(inputValue.value)) {
      return
    }
    emit('confirm', inputValue.value)
  } else {
    emit('confirm')
  }
}

const handleClose = () => {
  if (!props.loading) {
    emit('close')
  }
}
</script>