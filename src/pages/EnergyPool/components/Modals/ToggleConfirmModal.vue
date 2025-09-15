<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">确认操作</h3>
      <p class="text-sm text-gray-500 mb-6">
        确定要 {{ action === 'enable' ? '启用' : '停用' }}账户 "{{ account?.name }}" 吗？此操作不可撤销。
      </p>
      <div class="flex justify-end space-x-3">
        <button
          @click="handleCancel"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
        >
          取消
        </button>
        <button
          @click="handleConfirm"
          :disabled="loading || isProcessing || !!debounceTimer"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ (loading || isProcessing || debounceTimer) ? '操作中...' : (action === 'enable' ? '启用' : '停用') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Account {
  id: string
  name: string
  [key: string]: any
}

type ToggleAction = 'enable' | 'disable'

interface Props {
  visible: boolean
  account: Account | null
  action: ToggleAction
  loading?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'confirm', account: Account, action: ToggleAction): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// 防抖相关状态
const isProcessing = ref(false)
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const handleCancel = () => {
  // 清除防抖定时器
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
    debounceTimer.value = null
  }
  emit('close')
}

const handleConfirm = () => {
  // 防止重复点击：如果正在处理中或已经有防抖定时器，直接返回
  if (isProcessing.value || debounceTimer.value) {
    console.log('🚫 [ToggleConfirmModal] 防抖拦截：操作正在进行中')
    return
  }

  if (!props.account) {
    return
  }

  // 设置处理状态
  isProcessing.value = true
  
  // 设置防抖定时器（300ms内不允许重复点击）
  debounceTimer.value = setTimeout(() => {
    console.log('✅ [ToggleConfirmModal] 执行账户操作:', {
      accountId: props.account?.id,
      action: props.action
    })
    
    emit('confirm', props.account!, props.action)
    
    // 清理防抖状态（延迟清理，给操作一些缓冲时间）
    setTimeout(() => {
      isProcessing.value = false
      debounceTimer.value = null
    }, 1000)
  }, 300)
}
</script>
