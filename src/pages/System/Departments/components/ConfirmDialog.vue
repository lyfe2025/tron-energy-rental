<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
      <!-- 对话框头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg" :class="iconBgClass">
            <component :is="iconComponent" class="w-5 h-5" :class="iconClass" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ title }}
            </h3>
            <p class="text-sm text-gray-500">
              {{ subtitle }}
            </p>
          </div>
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
        <div class="text-gray-700">
          {{ message }}
        </div>
        
        <!-- 警告信息 -->
        <div v-if="warning" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-start gap-2">
            <AlertTriangle class="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p class="text-sm text-yellow-800">{{ warning }}</p>
          </div>
        </div>
      </div>

      <!-- 对话框底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
        <button
          type="button"
          @click="handleClose"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          :disabled="loading"
          class="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :class="confirmButtonClass"
        >
          <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          {{ loading ? loadingText : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X, AlertTriangle, AlertCircle, Info, CheckCircle, Trash2 } from 'lucide-vue-next'

type DialogType = 'warning' | 'danger' | 'info' | 'success'

interface Props {
  visible: boolean
  type?: DialogType
  title?: string
  subtitle?: string
  message: string
  warning?: string
  confirmText?: string
  cancelText?: string
  loadingText?: string
  loading?: boolean
}

interface Emits {
  close: []
  confirm: []
}

const props = withDefaults(defineProps<Props>(), {
  type: 'warning',
  title: '确认操作',
  subtitle: '请确认您要执行的操作',
  confirmText: '确认',
  cancelText: '取消',
  loadingText: '处理中...',
  loading: false
})

const emit = defineEmits<Emits>()

// 计算属性
const iconComponent = computed(() => {
  switch (props.type) {
    case 'danger':
      return Trash2
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    case 'success':
      return CheckCircle
    default:
      return AlertCircle
  }
})

const iconClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'text-red-600'
    case 'warning':
      return 'text-yellow-600'
    case 'info':
      return 'text-blue-600'
    case 'success':
      return 'text-green-600'
    default:
      return 'text-gray-600'
  }
})

const iconBgClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'bg-red-100'
    case 'warning':
      return 'bg-yellow-100'
    case 'info':
      return 'bg-blue-100'
    case 'success':
      return 'bg-green-100'
    default:
      return 'bg-gray-100'
  }
})

const confirmButtonClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700'
    case 'warning':
      return 'bg-yellow-600 text-white hover:bg-yellow-700'
    case 'info':
      return 'bg-blue-600 text-white hover:bg-blue-700'
    case 'success':
      return 'bg-green-600 text-white hover:bg-green-700'
    default:
      return 'bg-gray-600 text-white hover:bg-gray-700'
  }
})

// 方法
const handleConfirm = () => {
  if (!props.loading) {
    emit('confirm')
  }
}

const handleClose = () => {
  if (!props.loading) {
    emit('close')
  }
}
</script>