<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <!-- 批量操作栏 -->
    <div v-if="selectedAdmins.length > 0" class="bg-blue-50 border-b border-blue-200 px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center text-sm text-blue-700">
          <Shield class="w-4 h-4 mr-2" />
          已选择 {{ selectedAdmins.length }} 个管理员
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="canAssignRoles"
            @click="$emit('batch-assign-roles')"
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Key class="w-3 h-3 mr-1" />
            批量分配角色
          </button>
          <button
            @click="clearSelection"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          >
            清空选择
          </button>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="relative px-6 py-3 text-left">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              管理员信息
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              岗位信息
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              角色分配
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              最后登录
            </th>
            <th scope="col" class="relative px-6 py-3">
              <span class="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="loading" class="text-center">
            <td colspan="7" class="px-6 py-12 text-sm text-gray-500">
              <div class="flex justify-center items-center">
                <RefreshCw class="w-5 h-5 mr-2 animate-spin" />
                加载中...
              </div>
            </td>
          </tr>
          <tr v-else-if="!adminRoles || adminRoles.length === 0" class="text-center">
            <td colspan="7" class="px-6 py-12 text-sm text-gray-500">
              <div class="flex flex-col items-center">
                <User class="w-12 h-12 text-gray-300 mb-4" />
                <p>暂无管理员数据</p>
              </div>
            </td>
          </tr>
          <tr
            v-else
            v-for="admin in adminRoles"
            :key="admin.admin_id"
            class="hover:bg-gray-50 transition-colors"
          >
            <!-- 选择框 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <input
                type="checkbox"
                :value="admin.admin_id"
                v-model="localSelectedAdmins"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </td>
            
            <!-- 管理员信息 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                  <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User class="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">{{ admin.username }}</div>
                  <div class="text-sm text-gray-500">{{ admin.email }}</div>
                  <div v-if="admin.name" class="text-xs text-gray-400">{{ admin.name }}</div>
                </div>
              </div>
            </td>
            
            <!-- 岗位信息 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ admin.department_name || '-' }}</div>
              <div class="text-sm text-gray-500">{{ admin.position_name || '-' }}</div>
            </td>
            
            <!-- 角色分配 -->
            <td class="px-6 py-4">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="role in admin.roles"
                  :key="role.id"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getRoleStatusClass(role.status)"
                >
                  {{ role.name }}
                </span>
                <span v-if="admin.roles?.length === 0" class="text-xs text-gray-400">
                  未分配角色
                </span>
              </div>
            </td>
            
            <!-- 状态 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                :class="getStatusClass(admin.status)"
              >
                {{ getStatusText(admin.status) }}
              </span>
            </td>
            
            <!-- 最后登录 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <div v-if="admin.last_login_at">
                {{ formatDateTime(admin.last_login_at) }}
              </div>
              <div v-else class="text-gray-400">从未登录</div>
            </td>
            
            <!-- 操作 -->
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="$emit('view-permissions', admin)"
                  class="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                  title="查看权限"
                >
                  <Shield class="w-4 h-4" />
                </button>
                <button
                  v-if="canAssignRoles"
                  @click="$emit('assign-roles', admin)"
                  class="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                  title="分配角色"
                >
                  <Key class="w-4 h-4" />
                </button>
                <button
                  v-if="canCreateAdmin"
                  @click="$emit('edit-admin', admin)"
                  class="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50"
                  title="编辑"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  v-if="canCreateAdmin"
                  @click="$emit('reset-password', admin)"
                  class="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                  title="重置密码"
                >
                  <RotateCcw class="w-4 h-4" />
                </button>
                <button
                  v-if="canCreateAdmin && admin.admin_id !== currentUserId"
                  @click="$emit('delete-admin', admin)"
                  class="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                  title="删除"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Edit, Key, RefreshCw, RotateCcw, Shield, Trash2, User } from 'lucide-vue-next'
import { computed } from 'vue'
import type { AdminRoleInfo } from '../../types'

interface Props {
  adminRoles: AdminRoleInfo[]
  selectedAdmins: string[]
  loading: boolean
  canAssignRoles: boolean
  canCreateAdmin: boolean
  currentUserId?: string
}

interface Emits {
  (e: 'update:selectedAdmins', value: string[]): void
  (e: 'view-permissions', admin: AdminRoleInfo): void
  (e: 'assign-roles', admin: AdminRoleInfo): void
  (e: 'edit-admin', admin: AdminRoleInfo): void
  (e: 'delete-admin', admin: AdminRoleInfo): void
  (e: 'reset-password', admin: AdminRoleInfo): void
  (e: 'batch-assign-roles'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地选择状态
const localSelectedAdmins = computed({
  get: () => props.selectedAdmins || [],
  set: (value) => emit('update:selectedAdmins', value)
})

// 全选状态
const isAllSelected = computed(() => {
  const adminRoles = props.adminRoles || []
  const selectedAdmins = props.selectedAdmins || []
  return adminRoles.length > 0 && selectedAdmins.length === adminRoles.length
})

// 全选/取消全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    emit('update:selectedAdmins', [])
  } else {
    const adminRoles = props.adminRoles || []
    emit('update:selectedAdmins', adminRoles.map(admin => admin.admin_id))
  }
}

// 清空选择
const clearSelection = () => {
  emit('update:selectedAdmins', [])
}

// 获取角色状态样式
const getRoleStatusClass = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-blue-100 text-blue-800'
  }
}

// 获取管理员状态样式
const getStatusClass = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-red-100 text-red-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return '正常'
    case 'inactive':
      return '禁用'
    case 'pending':
      return '待激活'
    default:
      return '未知'
  }
}

// 格式化时间
const formatDateTime = (dateTime: string) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}
</script>

<style scoped>
/* 表格特定样式 */
</style>
