<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">日志管理</h1>
        <p class="text-gray-600 mt-2">系统日志管理，包含登录日志和操作日志的查看与管理</p>
      </div>
    </div>

    <!-- 统计数据 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-blue-100">
            <User class="w-6 h-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-gray-900">{{ displayStats.todayLogins }}</div>
            <div class="text-sm text-gray-600">今日登录次数</div>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-green-100">
            <Activity class="w-6 h-6 text-green-600" />
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-gray-900">{{ displayStats.todayOperations }}</div>
            <div class="text-sm text-gray-600">今日操作次数</div>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-purple-100">
            <Users class="w-6 h-6 text-purple-600" />
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-gray-900">{{ displayStats.onlineUsers }}</div>
            <div class="text-sm text-gray-600">在线用户数</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签页导航 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <nav class="flex space-x-8 border-b border-gray-200">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <component :is="tab.icon" class="w-5 h-5 mr-2" />
          {{ tab.name }}
        </button>
      </nav>
      
      <!-- 标签页内容 -->
      <div class="mt-6">
        <!-- 登录日志 -->
        <LoginLogs v-if="activeTab === 'login'" />
        
        <!-- 操作日志 -->
        <OperationLogs v-if="activeTab === 'operation'" />
        
        <!-- 系统日志 -->
        <SystemLogs v-if="activeTab === 'system'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Activity, User, Users, FileText } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'

// 导入子组件
import LoginLogs from './Login/index.vue'
import OperationLogs from './Operation/index.vue'
import SystemLogs from './SystemLogs.vue'

// 导入统计数据hooks
import { useLogs } from './composables/useLogs'
// 导入监控API
import { monitoringApi } from '@/api/monitoring'

// 标签页配置
const activeTab = ref('login')
const tabs = [
  {
    id: 'login',
    name: '登录日志',
    icon: User
  },
  {
    id: 'operation',
    name: '操作日志',
    icon: Activity
  },
  {
    id: 'system',
    name: '系统日志',
    icon: FileText
  }
]

// 使用统计数据hooks
const { stats, statsLoading, statsError, loadStats } = useLogs()

// 在线用户数
const onlineUsersCount = ref(0)

// 计算展示数据
const displayStats = ref({
  todayLogins: 0,
  todayOperations: 0,
  onlineUsers: 0
})

// 获取在线用户数
const fetchOnlineUsers = async () => {
  try {
    const response = await monitoringApi.getOverview()
    if (response.success && response.data) {
      onlineUsersCount.value = response.data.onlineUsers || 0
    }
  } catch (error) {
    console.error('获取在线用户数失败:', error)
    onlineUsersCount.value = 0
  }
}

// 更新展示数据
const updateDisplayStats = () => {
  if (stats.value) {
    // 使用any类型处理后端实际返回的数据结构
    const data = stats.value as any
    displayStats.value = {
      todayLogins: parseInt(data.login_logs?.today || '0'),
      todayOperations: parseInt(data.operation_logs?.today || '0'),
      onlineUsers: onlineUsersCount.value
    }
  }
}

// 监听stats变化
watch(stats, updateDisplayStats, { immediate: true })

// 监听在线用户数变化
watch(onlineUsersCount, () => {
  displayStats.value.onlineUsers = onlineUsersCount.value
})

// 组件挂载时获取数据
onMounted(async () => {
  await Promise.all([
    loadStats(),
    fetchOnlineUsers()
  ])
})
</script>

<style scoped>
/* 无需自定义样式，使用统一的卡片布局 */
</style>