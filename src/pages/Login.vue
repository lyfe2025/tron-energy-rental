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
          <!-- 邮箱输入 -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              邮箱
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User class="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                :class="{
                  'border-red-300 focus:ring-red-500': errors.email,
                  'border-gray-300': !errors.email
                }"
                placeholder="请输入邮箱"
                :disabled="isLoading"
                @blur="validateField('email')"
              />
            </div>
            <p v-if="errors.email" class="mt-1 text-sm text-red-600 animate-fade-in">
              {{ errors.email }}
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
                @blur="validateField('password')"
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
            <p v-if="errors.password" class="mt-1 text-sm text-red-600 animate-fade-in">
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

          <!-- 成功提示 -->
          <Transition
            enter-active-class="transition-all duration-500 ease-out"
            enter-from-class="opacity-0 transform -translate-y-4 scale-90"
            enter-to-class="opacity-100 transform translate-y-0 scale-100"
            leave-active-class="transition-all duration-300 ease-in"
            leave-from-class="opacity-100 transform translate-y-0 scale-100"
            leave-to-class="opacity-0 transform -translate-y-4 scale-90"
          >
            <div v-if="isLoginSuccess" class="bg-gradient-to-r from-green-50 to-emerald-100 border-l-4 border-green-400 rounded-lg p-4 mb-4 shadow-sm">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="h-5 w-5 text-green-500 animate-pulse">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-green-800 font-medium">登录成功！</p>
                  <p class="text-xs text-green-600 mt-1 opacity-75">正在跳转到管理面板...</p>
                </div>
              </div>
            </div>
          </Transition>

          <!-- 错误提示 -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 transform -translate-y-2 scale-95"
            enter-to-class="opacity-100 transform translate-y-0 scale-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 transform translate-y-0 scale-100"
            leave-to-class="opacity-0 transform -translate-y-2 scale-95"
          >
            <div v-if="authError" class="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-400 rounded-lg p-4 mb-4 shadow-sm">
               <div class="flex items-start justify-between">
                 <div class="flex items-start">
                   <div class="flex-shrink-0">
                     <AlertCircle class="h-5 w-5 text-red-500 mt-0.5" />
                   </div>
                   <div class="ml-3">
                     <p class="text-sm text-red-800 font-medium leading-5">{{ authError }}</p>
                     <p class="text-xs text-red-600 mt-1 opacity-75">请检查您的登录信息后重试</p>
                   </div>
                 </div>
                 <button
                   @click="clearError()"
                   class="flex-shrink-0 ml-4 text-red-400 hover:text-red-600 transition-colors"
                   aria-label="关闭错误提示"
                 >
                   <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
             </div>
          </Transition>

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
import { useAuthStore } from '@/stores/auth'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  Zap
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

// 路由和状态管理
const router = useRouter()
const authStore = useAuthStore()

// 响应式数据
const showPassword = ref(false)
const isLoading = ref(false)
const isLoginSuccess = ref(false)
const localAuthError = ref<string | null>(null) // 本地错误状态
const hasShownError = ref(false) // 标记是否已经显示过错误

// 表单数据
const form = reactive({
  email: '',
  password: '',
  remember: false
})

// 表单验证错误
const errors = reactive({
  email: '',
  password: ''
})

// 计算属性
const isFormValid = computed(() => {
  return form.email.trim().length > 0 && 
         form.password.length > 0 && 
         !errors.email && 
         !errors.password
})

// 使用本地错误状态，避免computed的响应式问题
const authError = computed(() => {
  // 如果本地有错误状态，优先使用本地状态
  if (localAuthError.value) {
    return localAuthError.value
  }
  // 如果store中有错误且还没有显示过，则显示
  if (authStore.error && !hasShownError.value) {
    return authStore.error
  }
  // 否则返回本地状态
  return localAuthError.value
})

// 监听store中的错误变化，同步到本地状态
watch(() => authStore.error, (newError) => {
  console.log('🔍 [Login.vue] 监听到store错误变化:', newError)
  if (newError) {
    localAuthError.value = newError
    hasShownError.value = true // 标记已经显示过错误
  }
}, { immediate: true })

// 邮箱格式验证正则表达式
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 手动清除错误（用户主动关闭时）
const clearError = () => {
  localAuthError.value = null
  hasShownError.value = false
  console.log('🔍 [Login.vue] 用户手动清除错误')
}

// 清除所有表单验证错误（重新提交时）
const clearFormValidationErrors = () => {
  errors.email = ''
  errors.password = ''
  // 不清除认证错误，让用户能看到具体的错误信息
  // 不清除表单数据
}

// 字段级验证
const validateField = (field: 'email' | 'password') => {
  if (field === 'email') {
    if (!form.email.trim()) {
      errors.email = '请输入邮箱地址'
    } else if (!emailRegex.test(form.email.trim())) {
      errors.email = '请输入有效的邮箱格式'
    } else {
      errors.email = ''
    }
  } else if (field === 'password') {
    if (!form.password) {
      errors.password = '请输入密码'
    } else if (form.password.length < 6) {
      errors.password = '密码长度至少6位字符'
    } else if (form.password.length > 50) {
      errors.password = '密码长度不能超过50位字符'
    } else if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(form.password)) {
      errors.password = '密码必须包含字母和数字'
    } else {
      errors.password = ''
    }
  }
}

// 表单验证
const validateForm = () => {
  // 不清除之前的验证错误，保持错误状态
  // clearFormValidationErrors()
  
  let isValid = true
  
  // 验证邮箱
  if (!form.email.trim()) {
    errors.email = '请输入邮箱地址'
    isValid = false
  } else if (!emailRegex.test(form.email.trim())) {
    errors.email = '请输入有效的邮箱格式'
    isValid = false
  }
  
  // 验证密码
  if (!form.password) {
    errors.password = '请输入密码'
    isValid = false
  } else if (form.password.length < 6) {
    errors.password = '密码长度至少6位字符'
    isValid = false
  } else if (form.password.length > 50) {
    errors.password = '密码长度不能超过50位字符'
    isValid = false
  } else if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(form.password)) {
    errors.password = '密码必须包含字母和数字'
    isValid = false
  }
  
  return isValid
}

// 处理登录
const handleLogin = async () => {
  console.log('🔍 [Login.vue] 开始处理登录，当前authError状态:', authError.value)
  
  // 验证表单
  if (!validateForm()) {
    return
  }
  
  try {
    isLoading.value = true
    
    // 保存当前表单数据，防止被清除
    const currentFormData = {
      email: form.email.trim(),
      password: form.password,
      remember: form.remember
    }
    
    console.log('🔍 [Login.vue] 发送登录请求，表单数据:', currentFormData)
    
    const result = await authStore.login({
      email: currentFormData.email,
      password: currentFormData.password
    })
    
    console.log('🔍 [Login.vue] 登录结果:', result)
    
    if (result.success) {
      // 登录成功，清除所有错误状态
      localAuthError.value = null // 清除本地错误状态
      hasShownError.value = false // 重置错误显示标记
      isLoginSuccess.value = true
      console.log('🔍 [Login.vue] 登录成功，正在跳转...')
      
      // 延迟跳转，让用户看到成功动画
      setTimeout(async () => {
        await router.push('/dashboard')
      }, 1500) // 1.5秒后跳转
      
    } else {
      // 登录失败，错误信息已经在store中设置
      console.log('🔍 [Login.vue] 登录失败，当前authError状态:', authError.value)
      
      // 不需要恢复表单数据，因为表单数据本来就没有被清除
      // 表单数据应该保持用户输入的状态
      console.log('🔍 [Login.vue] 表单数据保持原状:', form)
      
      // 聚焦到密码输入框，方便用户修改
      setTimeout(() => {
        const passwordInput = document.getElementById('password')
        if (passwordInput) {
          passwordInput.focus()
          // 选中密码文本，方便用户重新输入
          if (passwordInput instanceof HTMLInputElement) {
            passwordInput.select()
          }
        }
      }, 100)
    }
  } catch (error) {
    console.error('🔍 [Login.vue] 登录过程中发生错误:', error)
    // 这里不需要手动设置错误，因为authStore.login已经处理了错误
    // 同样不清空表单数据
    
    // 聚焦到密码输入框
    setTimeout(() => {
      const passwordInput = document.getElementById('password')
      if (passwordInput) {
        passwordInput.focus()
      }
    }, 100)
  } finally {
    isLoading.value = false
    console.log('🔍 [Login.vue] 登录处理完成，最终authError状态:', authError.value)
  }
}

// 组件挂载时检查是否已登录
onMounted(async () => {
  // 监听token过期事件
  const handleTokenExpired = () => {
    console.log('🔍 [Login.vue] 监听到token过期事件')
    // 清除本地状态
    localAuthError.value = null
    hasShownError.value = false
    // 不需要跳转，因为已经在登录页了
  }
  
  window.addEventListener('auth:token-expired', handleTokenExpired)
  
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
  
  // 清理事件监听器
  return () => {
    window.removeEventListener('auth:token-expired', handleTokenExpired)
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

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>