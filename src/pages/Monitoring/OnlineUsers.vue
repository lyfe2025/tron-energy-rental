<template>
  <div class="space-y-6">
    <!-- 页面标题和操作 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">在线用户管理</h1>
      <div class="flex items-center space-x-3">
        <button
          @click="refreshData"
          :disabled="loading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
          刷新
        </button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 rounded-lg">
            <Users class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">总在线用户</p>
            <p class="text-2xl font-bold text-gray-900">{{ onlineUsers.length }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 rounded-lg">
            <Shield class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">管理员</p>
            <p class="text-2xl font-bold text-gray-900">{{ adminCount }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-purple-100 rounded-lg">
            <UserCheck class="h-6 w-6 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">代理商</p>
            <p class="text-2xl font-bold text-gray-900">{{ agentCount }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-orange-100 rounded-lg">
            <User class="h-6 w-6 text-orange-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">普通用户</p>
            <p class="text-2xl font-bold text-gray-900">{{ userCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 在线用户列表 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">在线用户列表</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户信息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                角色
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登录时间
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最后活动
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP地址
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                <div class="flex items-center justify-center">
                  <RefreshCw class="h-5 w-5 animate-spin mr-2" />
                  加载中...
                </div>
              </td>
            </tr>
            <tr v-else-if="onlineUsers.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                暂无在线用户
              </td>
            </tr>
            <tr v-else v-for="user in onlineUsers" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User class="h-4 w-4 text-gray-600" />
                  </div>
                  <div class="ml-3">
                    <div class="text-sm font-medium text-gray-900">{{ user.username }}</div>
                    <div class="text-sm text-gray-500">ID: {{ user.id }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="getRoleBadgeClass(user.role)"
                >
                  {{ getRoleDisplayName(user.role) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ user.loginTime ? formatDateTime(user.loginTime) : formatDateTime(user.lastActivity) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDateTime(user.lastActivity) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ user.ipAddress || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="showForceLogoutDialog(user)"
                  class="text-red-600 hover:text-red-900 mr-3"
                  title="强制下线"
                >
                  <LogOut class="h-4 w-4" />
                </button>
                <button
                  @click="showUserDetails(user)"
                  class="text-indigo-600 hover:text-indigo-900"
                  title="查看详情"
                >
                  <Eye class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 强制下线确认对话框 -->
    <div v-if="showLogoutDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3 text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <AlertTriangle class="h-6 w-6 text-red-600" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 mt-4">确认强制下线</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500">
              确定要强制用户 <strong>{{ selectedUser?.username }}</strong> 下线吗？
            </p>
            <p class="text-xs text-gray-400 mt-2">
              该用户将被立即踢出系统，需要重新登录。
            </p>
          </div>
          <div class="flex items-center justify-center space-x-3 mt-4">
            <button
              @click="closeLogoutDialog"
              class="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              取消
            </button>
            <button
              @click="confirmForceLogout"
              :disabled="logoutLoading"
              class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              <span v-if="logoutLoading">处理中...</span>
              <span v-else>确认下线</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户详情对话框 -->
    <div v-if="showDetailsDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">用户详情</h3>
            <button @click="closeDetailsDialog" class="text-gray-400 hover:text-gray-600">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="mt-4 space-y-3" v-if="selectedUser">
            <div>
              <label class="text-sm font-medium text-gray-600">用户名</label>
              <p class="text-sm text-gray-900">{{ selectedUser.username }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">用户ID</label>
              <p class="text-sm text-gray-900">{{ selectedUser.id }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">角色</label>
              <p class="text-sm text-gray-900">{{ getRoleDisplayName(selectedUser.role) }}</p>
            </div>
            <div v-if="selectedUser.email">
              <label class="text-sm font-medium text-gray-600">邮箱</label>
              <p class="text-sm text-gray-900">{{ selectedUser.email }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">登录时间</label>
              <p class="text-sm text-gray-900">{{ selectedUser.loginTime ? formatDateTime(selectedUser.loginTime) : formatDateTime(selectedUser.lastActivity) }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">最后活动</label>
              <p class="text-sm text-gray-900">{{ formatDateTime(selectedUser.lastActivity) }}</p>
            </div>
            <div v-if="selectedUser.onlineDuration !== undefined">
              <label class="text-sm font-medium text-gray-600">在线时长</label>
              <p class="text-sm text-gray-900">{{ selectedUser.onlineDuration }} 分钟</p>
            </div>
            <div v-if="selectedUser.ipAddress">
              <label class="text-sm font-medium text-gray-600">IP地址</label>
              <p class="text-sm text-gray-900">{{ selectedUser.ipAddress }}</p>
            </div>
            <div v-if="selectedUser.userAgent">
              <label class="text-sm font-medium text-gray-600">用户代理</label>
              <p class="text-sm text-gray-900 break-all">{{ selectedUser.userAgent }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { monitoringApi, type OnlineUser } from '@/api/monitoring'
import {
  AlertTriangle,
  Eye,
  LogOut,
  RefreshCw,
  Shield,
  User,
  UserCheck,
  Users,
  X
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'

// 响应式数据
const loading = ref(false)
const logoutLoading = ref(false)
const onlineUsers = ref<OnlineUser[]>([])
const selectedUser = ref<OnlineUser | null>(null)
const showLogoutDialog = ref(false)
const showDetailsDialog = ref(false)

// 定时器
let refreshTimer: NodeJS.Timeout | null = null

// 计算属性
const adminCount = computed(() => {
  if (!Array.isArray(onlineUsers.value)) return 0
  return onlineUsers.value.filter(user => user.role === 'admin' || user.role === 'super_admin').length
})

const agentCount = computed(() => {
  if (!Array.isArray(onlineUsers.value)) return 0
  return onlineUsers.value.filter(user => user.role === 'agent').length
})

const userCount = computed(() => {
  if (!Array.isArray(onlineUsers.value)) return 0
  return onlineUsers.value.filter(user => user.role === 'user').length
})

// 获取在线用户数据
const fetchOnlineUsers = async () => {
  try {
    loading.value = true
    const response = await monitoringApi.getOnlineUsers()
    
    if (response.success && response.data) {
      // 检查数据结构：后端返回 { users: [], pagination: {} }
      if (response.data.users && Array.isArray(response.data.users)) {
        onlineUsers.value = response.data.users
      } else if (Array.isArray(response.data)) {
        // 向后兼容：如果直接返回数组
        onlineUsers.value = response.data
      } else {
        console.warn('在线用户数据格式不正确:', response.data)
        onlineUsers.value = []
      }
    } else {
      onlineUsers.value = []
    }
  } catch (error) {
    console.error('获取在线用户失败:', error)
    onlineUsers.value = []
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  fetchOnlineUsers()
}

// 显示强制下线对话框
const showForceLogoutDialog = (user: OnlineUser) => {
  selectedUser.value = user
  showLogoutDialog.value = true
}

// 关闭强制下线对话框
const closeLogoutDialog = () => {
  showLogoutDialog.value = false
  selectedUser.value = null
}

// 确认强制下线
const confirmForceLogout = async () => {
  if (!selectedUser.value) return
  
  try {
    logoutLoading.value = true
    const response = await monitoringApi.forceLogout(selectedUser.value.id)
    
    if (response.success) {
      // 从列表中移除该用户
      onlineUsers.value = onlineUsers.value.filter(user => user.id !== selectedUser.value?.id)
      closeLogoutDialog()
    }
  } catch (error) {
    console.error('强制下线失败:', error)
  } finally {
    logoutLoading.value = false
  }
}

// 显示用户详情
const showUserDetails = (user: OnlineUser) => {
  selectedUser.value = user
  showDetailsDialog.value = true
}

// 关闭用户详情对话框
const closeDetailsDialog = () => {
  showDetailsDialog.value = false
  selectedUser.value = null
}

// 获取角色显示名称
const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'super_admin': '超级管理员',
    'admin': '管理员',
    'agent': '代理商',
    'user': '普通用户'
  }
  return roleMap[role] || role
}

// 获取角色徽章样式
const getRoleBadgeClass = (role: string): string => {
  const classMap: Record<string, string> = {
    'super_admin': 'bg-red-100 text-red-800',
    'admin': 'bg-blue-100 text-blue-800',
    'agent': 'bg-purple-100 text-purple-800',
    'user': 'bg-gray-100 text-gray-800'
  }
  return classMap[role] || 'bg-gray-100 text-gray-800'
}

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  fetchOnlineUsers()
  
  // 设置定时刷新（每30秒）
  refreshTimer = setInterval(() => {
    fetchOnlineUsers()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>