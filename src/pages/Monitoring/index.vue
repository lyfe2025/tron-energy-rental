<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">监控中心</h1>
      <p class="text-gray-600">实时监控系统运行状态，管理在线用户和定时任务</p>
    </div>

    <!-- 快速导航卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- 监控概览 -->
      <router-link
        to="/monitoring/overview"
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-indigo-300"
      >
        <div class="flex items-center space-x-4">
          <div class="bg-indigo-100 p-3 rounded-lg">
            <BarChart3 class="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">监控概览</h3>
            <p class="text-gray-600 text-sm">查看系统整体运行状态</p>
          </div>
        </div>
      </router-link>

      <!-- 在线用户 -->
      <router-link
        to="/monitoring/online-users"
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-green-300"
      >
        <div class="flex items-center space-x-4">
          <div class="bg-green-100 p-3 rounded-lg">
            <Users class="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">在线用户</h3>
            <p class="text-gray-600 text-sm">管理当前在线用户</p>
          </div>
        </div>
      </router-link>

      <!-- 定时任务 -->
      <router-link
        to="/monitoring/scheduled-tasks"
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
      >
        <div class="flex items-center space-x-4">
          <div class="bg-blue-100 p-3 rounded-lg">
            <Clock class="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">定时任务</h3>
            <p class="text-gray-600 text-sm">管理系统定时任务</p>
          </div>
        </div>
      </router-link>

      <!-- 数据监控 -->
      <router-link
        to="/monitoring/database"
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-purple-300"
      >
        <div class="flex items-center space-x-4">
          <div class="bg-purple-100 p-3 rounded-lg">
            <Database class="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">数据监控</h3>
            <p class="text-gray-600 text-sm">监控数据库运行状态</p>
          </div>
        </div>
      </router-link>

      <!-- 服务状态 -->
      <router-link
        to="/monitoring/service-status"
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-orange-300"
      >
        <div class="flex items-center space-x-4">
          <div class="bg-orange-100 p-3 rounded-lg">
            <Server class="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">服务状态</h3>
            <p class="text-gray-600 text-sm">监控各项服务运行状态</p>
          </div>
        </div>
      </router-link>

      <!-- 缓存状态 -->
      <router-link
        to="/monitoring/cache-status"
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-red-300"
      >
        <div class="flex items-center space-x-4">
          <div class="bg-red-100 p-3 rounded-lg">
            <HardDrive class="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">缓存状态</h3>
            <p class="text-gray-600 text-sm">监控缓存系统状态</p>
          </div>
        </div>
      </router-link>
    </div>

    <!-- 系统状态概览 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">系统状态概览</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-green-600">正常</div>
          <div class="text-sm text-gray-600">系统状态</div>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-blue-600">{{ onlineUsers }}</div>
          <div class="text-sm text-gray-600">在线用户</div>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-purple-600">{{ runningTasks }}</div>
          <div class="text-sm text-gray-600">运行任务</div>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl font-bold text-orange-600">{{ systemLoad }}</div>
          <div class="text-sm text-gray-600">系统负载</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BarChart3, Clock, Database, HardDrive, Server, Users } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { monitoringApi } from '@/api/monitoring'

// 响应式数据
const onlineUsers = ref(0)
const runningTasks = ref(0)
const systemLoad = ref('0%')

// 获取系统概览数据
const fetchOverviewData = async () => {
  try {
    const response = await monitoringApi.getOverview()
    if (response.success) {
      onlineUsers.value = response.data.onlineUsers || 0
      runningTasks.value = response.data.runningTasks || 0
      systemLoad.value = response.data.systemLoad || '0%'
    }
  } catch (error) {
    console.error('获取概览数据失败:', error)
  }
}

// 生命周期
onMounted(() => {
  fetchOverviewData()
})
</script>