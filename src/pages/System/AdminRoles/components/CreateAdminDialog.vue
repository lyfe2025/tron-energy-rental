<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
      <!-- 对话框头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-green-100 rounded-lg">
            <UserPlus class="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">新增管理员</h3>
            <p class="text-sm text-gray-500">
              创建新的管理员账户
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
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 基本信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 用户名 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                用户名 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.username"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入用户名"
              />
              <div v-if="errors.username" class="mt-1 text-sm text-red-600">
                {{ errors.username }}
              </div>
            </div>

            <!-- 邮箱 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                邮箱 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入邮箱地址"
              />
              <div v-if="errors.email" class="mt-1 text-sm text-red-600">
                {{ errors.email }}
              </div>
            </div>
          </div>

          <!-- 密码信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 密码 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                密码 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.password"
                type="password"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入密码"
              />
              <div v-if="errors.password" class="mt-1 text-sm text-red-600">
                {{ errors.password }}
              </div>
            </div>

            <!-- 确认密码 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                确认密码 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.confirmPassword"
                type="password"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请再次输入密码"
              />
              <div v-if="errors.confirmPassword" class="mt-1 text-sm text-red-600">
                {{ errors.confirmPassword }}
              </div>
            </div>
          </div>

          <!-- 个人信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 姓名 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                姓名 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入真实姓名"
              />
              <div v-if="errors.name" class="mt-1 text-sm text-red-600">
                {{ errors.name }}
              </div>
            </div>

            <!-- 手机号 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                手机号 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.phone"
                type="tel"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入手机号"
              />
              <div v-if="errors.phone" class="mt-1 text-sm text-red-600">
                {{ errors.phone }}
              </div>
            </div>
          </div>

          <!-- 岗位和角色 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 岗位 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                岗位 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.positionId"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择岗位</option>
                <option
                  v-for="position in positions"
                  :key="position.value"
                  :value="position.value"
                >
                  {{ position.label }}
                </option>
              </select>
              <div v-if="errors.positionId" class="mt-1 text-sm text-red-600">
                {{ errors.positionId }}
              </div>
            </div>

            <!-- 角色 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                角色 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.roleId"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择角色</option>
                <option
                  v-for="role in roles"
                  :key="role.value"
                  :value="role.value"
                >
                  {{ role.label }}
                </option>
              </select>
              <div v-if="errors.roleId" class="mt-1 text-sm text-red-600">
                {{ errors.roleId }}
              </div>
            </div>
          </div>

          <!-- 状态 -->
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-2">
              状态
            </label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input
                  v-model="form.status"
                  type="radio"
                  value="active"
                  class="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700">启用</span>
              </label>
              <label class="flex items-center">
                <input
                  v-model="form.status"
                  type="radio"
                  value="inactive"
                  class="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700">禁用</span>
              </label>
            </div>
          </div>
        </form>
      </div>

      <!-- 对话框底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
        <button
          @click="handleClose"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          :disabled="loading"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          {{ loading ? '创建中...' : '创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AdminService } from '@/services/adminService'
import { UserPlus, X } from 'lucide-vue-next'
import { ref, watch } from 'vue'
interface CreateAdminForm {
  username: string
  email: string
  password: string
  confirmPassword: string
  name: string
  phone: string
  positionId: number | null
  roleId: number | null
  status: 'active' | 'inactive'
}

interface Props {
  visible: boolean
  positions: Array<{ value: number; label: string }>
  roles: Array<{ value: number; label: string }>
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const errors = ref<Record<string, string>>({})

// 表单数据
const form = ref<CreateAdminForm>({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  phone: '',
  positionId: null,
  roleId: null,
  status: 'active'
})

// 表单验证
const validateForm = (): boolean => {
  errors.value = {}
  
  if (!form.value.username.trim()) {
    errors.value.username = '请输入用户名'
  } else if (form.value.username.length < 3 || form.value.username.length > 20) {
    errors.value.username = '用户名长度在 3 到 20 个字符'
  }
  
  if (!form.value.email.trim()) {
    errors.value.email = '请输入邮箱地址'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = '请输入正确的邮箱地址'
  }
  
  if (!form.value.password.trim()) {
    errors.value.password = '请输入密码'
  } else if (form.value.password.length < 6 || form.value.password.length > 20) {
    errors.value.password = '密码长度在 6 到 20 个字符'
  }
  
  if (!form.value.confirmPassword.trim()) {
    errors.value.confirmPassword = '请再次输入密码'
  } else if (form.value.confirmPassword !== form.value.password) {
    errors.value.confirmPassword = '两次输入密码不一致'
  }
  
  if (!form.value.name.trim()) {
    errors.value.name = '请输入真实姓名'
  } else if (form.value.name.length < 2 || form.value.name.length > 10) {
    errors.value.name = '姓名长度在 2 到 10 个字符'
  }
  
  if (!form.value.phone.trim()) {
    errors.value.phone = '请输入手机号'
  } else if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
    errors.value.phone = '请输入正确的手机号'
  }
  
  if (!form.value.positionId) {
    errors.value.positionId = '请选择岗位'
  }
  
  if (!form.value.roleId) {
    errors.value.roleId = '请选择角色'
  }
  
  return Object.keys(errors.value).length === 0
}

// 重置表单
const resetForm = () => {
  form.value = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    positionId: null,
    roleId: null,
    status: 'active'
  }
  errors.value = {}
}

// 关闭对话框
const handleClose = () => {
  emit('update:visible', false)
  resetForm()
}

// 提交表单
const handleSubmit = async () => {
  if (!validateForm()) return
  
  try {
    loading.value = true
    
    // 准备提交数据
    const submitData = {
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
      name: form.value.name,
      phone: form.value.phone,
      position_id: form.value.positionId!,
      role_id: form.value.roleId!,
      status: form.value.status
    }
    
    console.log('🔍 [CreateAdminDialog] 表单数据:', form.value)
    console.log('🔍 [CreateAdminDialog] 提交数据:', submitData)
    console.log('🔍 [CreateAdminDialog] 数据类型检查:')
    Object.entries(submitData).forEach(([key, value]) => {
      console.log(`  ${key}: ${typeof value} = ${JSON.stringify(value)}`)
    })
    
    // 调用API创建管理员
    await AdminService.createAdmin(submitData)
    
    // 显示成功消息
    const event = new CustomEvent('show-message', {
      detail: { type: 'success', message: '管理员创建成功' }
    })
    window.dispatchEvent(event)
    
    emit('success')
    handleClose()
    
  } catch (error: any) {
    console.error('创建管理员失败:', error)
    
    // 显示错误消息
    const event = new CustomEvent('show-message', {
      detail: { type: 'error', message: error.message || '创建管理员失败' }
    })
    window.dispatchEvent(event)
  } finally {
    loading.value = false
  }
}

// 监听对话框显示状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})
</script>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>