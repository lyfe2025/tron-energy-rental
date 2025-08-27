<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full space-y-8">
      <!-- 登录卡片 -->
      <div class="bg-white rounded-xl shadow-lg p-8">
        <!-- 头部 -->
        <div class="text-center mb-8">
          <div class="mx-auto h-12 w-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
            <Zap class="h-6 w-6 text-white" />
          </div>
          <h2 class="text-3xl font-bold text-gray-900">TRON能量租赁</h2>
          <p class="mt-2 text-sm text-gray-600">管理员登录</p>
        </div>

        <!-- 登录表单 -->
        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- 用户名输入 -->
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User class="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="username"
                v-model="form.username"
                type="text"
                required
                class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                :class="{
                  'border-red-300 focus:ring-red-500': errors.username,
                  'border-gray-300': !errors.username
                }"
                placeholder="请输入用户名"
                :disabled="isLoading"
              />
            </div>
            <p v-if="errors.username" class="mt-1 text-sm text-red-600">
              {{ errors.username }}
            </p>
          </div>

          <!-- 密码输入 -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock class="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                :class="{
                  'border-red-300 focus:ring-red-500': errors.password,
                  'border-gray-300': !errors.password
                }"
                placeholder="请输入密码"
                :disabled="isLoading"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                :disabled="isLoading"
              >
                <Eye v-if="showPassword" class="h-5 w-5 text-gray-400 hover:text-gray-600" />
                <EyeOff v-else class="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <p v-if="errors.password" class="mt-1 text-sm text-red-600">
              {{ errors.password }}
            </p>
          </div>

          <!-- 记住我 -->
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="remember"
                v-model="form.remember"
                type="checkbox"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                :disabled="isLoading"
              />
              <label for="remember" class="ml-2 block text-sm text-gray-700">
                记住我
              </label>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="authError" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center">
              <AlertCircle class="h-5 w-5 text-red-400 mr-2" />
              <p class="text-sm text-red-700">{{ authError }}</p>
            </div>
          </div>

          <!-- 登录按钮 -->
          <button
            type="submit"
            :disabled="isLoading || !isFormValid"
            class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Loader2 v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
            {{ isLoading ? '登录中...' : '登录' }}
          </button>
        </form>

        <!-- 底部信息 -->
        <div class="mt-6 text-center">
          <p class="text-xs text-gray-500">
            © 2024 TRON能量租赁系统. 保留所有权利.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Zap,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2
} from 'lucide-vue-next'

// 路由和状态管理
const router = useRouter()
const authStore = useAuthStore()

// 响应式数据
const showPassword = ref(false)
const isLoading = ref(false)

// 表单数据
const form = reactive({
  username: '',
  password: '',
  remember: false
})

// 表单验证错误
const errors = reactive({
  username: '',
  password: ''
})

// 计算属性
const isFormValid = computed(() => {
  return form.username.trim().length > 0 && 
         form.password.length > 0 && 
         !errors.username && 
         !errors.password
})

const authError = computed(() => authStore.error)

// 表单验证
const validateForm = () => {
  // 清除之前的错误
  errors.username = ''
  errors.password = ''
  
  let isValid = true
  
  // 验证用户名
  if (!form.username.trim()) {
    errors.username = '请输入用户名'
    isValid = false
  } else if (form.username.trim().length < 3) {
    errors.username = '用户名至少3个字符'
    isValid = false
  }
  
  // 验证密码
  if (!form.password) {
    errors.password = '请输入密码'
    isValid = false
  } else if (form.password.length < 6) {
    errors.password = '密码至少6个字符'
    isValid = false
  }
  
  return isValid
}

// 处理登录
const handleLogin = async () => {
  // 清除之前的错误
  authStore.clearError()
  
  // 验证表单
  if (!validateForm()) {
    return
  }
  
  try {
    isLoading.value = true
    
    const result = await authStore.login({
      username: form.username.trim(),
      password: form.password
    })
    
    if (result.success) {
      // 登录成功，跳转到仪表板
      await router.push('/dashboard')
    }
    // 错误信息已经在store中处理
  } catch (error) {
    console.error('登录过程中发生错误:', error)
  } finally {
    isLoading.value = false
  }
}

// 组件挂载时检查是否已登录
onMounted(async () => {
  // 如果已经登录，直接跳转到仪表板
  if (authStore.isAuthenticated) {
    await router.push('/dashboard')
    return
  }
  
  // 尝试从本地存储恢复登录状态
  if (authStore.token) {
    try {
      await authStore.initializeAuth()
      if (authStore.isAuthenticated) {
        await router.push('/dashboard')
      }
    } catch (error) {
      console.error('初始化认证失败:', error)
    }
  }
})
</script>

<style scoped>
/* 自定义样式 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>