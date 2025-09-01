<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="handleCancel"></div>

      <!-- 对话框 -->
      <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <!-- 图标和标题 -->
        <div class="flex items-center gap-4 mb-4">
          <div
            :class="[
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              iconBgClass
            ]"
          >
            <component :is="iconComponent" :class="['w-5 h-5', iconClass]" />
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">{{ title }}</h3>
          </div>
        </div>

        <!-- 消息内容 -->
        <div class="mb-6">
          <p class="text-sm text-gray-600">{{ message }}</p>
        </div>

        <!-- 按钮 -->
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="handleCancel"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            :disabled="loading"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            @click="handleConfirm"
            :class="[
              'px-4 py-2 text-sm font-medium border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
              confirmButtonClass
            ]"
            :disabled="loading"
          >
            <div v-if="loading" class="flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>处理中...</span>
            </div>
            <span v-else>{{ confirmText }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-vue-next'

type DialogType = 'warning' | 'danger' | 'info' | 'success'

interface Props {
  visible: boolean
  title: string
  message: string
  type?: DialogType
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

interface Emits {
  confirm: []
  cancel: []
}

const props = withDefaults(defineProps<Props>(), {
  type: 'warning',
  confirmText: '确定',
  cancelText: '取消',
  loading: false
})

const emit = defineEmits<Emits>()

// 计算属性
const iconComponent = computed(() => {
  switch (props.type) {
    case 'danger':
      return XCircle
    case 'info':
      return Info
    case 'success':
      return CheckCircle
    default:
      return AlertTriangle
  }
})

const iconClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'text-red-600'
    case 'info':
      return 'text-blue-600'
    case 'success':
      return 'text-green-600'
    default:
      return 'text-yellow-600'
  }
})

const iconBgClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'bg-red-100'
    case 'info':
      return 'bg-blue-100'
    case 'success':
      return 'bg-green-100'
    default:
      return 'bg-yellow-100'
  }
})

const confirmButtonClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'
    case 'info':
      return 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    case 'success':
      return 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
    default:
      return 'text-white bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
  }
})

// 事件处理
const handleConfirm = () => {
  if (!props.loading) {
    emit('confirm')
  }
}

const handleCancel = () => {
  if (!props.loading) {
    emit('cancel')
  }
}
</script>