<template>
  <div class="bg-white rounded-lg border p-4">
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-lg font-semibold text-gray-900">订单监控状态</h4>
      <div class="flex items-center space-x-2">
        <div class="flex items-center">
          <div 
            :class="[
              'w-3 h-3 rounded-full mr-2',
              isMonitoring ? 'bg-green-500' : 'bg-gray-400'
            ]"
          ></div>
          <span class="text-sm font-medium">
            {{ isMonitoring ? '监控中' : '未监控' }}
          </span>
        </div>
        <button
          @click="refreshStatus"
          :disabled="loading"
          class="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
        >
          {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 订单监控信息 -->
    <div v-if="orderMonitorInfo" class="space-y-4">
      <!-- 基本信息 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-blue-50 p-3 rounded-lg">
          <div class="text-lg font-bold text-blue-600">{{ orderMonitorInfo.remainingTransactions || 0 }}</div>
          <div class="text-sm text-blue-500">剩余笔数</div>
        </div>
        <div class="bg-green-50 p-3 rounded-lg">
          <div class="text-lg font-bold text-green-600">{{ order.used_transactions || 0 }}</div>
          <div class="text-sm text-green-500">已用笔数</div>
        </div>
        <div class="bg-purple-50 p-3 rounded-lg">
          <div class="text-lg font-bold text-purple-600">{{ order.transaction_count || 0 }}</div>
          <div class="text-sm text-purple-500">总笔数</div>
        </div>
        <div class="bg-orange-50 p-3 rounded-lg">
          <div class="text-lg font-bold text-orange-600">{{ formatTime(orderMonitorInfo.lastCheck) }}</div>
          <div class="text-sm text-orange-500">最后检查</div>
        </div>
      </div>

      <!-- 用户地址信息 -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">监控地址</label>
            <div class="font-mono text-sm text-gray-900 break-all">
              {{ orderMonitorInfo.userAddress }}
            </div>
          </div>
          <button
            @click="copyToClipboard(orderMonitorInfo.userAddress)"
            class="ml-2 p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            title="复制地址"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- 监控操作 -->
      <div class="flex flex-wrap gap-2">
        <button
          v-if="!isMonitoring"
          @click="startMonitoring"
          :disabled="loading"
          class="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
        >
          {{ loading ? '启动中...' : '启动监控' }}
        </button>
        <button
          v-if="isMonitoring"
          @click="stopMonitoring"
          :disabled="loading"
          class="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
        >
          {{ loading ? '停止中...' : '停止监控' }}
        </button>
        <button
          @click="triggerManualCheck"
          :disabled="loading || checkingOrder"
          class="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {{ checkingOrder ? '检查中...' : '手动检查' }}
        </button>
      </div>

      <!-- 订单进度条 -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">订单进度</span>
          <span class="text-sm text-gray-500">
            {{ order.used_transactions || 0 }} / {{ order.transaction_count || 0 }}
          </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          已完成 {{ progressPercentage.toFixed(1) }}%
        </div>
      </div>

    </div>

    <!-- 未监控状态 -->
    <div v-else-if="!loading" class="text-center py-8">
      <div class="text-gray-500 mb-4">该订单未在监控列表中</div>
      <button
        @click="startMonitoring"
        :disabled="loading"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {{ loading ? '启动中...' : '启动监控' }}
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { computed, onMounted, ref } from 'vue';

interface Props {
  order: any
}

const props = defineProps<Props>()

const { success: showSuccess, error: showError } = useToast()

// 响应式数据
const loading = ref(false)
const checkingOrder = ref(false)
const orderMonitorInfo = ref<any>(null)

// 计算属性
const isMonitoring = computed(() => {
  return orderMonitorInfo.value !== null
})

const progressPercentage = computed(() => {
  const used = props.order.used_transactions || 0
  const total = props.order.transaction_count || 1
  return (used / total) * 100
})

// 获取订单监控状态
const fetchOrderMonitorStatus = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    if (!token || token.length < 100) {
      console.warn('🔍 [前端] Token无效，跳过监控状态获取')
      // 不显示错误，因为可能是首次加载时用户未登录
      orderMonitorInfo.value = null
      return
    }

    const response = await fetch('/api/transaction-package/energy-monitor/status', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('获取监控状态失败')
    }

    const data = await response.json()
    if (data.success && data.data) {
      // 查找当前订单的监控信息
      const monitoredOrders = data.data.monitoredOrders || []
      orderMonitorInfo.value = monitoredOrders.find((order: any) => order.orderId === props.order.id) || null
    }
  } catch (error) {
    console.error('获取订单监控状态失败:', error)
  }
}

// 刷新状态
const refreshStatus = async () => {
  loading.value = true
  try {
    await fetchOrderMonitorStatus()
  } finally {
    loading.value = false
  }
}

// 启动监控
const startMonitoring = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token')
    console.log('🔍 [前端] 发送监控请求', {
      orderId: props.order.id,
      hasToken: !!token,
      tokenLength: token?.length || 0
    })

    // 检查token是否有效
    if (!token || token.length < 100) {
      throw new Error('请重新登录：认证token无效或已过期')
    }

    const response = await fetch('/api/transaction-package/energy-monitor/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId: props.order.id })
    })

    console.log('🔍 [前端] 响应状态', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('🔍 [前端] 错误详情', errorData)
      throw new Error(errorData.message || `HTTP ${response.status}: 启动监控失败`)
    }

    const data = await response.json()
    console.log('🔍 [前端] 成功响应', data)
    
    if (data.success) {
      showSuccess('订单监控已启动')
      await fetchOrderMonitorStatus()
    } else {
      throw new Error(data.message || '启动监控失败')
    }
  } catch (error) {
    console.error('启动监控失败:', error)
    showError(error instanceof Error ? error.message : '启动监控失败')
  } finally {
    loading.value = false
  }
}

// 停止监控
const stopMonitoring = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token')
    if (!token || token.length < 100) {
      throw new Error('请重新登录：认证token无效或已过期')
    }

    const response = await fetch(`/api/transaction-package/energy-monitor/orders/${props.order.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('停止监控失败')
    }

    const data = await response.json()
    if (data.success) {
      showSuccess('订单监控已停止')
      orderMonitorInfo.value = null
    } else {
      throw new Error(data.message || '停止监控失败')
    }
  } catch (error) {
    console.error('停止监控失败:', error)
    showError(error instanceof Error ? error.message : '停止监控失败')
  } finally {
    loading.value = false
  }
}

// 手动触发检查
const triggerManualCheck = async () => {
  checkingOrder.value = true
  try {
    const token = localStorage.getItem('admin_token')
    if (!token || token.length < 100) {
      throw new Error('请重新登录：认证token无效或已过期')
    }

    const response = await fetch('/api/transaction-package/energy-monitor/trigger-check', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId: props.order.id })
    })

    if (!response.ok) {
      throw new Error('手动检查失败')
    }

    const data = await response.json()
    if (data.success) {
      showSuccess('手动检查已触发')
      // 延迟刷新状态
      setTimeout(fetchOrderMonitorStatus, 2000)
    } else {
      throw new Error(data.message || '手动检查失败')
    }
  } catch (error) {
    console.error('手动检查失败:', error)
    showError(error instanceof Error ? error.message : '手动检查失败')
  } finally {
    checkingOrder.value = false
  }
}

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showSuccess('地址已复制到剪贴板')
  } catch (error) {
    showError('复制失败')
  }
}

// 格式化时间
const formatTime = (date: Date | null) => {
  if (!date) return '从未'
  try {
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '无效时间'
  }
}

// 生命周期
onMounted(async () => {
  await fetchOrderMonitorStatus()
})
</script>
