<template>
  <router-view />
  <!-- 全局通知组件 -->
  <Toast />
  
  <!-- 被强制下线通知模态框 -->
  <ForcedLogoutModal 
    :visible="showForcedLogoutModal"
    :message="forcedLogoutMessage"
    @close="closeForcedLogoutModal"
  />
</template>

<script setup lang="ts">
import Toast from '@/components/Toast.vue'
import ForcedLogoutModal from '@/components/auth/ForcedLogoutModal.vue'
import { useAuthStore } from '@/stores/auth'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()

// 被强制下线模态框状态
const showForcedLogoutModal = ref(false)
const forcedLogoutMessage = ref('')

// 全局处理token过期事件
const handleTokenExpired = (event: CustomEvent) => {
  console.log('🔍 [App.vue] 全局处理token过期事件:', event.detail)
  
  // 清除认证状态
  authStore.logout()
  
  // 如果不在登录页，则跳转到登录页
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
}

// 全局处理被强制下线事件
const handleForcedLogout = (event: CustomEvent) => {
  console.log('🔍 [App.vue] 全局处理被强制下线事件:', event.detail)
  
  const { message } = event.detail || {}
  
  // 设置模态框信息
  forcedLogoutMessage.value = message || '您的账户已被管理员强制下线，请重新登录。'
  showForcedLogoutModal.value = true
  
  // 处理被强制下线
  authStore.handleForcedLogout(message)
}

// 关闭被强制下线模态框
const closeForcedLogoutModal = () => {
  showForcedLogoutModal.value = false
  forcedLogoutMessage.value = ''
}

onMounted(async () => {
  // 添加全局事件监听器
  window.addEventListener('auth:unauthorized', handleTokenExpired as EventListener)
  window.addEventListener('auth:forced_logout', handleForcedLogout as EventListener)
  
  // 初始化认证状态
  try {
    await authStore.initializeAuth()
  } catch (error) {
    console.error('初始化认证状态失败:', error)
  }
})

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('auth:unauthorized', handleTokenExpired as EventListener)
  window.removeEventListener('auth:forced_logout', handleForcedLogout as EventListener)
})
</script>