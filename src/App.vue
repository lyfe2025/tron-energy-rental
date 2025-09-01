<template>
  <router-view />
  <!-- 全局通知组件 -->
  <Toast />
</template>

<script setup lang="ts">
import Toast from '@/components/Toast.vue'
import { useAuthStore } from '@/stores/auth'
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()

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

onMounted(async () => {
  // 添加全局事件监听器
  window.addEventListener('auth:token-expired', handleTokenExpired as EventListener)
  
  // 初始化认证状态
  try {
    await authStore.initializeAuth()
  } catch (error) {
    console.error('初始化认证状态失败:', error)
  }
})

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('auth:token-expired', handleTokenExpired as EventListener)
})
</script>