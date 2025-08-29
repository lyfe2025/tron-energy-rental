<template>
  <div class="bg-white rounded-lg shadow-sm">
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
      <span class="ml-2 text-gray-600">加载中...</span>
    </div>
    
    <div v-else-if="paginatedUsers.length > 0">
      <!-- 桌面端表格 -->
      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  :checked="selectAll"
                  @change="$emit('toggle-select-all')"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户信息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telegram ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登录类型
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户角色
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                USDT余额
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                TRX余额
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                注册时间
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最后登录
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="user in paginatedUsers" 
              :key="user.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  :checked="selectedUsers.includes(user.id)"
                  @change="$emit('toggle-user-select', user.id)"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User class="h-5 w-5 text-indigo-600" />
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ user.username || user.email }}</div>
                    <div class="text-sm text-gray-500">{{ user.email }}</div>
                    <div v-if="user.phone" class="text-sm text-gray-500">{{ user.phone }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ user.telegram_id || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    getTypeColor(user.login_type)
                  ]"
                >
                  {{ getTypeText(user.login_type) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    getTypeColor(user.user_type)
                  ]"
                >
                  {{ getUserTypeText(user.user_type) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    getStatusColor(user.status)
                  ]"
                >
                  {{ getStatusText(user.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatCurrency(Number(user.usdt_balance) || 0) }} USDT
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatCurrency(Number(user.trx_balance) || 0) }} TRX
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDateTime(user.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ user.last_login ? formatDateTime(user.last_login) : '从未登录' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex items-center space-x-2">
                  <button
                    @click="$emit('view-user', user)"
                    class="text-indigo-600 hover:text-indigo-900"
                    title="查看详情"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    @click="$emit('edit-user', user)"
                    class="text-green-600 hover:text-green-900"
                    title="编辑"
                  >
                    <Edit class="h-4 w-4" />
                  </button>
                  <!-- 移除停用/启用按钮，现在只使用封禁功能 -->
                  <div class="relative">
                    <button
                      @click="$emit('toggle-user-menu', user.id)"
                      class="text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical class="h-4 w-4" />
                    </button>
                    <div 
                      v-if="showUserMenu === user.id"
                      class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                    >
                      <div class="py-1">
                        <button
                          @click="$emit('reset-password', user)"
                          class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Key class="h-4 w-4 mr-2 inline" />
                          重置密码
                        </button>
                        <button
                          @click="$emit('adjust-balance', user)"
                          class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <DollarSign class="h-4 w-4 mr-2 inline" />
                          调整余额
                        </button>
                        <button
                          @click="$emit('view-user-orders', user)"
                          class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <ShoppingCart class="h-4 w-4 mr-2 inline" />
                          查看订单
                        </button>
                        <button
                          @click="$emit('ban-user', user)"
                          class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          <Ban class="h-4 w-4 mr-2 inline" />
                          封禁用户
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 移动端卡片 -->
      <div class="md:hidden space-y-4 p-4">
        <div 
          v-for="user in paginatedUsers" 
          :key="user.id"
          class="border border-gray-200 rounded-lg p-4"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <input
                type="checkbox"
                :checked="selectedUsers.includes(user.id)"
                @change="$emit('toggle-user-select', user.id)"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
              />
              <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <User class="h-5 w-5 text-indigo-600" />
              </div>
              <div class="ml-3">
                <div class="text-sm font-medium text-gray-900">{{ user.username }}</div>
                <div class="text-sm text-gray-500">{{ user.email }}</div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span 
                :class="[
                  'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                  getStatusColor(user.status)
                ]"
              >
                {{ getStatusText(user.status) }}
              </span>
              <button
                @click="$emit('toggle-user-menu', user.id)"
                class="text-gray-400 hover:text-gray-600"
              >
                <MoreVertical class="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-gray-500">Telegram ID:</span>
              <span class="ml-1 font-medium">{{ user.telegram_id || '-' }}</span>
            </div>
            <div>
              <span class="text-gray-500">登录类型:</span>
              <span class="ml-1 font-medium">{{ getTypeText(user.login_type) }}</span>
            </div>
            <div>
              <span class="text-gray-500">用户角色:</span>
              <span class="ml-1 font-medium">{{ getUserTypeText(user.user_type) }}</span>
            </div>
            <div>
              <span class="text-gray-500">USDT余额:</span>
              <span class="ml-1 font-medium">{{ formatCurrency(Number(user.usdt_balance) || 0) }} USDT</span>
            </div>
            <div>
              <span class="text-gray-500">TRX余额:</span>
              <span class="ml-1 font-medium">{{ formatCurrency(Number(user.trx_balance) || 0) }} TRX</span>
            </div>
            <div>
              <span class="text-gray-500">注册:</span>
              <span class="ml-1">{{ formatDate(user.created_at) }}</span>
            </div>
            <div>
              <span class="text-gray-500">登录:</span>
              <span class="ml-1">{{ user.last_login ? formatDate(user.last_login) : '从未' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 分页 -->
      <div class="px-6 py-4 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-700">
            显示 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, totalUsers) }} 条，
            共 {{ totalUsers }} 条记录
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click="$emit('page-change', currentPage - 1)"
              :disabled="currentPage === 1"
              class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span class="px-3 py-1 text-sm text-gray-700">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              @click="$emit('page-change', currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center py-12">
      <Users class="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无用户数据</h3>
      <p class="text-gray-500 mb-4">系统中还没有注册用户</p>
      <button
        @click="$emit('create-user')"
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
      >
        <UserPlus class="h-4 w-4 mr-2" />
        添加用户
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
    Ban,
    DollarSign,
    Edit,
    Eye,
    Key,
    Loader2,
    MoreVertical,
    ShoppingCart,
    User,
    UserPlus,
    Users
} from 'lucide-vue-next'
import type { User as UserType } from '../types/user.types'

interface Props {
  isLoading: boolean
  paginatedUsers: UserType[]
  selectedUsers: string[]
  selectAll: boolean
  showUserMenu: string
  currentPage: number
  pageSize: number
  totalUsers: number
  totalPages: number
  formatDateTime: (date: string) => string
  formatDate: (date: string) => string
  formatCurrency: (amount: number) => string
  getTypeText: (type: string) => string
  getTypeColor: (type: string) => string
  getUserTypeText: (userType: string) => string
  getStatusText: (status: string) => string
  getStatusColor: (status: string) => string
}

interface Emits {
  'toggle-select-all': []
  'toggle-user-select': [userId: string]
  'view-user': [user: UserType]
  'edit-user': [user: UserType]
  'toggle-user-menu': [userId: string]
  'reset-password': [user: UserType]
  'adjust-balance': [user: UserType]
  'view-user-orders': [user: UserType]
  'ban-user': [user: UserType]
  'page-change': [page: number]
  'create-user': []
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
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
</style>