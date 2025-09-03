<template>
  <div v-if="visible" class="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
      <div class="mt-3 text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <AlertTriangle class="h-6 w-6 text-red-600" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 mt-4">账户已被下线</h3>
        <div class="mt-2 px-7 py-3">
          <p class="text-sm text-gray-500">
            {{ message || '您的账户已被管理员强制下线，请重新登录。' }}
          </p>
          <p class="text-xs text-gray-400 mt-2">
            如有疑问，请联系系统管理员。
          </p>
        </div>
        <div class="flex items-center justify-center mt-4">
          <button
            @click="handleRelogin"
            class="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            重新登录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { AlertTriangle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

interface Props {
  visible: boolean
  message?: string
}

withDefaults(defineProps<Props>(), {
  visible: false,
  message: ''
})

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const authStore = useAuthStore()

const handleRelogin = async () => {
  // 清除认证状态
  await authStore.logout()
  
  // 关闭模态框
  emit('close')
  
  // 跳转到登录页
  router.push('/auth/login')
}
</script>
