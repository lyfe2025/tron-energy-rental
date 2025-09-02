<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">重置密码</h3>
        <button
          @click="handleCancel"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="mb-6">
        <p class="text-sm text-gray-600">
          确定要重置管理员 <span class="font-medium text-gray-900">{{ admin?.username }}</span> 的密码吗？
        </p>
        <p class="text-sm text-gray-500 mt-2">
          系统将生成新的随机密码，请妥善保管并及时通知该管理员修改密码。
        </p>
      </div>

      <div class="flex justify-end space-x-3">
        <button
          @click="handleCancel"
          :disabled="loading"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          取消
        </button>
        <button
          @click="handleConfirm"
          :disabled="loading"
          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          {{ loading ? '重置中...' : '确定重置' }}
        </button>
      </div>
    </div>
  </div>

  <!-- 密码显示对话框 -->
  <div v-if="showPassword" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-green-600">密码重置成功</h3>
        <button
          @click="closePasswordDialog"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="mb-6">
        <p class="text-sm text-gray-600 mb-4">
          管理员 <span class="font-medium text-gray-900">{{ resetResult.username }}</span> 的新密码是：
        </p>
        <div class="bg-gray-50 p-4 rounded-lg border">
          <div class="flex items-center justify-between">
            <span class="font-mono text-lg font-medium text-gray-900">{{ resetResult.password }}</span>
            <button
              @click="copyPassword"
              class="text-blue-600 hover:text-blue-800 text-sm"
            >
              复制
            </button>
          </div>
        </div>
        <p class="text-sm text-red-600 mt-3">
          请妥善保管并及时通知该管理员修改密码。
        </p>
      </div>

      <div class="flex justify-end">
        <button
          @click="closePasswordDialog"
          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
        >
          我已记录
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { AdminService } from '@/services/adminService'
import type { AdminRoleInfo } from '../types'

interface Props {
  visible: boolean
  admin: AdminRoleInfo | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const showPassword = ref(false)
const resetResult = ref({
  username: '',
  password: ''
})

const handleCancel = () => {
  emit('update:visible', false)
}

const handleConfirm = async () => {
  if (!props.admin) return
  
  loading.value = true
  try {
    // 生成随机密码
    const newPassword = generateRandomPassword()
    
    // 调用重置密码API
    await AdminService.resetAdminPassword(props.admin.admin_id, newPassword)
    
    // 显示新密码
    resetResult.value = {
      username: props.admin.username,
      password: newPassword
    }
    
    showPassword.value = true
    emit('update:visible', false)
    
    ElMessage.success('密码重置成功')
    emit('success')
  } catch (error) {
    console.error('重置密码失败:', error)
    ElMessage.error('重置密码失败')
  } finally {
    loading.value = false
  }
}

const closePasswordDialog = () => {
  showPassword.value = false
  resetResult.value = {
    username: '',
    password: ''
  }
}

const copyPassword = async () => {
  try {
    await navigator.clipboard.writeText(resetResult.value.password)
    ElMessage.success('密码已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 生成随机密码
const generateRandomPassword = (): string => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
</script>