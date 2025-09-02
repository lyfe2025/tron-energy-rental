<template>
  <div class="page-header mb-6">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-purple-100 rounded-lg">
        <UserCheck class="w-6 h-6 text-purple-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">管理员管理</h1>
        <p class="text-sm text-gray-500">管理管理员的角色分配和权限配置</p>
      </div>
    </div>
    
    <!-- 统计信息 -->
    <div v-if="stats" class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-lg p-4 border border-gray-200">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <User class="w-5 h-5 text-blue-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-600">总管理员</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.totalAdmins }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg p-4 border border-gray-200">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <Shield class="w-5 h-5 text-green-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-600">活跃角色</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.totalRoles }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg p-4 border border-gray-200">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 rounded-lg">
            <Key class="w-5 h-5 text-yellow-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-600">角色分配</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.totalAssignments }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg p-4 border border-gray-200">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <RefreshCw class="w-5 h-5 text-purple-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-600">近期操作</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.recentAssignments }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Key, RefreshCw, Shield, User, UserCheck } from 'lucide-vue-next'

interface Stats {
  totalAdmins: number
  totalRoles: number
  totalAssignments: number
  recentAssignments: number
}

interface Props {
  stats?: Stats
}

defineProps<Props>()
</script>

<style scoped>
/* 页面头部特定样式 */
</style>
