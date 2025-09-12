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
          :disabled="loading"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? '操作中...' : (action === 'enable' ? '启用' : '停用') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

const handleCancel = () => {
  emit('close')
}

const handleConfirm = () => {
  if (props.account) {
    emit('confirm', props.account, props.action)
  }
}
</script>
