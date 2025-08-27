<template>
  <div class="space-y-6">
    <!-- 页面头部 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">用户管理</h1>
        <p class="mt-1 text-sm text-gray-500">管理TRON能量租赁系统的用户账户和权限</p>
      </div>
      <div class="mt-4 sm:mt-0 flex space-x-3">
        <button
          @click="refreshUsers"
          :disabled="isLoading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': isLoading }]" />
          刷新
        </button>
        <button
          @click="showCreateUserModal"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <UserPlus class="h-4 w-4 mr-2" />
          添加用户
        </button>
      </div>
    </div>

    <!-- 用户统计 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div 
        v-for="stat in userStats" 
        :key="stat.label"
        class="bg-white rounded-lg shadow-sm p-6"
      >
        <div class="flex items-center">
          <div :class="['h-12 w-12 rounded-lg flex items-center justify-center', stat.bgColor]">
            <component :is="stat.icon" :class="['h-6 w-6', stat.iconColor]" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
            <p v-if="stat.change" :class="['text-sm', stat.changeColor]">{{ stat.change }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
        <div class="flex-1 max-w-lg">
          <div class="relative">
            <Search class="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索用户名、邮箱或电话"
              class="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          <select
            v-model="statusFilter"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">所有状态</option>
            <option value="active">活跃</option>
            <option value="inactive">停用</option>
            <option value="banned">封禁</option>
          </select>
          
          <select
            v-model="roleFilter"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">所有角色</option>
            <option value="admin">管理员</option>
            <option value="agent">代理商</option>
            <option value="user">普通用户</option>
          </select>
          
          <button
            @click="exportUsers"
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download class="h-4 w-4 mr-2" />
            导出
          </button>
        </div>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
        <span class="ml-2 text-gray-600">加载中...</span>
      </div>
      
      <div v-else-if="filteredUsers.length > 0">
        <!-- 桌面端表格 -->
        <div class="hidden md:block overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    v-model="selectAll"
                    @change="toggleSelectAll"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户信息
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  余额
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
                    v-model="selectedUsers"
                    :value="user.id"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User class="h-5 w-5 text-indigo-600" />
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ user.username }}</div>
                      <div class="text-sm text-gray-500">{{ user.email }}</div>
                      <div v-if="user.phone" class="text-sm text-gray-500">{{ user.phone }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      getRoleColor(user.role)
                    ]"
                  >
                    {{ getRoleText(user.role) }}
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
                  {{ formatCurrency(user.balance) }} TRX
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
                      @click="viewUser(user)"
                      class="text-indigo-600 hover:text-indigo-900"
                      title="查看详情"
                    >
                      <Eye class="h-4 w-4" />
                    </button>
                    <button
                      @click="editUser(user)"
                      class="text-green-600 hover:text-green-900"
                      title="编辑"
                    >
                      <Edit class="h-4 w-4" />
                    </button>
                    <button
                      @click="toggleUserStatus(user)"
                      :class="[
                        'hover:opacity-75',
                        user.status === 'active' ? 'text-red-600' : 'text-green-600'
                      ]"
                      :title="user.status === 'active' ? '停用' : '启用'"
                    >
                      <Power class="h-4 w-4" />
                    </button>
                    <div class="relative">
                      <button
                        @click="toggleUserMenu(user.id)"
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
                            @click="resetPassword(user)"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Key class="h-4 w-4 mr-2 inline" />
                            重置密码
                          </button>
                          <button
                            @click="adjustBalance(user)"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <DollarSign class="h-4 w-4 mr-2 inline" />
                            调整余额
                          </button>
                          <button
                            @click="viewUserOrders(user)"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <ShoppingCart class="h-4 w-4 mr-2 inline" />
                            查看订单
                          </button>
                          <button
                            @click="banUser(user)"
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
                  v-model="selectedUsers"
                  :value="user.id"
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
                  @click="toggleUserMenu(user.id)"
                  class="text-gray-400 hover:text-gray-600"
                >
                  <MoreVertical class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-gray-500">角色:</span>
                <span class="ml-1 font-medium">{{ getRoleText(user.role) }}</span>
              </div>
              <div>
                <span class="text-gray-500">余额:</span>
                <span class="ml-1 font-medium">{{ formatCurrency(user.balance) }} TRX</span>
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
              显示 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, filteredUsers.length) }} 条，
              共 {{ filteredUsers.length }} 条记录
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span class="px-3 py-1 text-sm text-gray-700">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                @click="currentPage++"
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
          @click="showCreateUserModal"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <UserPlus class="h-4 w-4 mr-2" />
          添加用户
        </button>
      </div>
    </div>

    <!-- 批量操作 -->
    <div 
      v-if="selectedUsers.length > 0"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
    >
      <div class="flex items-center space-x-4">
        <span class="text-sm text-gray-600">已选择 {{ selectedUsers.length }} 个用户</span>
        <div class="flex items-center space-x-2">
          <button
            @click="batchActivate"
            class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            批量启用
          </button>
          <button
            @click="batchDeactivate"
            class="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            批量停用
          </button>
          <button
            @click="batchExport"
            class="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            导出选中
          </button>
          <button
            @click="clearSelection"
            class="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
          >
            取消选择
          </button>
        </div>
      </div>
    </div>

    <!-- 用户详情模态框 -->
    <div 
      v-if="showUserModal" 
      class="fixed inset-0 z-50 overflow-y-auto"
      @click="closeUserModal"
    >
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>
        <div 
          class="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg"
          @click.stop
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-medium text-gray-900">
              {{ modalMode === 'view' ? '用户详情' : (modalMode === 'edit' ? '编辑用户' : '添加用户') }}
            </h3>
            <button
              @click="closeUserModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <X class="h-6 w-6" />
            </button>
          </div>
          
          <div v-if="modalMode === 'view' && selectedUser" class="space-y-6">
            <!-- 用户基本信息 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="text-sm font-medium text-gray-900 mb-3">基本信息</h4>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">用户名:</span>
                    <span class="text-sm font-medium text-gray-900">{{ selectedUser.username }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">邮箱:</span>
                    <span class="text-sm font-medium text-gray-900">{{ selectedUser.email }}</span>
                  </div>
                  <div v-if="selectedUser.phone" class="flex justify-between">
                    <span class="text-sm text-gray-500">电话:</span>
                    <span class="text-sm font-medium text-gray-900">{{ selectedUser.phone }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">角色:</span>
                    <span class="text-sm font-medium text-gray-900">{{ getRoleText(selectedUser.role) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">状态:</span>
                    <span 
                      :class="[
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getStatusColor(selectedUser.status)
                      ]"
                    >
                      {{ getStatusText(selectedUser.status) }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 class="text-sm font-medium text-gray-900 mb-3">账户信息</h4>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">余额:</span>
                    <span class="text-sm font-medium text-gray-900">{{ formatCurrency(selectedUser.balance) }} TRX</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">注册时间:</span>
                    <span class="text-sm font-medium text-gray-900">{{ formatDateTime(selectedUser.created_at) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">最后登录:</span>
                    <span class="text-sm font-medium text-gray-900">
                      {{ selectedUser.last_login ? formatDateTime(selectedUser.last_login) : '从未登录' }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">登录次数:</span>
                    <span class="text-sm font-medium text-gray-900">{{ selectedUser.login_count || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                @click="editUser(selectedUser)"
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                编辑用户
              </button>
              <button
                @click="resetPassword(selectedUser)"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                重置密码
              </button>
            </div>
          </div>
          
          <form v-else-if="modalMode === 'edit' || modalMode === 'create'" @submit.prevent="saveUser">
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                  <input
                    v-model="userForm.username"
                    type="text"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="请输入用户名"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                  <input
                    v-model="userForm.email"
                    type="email"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="请输入邮箱"
                  />
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">电话</label>
                  <input
                    v-model="userForm.phone"
                    type="tel"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="请输入电话号码"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">角色</label>
                  <select
                    v-model="userForm.role"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="user">普通用户</option>
                    <option value="agent">代理商</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
              </div>
              
              <div v-if="modalMode === 'create'">
                <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
                <input
                  v-model="userForm.password"
                  type="password"
                  required
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="请输入密码"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">初始余额 (TRX)</label>
                <input
                  v-model.number="userForm.balance"
                  type="number"
                  step="0.01"
                  min="0"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>
              
              <div class="flex items-center">
                <input
                  v-model="userForm.is_active"
                  type="checkbox"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label class="ml-2 block text-sm text-gray-900">
                  启用用户
                </label>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="closeUserModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Loader2 v-if="isSaving" class="animate-spin h-4 w-4 mr-2" />
                {{ isSaving ? '保存中...' : (modalMode === 'edit' ? '更新' : '创建') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usersAPI } from '@/services/api'
import type { User as UserType } from '@/types/api'
import {
  Activity,
  Ban,
  DollarSign,
  Download,
  Edit,
  Eye,
  Key,
  Loader2,
  MoreVertical,
  Power,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

// 响应式数据
const isLoading = ref(false)
const isSaving = ref(false)
const searchQuery = ref('')
const statusFilter = ref<'active' | 'inactive' | 'banned' | ''>('')
const roleFilter = ref<'admin' | 'agent' | 'user' | ''>('')
const currentPage = ref(1)
const pageSize = ref(10)
const selectAll = ref(false)
const selectedUsers = ref<string[]>([])
const showUserMenu = ref('')
const showUserModal = ref(false)
const modalMode = ref<'view' | 'edit' | 'create'>('view')
const selectedUser = ref<UserType | null>(null)

// 数据
const users = ref<UserType[]>([])

// 用户统计
const userStats = ref([
  {
    label: '总用户数',
    value: 0,
    icon: Users,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    change: null,
    changeColor: ''
  },
  {
    label: '活跃用户',
    value: 0,
    icon: UserCheck,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    change: null,
    changeColor: ''
  },
  {
    label: '新增用户',
    value: 0,
    icon: TrendingUp,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    change: '+12%',
    changeColor: 'text-green-600'
  },
  {
    label: '在线用户',
    value: 0,
    icon: Activity,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    change: null,
    changeColor: ''
  }
])

// 用户表单
const userForm = reactive({
  username: '',
  email: '',
  phone: '',
  role: 'user' as 'admin' | 'agent' | 'user',
  password: '',
  balance: 0,
  is_active: true
})

// 计算属性
const filteredUsers = computed(() => {
  let filtered = users.value
  
  // 搜索过滤
  if (searchQuery.value.trim()) {
    const search = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user => 
      user.username.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      (user.phone && user.phone.includes(search))
    )
  }
  
  // 状态过滤
  if (statusFilter.value) {
    filtered = filtered.filter(user => user.status === statusFilter.value)
  }
  
  // 角色过滤
  if (roleFilter.value) {
    filtered = filtered.filter(user => user.role === roleFilter.value)
  }
  
  return filtered
})

const totalPages = computed(() => {
  return Math.ceil(filteredUsers.value.length / pageSize.value)
})

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredUsers.value.slice(start, end)
})

// 方法
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    admin: '管理员',
    agent: '代理商',
    user: '普通用户'
  }
  return roleMap[role] || role
}

const getRoleColor = (role: string) => {
  const colorMap: Record<string, string> = {
    admin: 'bg-red-100 text-red-800',
    agent: 'bg-purple-100 text-purple-800',
    user: 'bg-blue-100 text-blue-800'
  }
  return colorMap[role] || 'bg-gray-100 text-gray-800'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    active: '活跃',
    inactive: '停用',
    banned: '封禁'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    banned: 'bg-red-100 text-red-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

// 加载用户数据
const loadUsers = async () => {
  try {
    isLoading.value = true
    
    const response = await usersAPI.getUsers({
      page: 1,
      limit: 1000 // 加载所有用户用于前端分页和搜索
    })
    
    if (response.data.success) {
      // 修复类型错误：response.data.data 是分页响应对象，需要访问 items 属性
      users.value = response.data.data?.items || []
      updateUserStats()
    }
  } catch (error) {
    console.error('加载用户数据失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 更新用户统计
const updateUserStats = () => {
  const totalUsers = users.value.length
  const activeUsers = users.value.filter(u => u.status === 'active').length
  
  // 计算本月新增用户
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)
  const newUsers = users.value.filter(u => new Date(u.created_at) >= thisMonth).length
  
  userStats.value[0].value = totalUsers
  userStats.value[1].value = activeUsers
  userStats.value[2].value = newUsers
  userStats.value[3].value = 0 // 暂时设为0，因为没有在线状态字段
}

// 刷新数据
const refreshUsers = () => {
  loadUsers()
}

// 用户操作
const viewUser = (user: any) => {
  selectedUser.value = user
  modalMode.value = 'view'
  showUserModal.value = true
  showUserMenu.value = ''
}

const editUser = (user: any) => {
  selectedUser.value = user
  modalMode.value = 'edit'
  Object.assign(userForm, {
    username: user.username,
    email: user.email,
    phone: user.phone || '',
    role: user.role as 'admin' | 'agent' | 'user',
    balance: user.balance,
    is_active: user.status === 'active'
  })
  showUserModal.value = true
  showUserMenu.value = ''
}

const showCreateUserModal = () => {
  selectedUser.value = null
  modalMode.value = 'create'
  resetUserForm()
  showUserModal.value = true
}

const closeUserModal = () => {
  showUserModal.value = false
  selectedUser.value = null
  resetUserForm()
}

const resetUserForm = () => {
  Object.assign(userForm, {
    username: '',
    email: '',
    phone: '',
    role: 'user' as 'admin' | 'agent' | 'user',
    password: '',
    balance: 0,
    is_active: true
  })
}

const saveUser = async () => {
  try {
    isSaving.value = true
    
    let response
    if (modalMode.value === 'edit' && selectedUser.value) {
      response = await usersAPI.updateUser(selectedUser.value.id, {
        username: userForm.username,
        email: userForm.email,
        phone: userForm.phone,
        role: userForm.role,
        balance: userForm.balance,
        status: userForm.is_active ? 'active' : 'inactive'
      })
    } else {
      response = await usersAPI.createUser({
        username: userForm.username,
        email: userForm.email,
        phone: userForm.phone,
        role: userForm.role,
        password: userForm.password,
        balance: userForm.balance,
        status: userForm.is_active ? 'active' : 'inactive'
      })
    }
    
    if (response.data.success) {
      await loadUsers()
      closeUserModal()
    }
  } catch (error) {
    console.error('保存用户失败:', error)
  } finally {
    isSaving.value = false
  }
}

const toggleUserStatus = async (user: any) => {
  try {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    const response = await usersAPI.updateUser(user.id, { status: newStatus })
    
    if (response.data.success) {
      user.status = newStatus
      updateUserStats()
    }
  } catch (error) {
    console.error('更新用户状态失败:', error)
  }
  
  showUserMenu.value = ''
}

const resetPassword = async (user: any) => {
  if (!confirm(`确定要重置用户 "${user.username}" 的密码吗？`)) {
    return
  }
  
  try {
    const response = await usersAPI.resetPassword(user.id)
    
    if (response.data.success) {
      alert(`密码重置成功，新密码：${response.data.data.new_password}`)
    }
  } catch (error) {
    console.error('重置密码失败:', error)
  }
  
  showUserMenu.value = ''
}

const adjustBalance = (user: any) => {
  const amount = prompt(`请输入要调整的金额（当前余额：${user.balance} TRX）：`)
  if (amount === null) return
  
  const adjustAmount = parseFloat(amount)
  if (isNaN(adjustAmount)) {
    alert('请输入有效的数字')
    return
  }
  
  // TODO: 实现余额调整API调用
  console.log('调整用户余额:', user.id, adjustAmount)
  showUserMenu.value = ''
}

const viewUserOrders = (user: any) => {
  // TODO: 跳转到用户订单页面
  console.log('查看用户订单:', user.id)
  showUserMenu.value = ''
}

const banUser = async (user: any) => {
  if (!confirm(`确定要封禁用户 "${user.username}" 吗？`)) {
    return
  }
  
  try {
    const response = await usersAPI.updateUser(user.id, { status: 'banned' })
    
    if (response.data.success) {
      user.status = 'banned'
      updateUserStats()
    }
  } catch (error) {
    console.error('封禁用户失败:', error)
  }
  
  showUserMenu.value = ''
}

const toggleUserMenu = (userId: string) => {
  showUserMenu.value = showUserMenu.value === userId ? '' : userId
}

// 批量操作
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedUsers.value = paginatedUsers.value.map(user => user.id)
  } else {
    selectedUsers.value = []
  }
}

const batchActivate = async () => {
  if (!confirm(`确定要启用选中的 ${selectedUsers.value.length} 个用户吗？`)) {
    return
  }
  
  try {
    await Promise.all(
      selectedUsers.value.map(userId => 
        usersAPI.updateUser(userId, { status: 'active' })
      )
    )
    
    await loadUsers()
    clearSelection()
  } catch (error) {
    console.error('批量启用失败:', error)
  }
}

const batchDeactivate = async () => {
  if (!confirm(`确定要停用选中的 ${selectedUsers.value.length} 个用户吗？`)) {
    return
  }
  
  try {
    await Promise.all(
      selectedUsers.value.map(userId => 
        usersAPI.updateUser(userId, { status: 'inactive' })
      )
    )
    
    await loadUsers()
    clearSelection()
  } catch (error) {
    console.error('批量停用失败:', error)
  }
}

const batchExport = () => {
  const selectedUserData = users.value.filter(user => selectedUsers.value.includes(user.id))
  exportUsersData(selectedUserData)
}

const clearSelection = () => {
  selectedUsers.value = []
  selectAll.value = false
}

// 导出功能
const exportUsers = () => {
  exportUsersData(filteredUsers.value)
}

const exportUsersData = (userData: any[]) => {
  const csvContent = [
    ['用户名', '邮箱', '电话', '角色', '状态', '余额', '注册时间', '最后登录'].join(','),
    ...userData.map(user => [
      user.username,
      user.email,
      user.phone || '',
      getRoleText(user.role),
      getStatusText(user.status),
      user.balance,
      formatDateTime(user.created_at),
      user.last_login ? formatDateTime(user.last_login) : '从未登录'
    ].join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `users_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

// 点击外部关闭菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showUserMenu.value = ''
  }
}

// 生命周期
onMounted(() => {
  loadUsers()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
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