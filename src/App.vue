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
  
  <!-- 后端服务状态模态框 -->
  <BackendStatusModal
    :visible="showBackendStatusModal"
    :status="backendStatus"
    :error-message="backendErrorMessage"
    :response-time="backendResponseTime"
    :retrying="isRetryingConnection"
    :allow-offline-mode="false"
    @close="closeBackendStatusModal"
    @retry="retryBackendConnection"
    @continue-offline="continueOfflineMode"
  />
</template>

<script setup lang="ts">
import ForcedLogoutModal from '@/components/auth/ForcedLogoutModal.vue'
import BackendStatusModal from '@/components/BackendStatusModal.vue'
import Toast from '@/components/Toast.vue'
import { useToast } from '@/composables/useToast'
import { checkBackendHealth, startPeriodicHealthCheck, type HealthCheckResult } from '@/services/healthCheckService'
import { useAuthStore } from '@/stores/auth'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// 被强制下线模态框状态
const showForcedLogoutModal = ref(false)
const forcedLogoutMessage = ref('')

// 后端服务状态
const showBackendStatusModal = ref(false)
const backendStatus = ref<'checking' | 'available' | 'unavailable'>('checking')
const backendErrorMessage = ref('')
const backendResponseTime = ref<number | undefined>(undefined)
const isRetryingConnection = ref(false)
let stopHealthCheck: (() => void) | null = null

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

// 后端服务状态处理函数
const handleBackendUnavailable = (event: CustomEvent) => {
  console.error('🔍 [App.vue] 后端服务不可用事件:', event.detail)
  
  const { message, code } = event.detail || {}
  
  // 更新状态
  backendStatus.value = 'unavailable'
  backendErrorMessage.value = message || '无法连接到后端服务'
  backendResponseTime.value = undefined
  
  // 显示模态框
  showBackendStatusModal.value = true
  
  // 显示Toast通知
  toast.error('后端服务连接失败', {
    title: '连接错误',
    duration: 5000
  })
}

const performHealthCheck = async (): Promise<HealthCheckResult> => {
  console.log('🏥 [App.vue] 执行健康检查...')
  
  backendStatus.value = 'checking'
  
  try {
    const result = await checkBackendHealth({
      timeout: 5000,
      retries: 2,
      retryDelay: 1000
    })
    
    console.log('🏥 [App.vue] 健康检查结果:', result)
    
    if (result.isHealthy) {
      backendStatus.value = 'available'
      backendResponseTime.value = result.responseTime
      backendErrorMessage.value = ''
      
      // 如果之前是不可用状态，现在恢复了，显示成功提示
      if (showBackendStatusModal.value) {
        toast.success('后端服务连接恢复正常', {
          title: '连接恢复',
          duration: 3000
        })
        
        // 短暂显示成功状态后关闭模态框
        setTimeout(() => {
          showBackendStatusModal.value = false
        }, 2000)
      }
    } else {
      backendStatus.value = 'unavailable'
      backendErrorMessage.value = result.error || '后端服务不可用'
      backendResponseTime.value = result.responseTime
      
      if (!showBackendStatusModal.value) {
        showBackendStatusModal.value = true
      }
    }
    
    return result
  } catch (error: any) {
    console.error('🏥 [App.vue] 健康检查异常:', error)
    
    backendStatus.value = 'unavailable'
    backendErrorMessage.value = '健康检查失败'
    backendResponseTime.value = undefined
    
    if (!showBackendStatusModal.value) {
      showBackendStatusModal.value = true
    }
    
    return {
      isHealthy: false,
      error: '健康检查异常',
      timestamp: Date.now()
    }
  }
}

const closeBackendStatusModal = () => {
  if (backendStatus.value === 'available') {
    showBackendStatusModal.value = false
  }
}

const retryBackendConnection = async () => {
  console.log('🔄 [App.vue] 重试后端连接...')
  
  isRetryingConnection.value = true
  
  try {
    await performHealthCheck()
  } finally {
    isRetryingConnection.value = false
  }
}

const continueOfflineMode = () => {
  console.log('📱 [App.vue] 继续离线模式...')
  
  showBackendStatusModal.value = false
  
  toast.warning('已启用离线模式', {
    title: '离线模式',
    message: '部分功能可能无法使用，建议尽快恢复网络连接',
    duration: 6000
  })
}

onMounted(async () => {
  // 添加全局事件监听器
  window.addEventListener('auth:unauthorized', handleTokenExpired as EventListener)
  window.addEventListener('auth:forced_logout', handleForcedLogout as EventListener)
  window.addEventListener('api:backend_unavailable', handleBackendUnavailable as EventListener)
  
  // 初始化认证状态
  try {
    await authStore.initializeAuth()
  } catch (error) {
    console.error('初始化认证状态失败:', error)
  }
  
  // 执行初始健康检查
  console.log('🏥 [App.vue] 启动初始健康检查...')
  await performHealthCheck()
  
  // 启动定期健康检查
  stopHealthCheck = startPeriodicHealthCheck(
    (result: HealthCheckResult) => {
      console.log('🏥 [App.vue] 定期健康检查结果:', result)
      
      if (result.isHealthy) {
        // 服务可用
        if (backendStatus.value === 'unavailable') {
          // 从不可用恢复到可用，显示恢复提示
          toast.success('后端服务连接恢复正常', {
            title: '连接恢复',
            duration: 3000
          })
          
          // 如果模态框是打开的，短暂显示成功状态后关闭
          if (showBackendStatusModal.value) {
            backendStatus.value = 'available'
            backendResponseTime.value = result.responseTime
            backendErrorMessage.value = ''
            
            setTimeout(() => {
              showBackendStatusModal.value = false
            }, 2000)
          }
        } else {
          // 正常状态更新
          backendStatus.value = 'available'
          backendResponseTime.value = result.responseTime
          backendErrorMessage.value = ''
        }
      } else {
        // 服务不可用
        if (backendStatus.value === 'available') {
          // 从可用变为不可用，显示错误提示
          toast.error('后端服务连接失败', {
            title: '连接错误',
            message: result.error || '无法连接到后端服务',
            duration: 5000
          })
        }
        
        backendStatus.value = 'unavailable'
        backendErrorMessage.value = result.error || '后端服务不可用'
        backendResponseTime.value = result.responseTime
        
        // 如果模态框没有显示，则显示它
        if (!showBackendStatusModal.value) {
          showBackendStatusModal.value = true
        }
      }
    },
    30000 // 每30秒检查一次
  )
})

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('auth:unauthorized', handleTokenExpired as EventListener)
  window.removeEventListener('auth:forced_logout', handleForcedLogout as EventListener)
  window.removeEventListener('api:backend_unavailable', handleBackendUnavailable as EventListener)
  
  // 停止健康检查
  if (stopHealthCheck) {
    stopHealthCheck()
    stopHealthCheck = null
  }
})
</script>