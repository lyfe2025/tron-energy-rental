<template>
  <div class="admin-roles-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-purple-100 rounded-lg">
          <UserCheck class="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">管理员管理</h1>
          <p class="text-sm text-gray-500">管理管理员的角色分配和权限配置</p>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- 搜索和筛选 -->
        <div class="flex flex-col sm:flex-row gap-4 flex-1">
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索管理员用户名、邮箱..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keyup.enter="handleSearch"
            />
          </div>
          
          <select
            v-model="filterDepartment"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部岗位</option>
              <option
                v-for="pos in positionOptions"
                :key="pos.value"
                :value="pos.value"
              >
                {{ pos.label }}
              </option>
          </select>
          
          <select
            v-model="filterRole"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部角色</option>
            <option
              v-for="role in roleOptions"
              :key="role.value"
              :value="role.value"
            >
              {{ role.label }}
            </option>
          </select>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex gap-3">
          <button
            @click="handleSearch"
            class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Search class="w-4 h-4" />
            搜索
          </button>
          
          <button
            @click="handleRefresh"
            class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw class="w-4 h-4" />
            刷新
          </button>
          
          <button
            v-if="canCreateAdmin"
            @click="handleCreateAdmin"
            class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <UserPlus class="w-4 h-4" />
            新增管理员
          </button>
          
          <button
            @click="handleBatchAssign"
            :disabled="selectedAdmins.length === 0"
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <UserPlus class="w-4 h-4" />
            批量分配角色
          </button>
        </div>
      </div>
    </div>

    <!-- 管理员列表 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-gray-500">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>加载中...</span>
        </div>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-12">
        <div class="text-red-500 mb-2">加载失败</div>
        <button
          @click="handleRefresh"
          class="text-blue-600 hover:text-blue-700 underline"
        >
          重试
        </button>
      </div>
      
      <!-- 空状态 -->
      <div v-else-if="adminRoles.length === 0" class="flex flex-col items-center justify-center py-12">
        <UserCheck class="w-12 h-12 text-gray-400 mb-4" />
        <div class="text-gray-500 mb-2">暂无管理员数据</div>
      </div>
      
      <!-- 管理员表格 -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="w-12 px-6 py-3 text-left">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="handleSelectAll"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                管理员信息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                部门/岗位
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                当前角色
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
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
              v-for="adminRole in adminRoles"
              :key="adminRole.admin_id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4">
                <input
                  type="checkbox"
                  :checked="selectedAdmins.includes(adminRole.admin_id)"
                  @change="handleSelectAdmin(adminRole.admin_id)"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User class="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ adminRole.username }}</div>
                    <div class="text-sm text-gray-500">{{ adminRole.email }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ adminRole.department_name || '-' }}</div>
                  <div class="text-sm text-gray-500">{{ adminRole.position_name || '-' }}</div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="role in adminRole.roles"
                    :key="role.id"
                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                  >
                    {{ role.name }}
                  </span>
                  <span
                    v-if="adminRole.roles.length === 0"
                    class="text-sm text-gray-500"
                  >
                    未分配角色
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
                  :class="adminRole.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ adminRole.status === 'active' ? '正常' : '禁用' }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ adminRole.last_login_at ? formatDateTime(adminRole.last_login_at) : '从未登录' }}
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1">
                  <!-- 编辑按钮 -->
                  <button
                    @click="handleEditAdmin(adminRole)"
                    class="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="编辑管理员"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  
                  <!-- 分配角色按钮 -->
                  <button
                    @click="handleAssignRoles(adminRole)"
                    class="p-2 text-purple-600 hover:bg-purple-50 rounded"
                    title="分配角色"
                  >
                    <UserPlus class="w-4 h-4" />
                  </button>
                  
                  <!-- 查看权限按钮 -->
                  <button
                    @click="handleViewPermissions(adminRole)"
                    class="p-2 text-green-600 hover:bg-green-50 rounded"
                    title="查看权限"
                  >
                    <Shield class="w-4 h-4" />
                  </button>
                  
                  <!-- 重置密码按钮 -->
                  <button
                    @click="handleResetPassword(adminRole)"
                    class="p-2 text-orange-600 hover:bg-orange-50 rounded"
                    title="重置密码"
                  >
                    <Key class="w-4 h-4" />
                  </button>
                  
                  <!-- 删除按钮 -->
                  <button
                    @click="handleDeleteAdmin(adminRole)"
                    class="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="删除管理员"
                    :disabled="adminRole.admin_id === currentUserId"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 分页 -->
      <div v-if="pagination.total > 0" class="px-6 py-4 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">
            共 {{ pagination.total }} 条记录，第 {{ pagination.page }} / {{ pagination.pages }} 页
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="handlePageChange(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              @click="handlePageChange(pagination.page + 1)"
              :disabled="pagination.page >= pagination.pages"
              class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色分配对话框 -->
    <RoleAssignDialog
      v-if="assignDialogVisible"
      :visible="assignDialogVisible"
      :target-admins="selectedAdminList"
      :loading="assignLoading"
      @close="handleCloseAssignDialog"
      @submit="handleSubmitAssign"
    />

    <!-- 权限查看对话框 -->
    <PermissionViewDialog
      v-if="permissionDialogVisible"
      :visible="permissionDialogVisible"
      :admin="currentAdmin"
      @close="handleClosePermissionDialog"
    />
    
    <!-- 新增管理员对话框 -->
    <CreateAdminDialog
      v-model:visible="createAdminDialogVisible"
      :positions="positionOptions"
      :roles="roles"
      @success="handleCreateSuccess"
    />
    
    <!-- 编辑管理员对话框 -->
    <EditAdminDialog
      v-model:visible="showEditDialog"
      :admin="editingAdmin"
      :loading="loading"
      @submit="handleEditSubmit"
      @close="handleEditClose"
    />

    <!-- 重置密码确认对话框 -->
    <ConfirmDialog
      :visible="resetPasswordDialog.visible"
      type="warning"
      title="重置密码确认"
      :message="'确定要重置管理员 ' + (resetPasswordDialog.admin?.username || '') + ' 的密码吗？系统将生成新的随机密码。'"
      confirm-text="确定重置"
      cancel-text="取消"
      :loading="resetPasswordDialog.loading"
      loading-text="重置中..."
      @confirm="confirmResetPassword"
      @cancel="cancelResetPassword"
    />

    <!-- 密码显示对话框 -->
    <ConfirmDialog
      :visible="showPasswordDialog.visible"
      type="success"
      title="密码重置成功"
      :message="'管理员 ' + showPasswordDialog.username + ' 的新密码是：\n\n' + showPasswordDialog.password + '\n\n请妥善保管并及时通知该管理员修改密码。'"
      confirm-text="我已记录"
      :cancel-text="''"
      @confirm="closePasswordDialog"
      @cancel="closePasswordDialog"
    />

    <!-- 删除管理员确认对话框 -->
    <ConfirmDialog
      :visible="deleteAdminDialog.visible"
      type="danger"
      title="删除管理员确认"
      :message="'确定要删除管理员 ' + (deleteAdminDialog.admin?.username || '') + ' 吗？'"
      details="删除后该管理员将无法登录系统，此操作不可恢复！"
      warning="请谨慎操作，删除后无法恢复"
      confirm-text="确定删除"
      cancel-text="取消"
      :loading="deleteAdminDialog.loading"
      loading-text="删除中..."
      @confirm="confirmDeleteAdmin"
      @cancel="cancelDeleteAdmin"
    />
  </div>
</template>

<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { Edit, Key, RefreshCw, Search, Shield, Trash2, User, UserCheck, UserPlus } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import AdminService from '../../../services/adminService'
import { usePositions } from '../Positions/composables/usePositions'
import { useRoles } from '../Roles/composables/useRoles'
import CreateAdminDialog from './components/CreateAdminDialog.vue'
import EditAdminDialog from './components/EditAdminDialog.vue'
import PermissionViewDialog from './components/PermissionViewDialog.vue'
import RoleAssignDialog from './components/RoleAssignDialog.vue'
import { useAdminRoles } from './composables/useAdminRoles'
import type { AdminRoleInfo } from './types'

// 权限控制
const authStore = useAuthStore()
const canCreateAdmin = computed(() => authStore.isAdmin || authStore.isSuperAdmin)
const canAssignRoles = computed(() => authStore.isAdmin || authStore.isSuperAdmin)
const currentUserId = computed(() => authStore.user?.id)

// 使用组合式函数
const {
  adminRoles,
  loading,
  error,
  pagination,
  getAdminRoles,
  getAdminRolesByAdminId,
  assignAdminRoles,
  removeAdminRoles,
  batchOperateAdminRoles
} = useAdminRoles()

const { getPositionOptions } = usePositions()
const { getRoleOptions } = useRoles()

// 状态
const searchQuery = ref('')
const filterDepartment = ref('')
const filterRole = ref('')
const selectedAdmins = ref<string[]>([])
const currentAdmin = ref<AdminRoleInfo | null>(null)
const selectedAdminList = ref<AdminRoleInfo[]>([])
const editingAdmin = ref<AdminRoleInfo | null>(null)
const assignDialogVisible = ref(false)
const assignLoading = ref(false)
const permissionDialogVisible = ref(false)
const createAdminDialogVisible = ref(false)
const showEditDialog = ref(false)
const positionOptions = ref<Array<{ value: number; label: string }>>([])
const roleOptions = ref<Array<{ value: number; label: string }>>([])
const editDialogVisible = ref(false)
const resetPasswordDialogVisible = ref(false)



// 计算属性
const isAllSelected = computed(() => {
  return adminRoles.value.length > 0 && selectedAdmins.value.length === adminRoles.value.length
})

const positions = computed(() => {
  return positionOptions.value
})

const roles = computed(() => {
  return roleOptions.value.map(role => ({
    id: role.value,
    name: role.label,
    code: `ROLE_${role.value}`,
    description: '',
    status: 1,
    type: 'custom',
    sort_order: 0,
    is_system: false,
    permission_count: 0,
    user_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
})

// 方法
const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleString('zh-CN')
}

const handleSearch = async () => {
  await getAdminRoles({
    username: searchQuery.value,
    department_id: filterDepartment.value ? Number(filterDepartment.value) : undefined,
    role_id: filterRole.value ? Number(filterRole.value) : undefined,
    page: 1
  })
}

const handleRefresh = async () => {
  searchQuery.value = ''
  filterDepartment.value = ''
  filterRole.value = ''
  selectedAdmins.value = []
  await getAdminRoles({ page: 1 })
}

const handlePageChange = async (page: number) => {
  await getAdminRoles({
    username: searchQuery.value,
    department_id: filterDepartment.value ? Number(filterDepartment.value) : undefined,
    role_id: filterRole.value ? Number(filterRole.value) : undefined,
    page
  })
}

const handleSelectAll = () => {
  if (isAllSelected.value) {
    selectedAdmins.value = []
  } else {
    selectedAdmins.value = adminRoles.value.map(admin => admin.admin_id)
  }
}

const handleSelectAdmin = (adminId: string) => {
  const index = selectedAdmins.value.indexOf(adminId)
  if (index > -1) {
    selectedAdmins.value.splice(index, 1)
  } else {
    selectedAdmins.value.push(adminId)
  }
}

const handleAssignRoles = (admin: AdminRoleInfo) => {
  currentAdmin.value = admin
  selectedAdminList.value = [admin]
  assignDialogVisible.value = true
}

// 处理新增管理员
const handleCreateAdmin = () => {
  createAdminDialogVisible.value = true
}

// 处理创建成功
const handleCreateSuccess = () => {
  // 刷新管理员列表
  handleRefresh()
}

const handleBatchAssign = () => {
  if (selectedAdmins.value.length === 0) return
  
  selectedAdminList.value = adminRoles.value.filter(admin => 
    selectedAdmins.value.includes(admin.admin_id)
  )
  currentAdmin.value = null
  assignDialogVisible.value = true
}

const handleViewPermissions = (admin: AdminRoleInfo) => {
  currentAdmin.value = admin
  permissionDialogVisible.value = true
}

const handleCloseAssignDialog = () => {
  assignDialogVisible.value = false
  currentAdmin.value = null
  selectedAdminList.value = []
}

const handleSubmitAssign = async (data: {
  admin_ids: string[]
  role_id: number
  operation_type: 'assign' | 'remove' | 'replace'
  reason?: string
}) => {
  try {
    assignLoading.value = true
    
    let result
    
    // 处理replace操作：先移除所有角色，再分配新角色
    if (data.operation_type === 'replace') {
      // 先获取每个管理员的现有角色并移除
      for (const adminId of data.admin_ids) {
        try {
          // 获取管理员现有角色
          const existingRoles = await getAdminRolesByAdminId(adminId)
          if (existingRoles && existingRoles.length > 0) {
            const existingRoleIds = existingRoles.map(r => r.id)
            // 移除现有角色
            await batchOperateAdminRoles({
              admin_ids: [adminId],
              role_ids: existingRoleIds,
              operation: 'remove'
            })
          }
        } catch (error) {
          console.warn(`移除管理员 ${adminId} 现有角色失败:`, error)
        }
      }
      
      // 然后分配新角色
      const requestData = {
        admin_ids: data.admin_ids,
        role_ids: [data.role_id],
        operation: 'assign' as const,
        reason: data.reason
      }
      
      result = await batchOperateAdminRoles(requestData)
    } else {
      // 普通的assign或remove操作
      const requestData = {
        admin_ids: data.admin_ids, // 保持UUID字符串格式
        role_ids: [data.role_id], // 转换为数组格式
        operation: data.operation_type, // 直接使用操作类型
        reason: data.reason
      }
      
      result = await batchOperateAdminRoles(requestData)
    }
    
    if (result && result.success) {
      assignDialogVisible.value = false
      currentAdmin.value = null
      selectedAdminList.value = []
      selectedAdmins.value = []
      await getAdminRoles({
        username: searchQuery.value,
        department_id: filterDepartment.value ? Number(filterDepartment.value) : undefined,
        role_id: filterRole.value ? Number(filterRole.value) : undefined,
        page: pagination.page
      })
      ElMessage.success('角色分配成功')
    } else {
      ElMessage.error('角色分配失败')
    }
  } catch (err) {
    console.error('分配角色失败:', err)
    ElMessage.error('分配角色失败')
  } finally {
    assignLoading.value = false
  }
}

const handleClosePermissionDialog = () => {
  permissionDialogVisible.value = false
  currentAdmin.value = null
}

// 处理编辑管理员
const handleEditAdmin = (admin: AdminRoleInfo) => {
  editingAdmin.value = admin
  showEditDialog.value = true
}

const handleEditSubmit = async (data: any) => {
  if (!editingAdmin.value) return
  
  try {
    loading.value = true
    
    console.log('🔍 [DEBUG] 原始表单数据:', data)
    console.log('🔍 [DEBUG] 编辑的管理员信息:', editingAdmin.value)
    
    // 转换数据格式以匹配后端API要求
    const updateData = {
      username: data.username,
      email: data.email,
      role_id: data.role_id && data.role_id !== '' ? Number(data.role_id) : undefined, // 转换为数字
      department_id: data.department_id && data.department_id !== '' ? Number(data.department_id) : undefined, // 确保为数字
      position_id: data.position_id && data.position_id !== '' ? Number(data.position_id) : undefined, // 确保为数字
      status: data.status
    }
    
    console.log('🔍 [DEBUG] 转换后的数据(处理前):', updateData)
    console.log('🔍 [DEBUG] role_id 类型转换:', {
      original: data.role_id,
      originalType: typeof data.role_id,
      converted: data.role_id && data.role_id !== '' ? Number(data.role_id) : undefined,
      convertedType: typeof (data.role_id && data.role_id !== '' ? Number(data.role_id) : undefined)
    })
    
    // 移除undefined值
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData]
      }
    })
    
    console.log('🔍 [DEBUG] 最终发送的数据:', updateData)
    console.log('🔍 [DEBUG] 目标管理员ID:', editingAdmin.value.admin_id)
    console.log('🔍 [DEBUG] 数据类型检查:')
    Object.entries(updateData).forEach(([key, value]) => {
      console.log(`  ${key}: ${typeof value} = ${JSON.stringify(value)}`)
    })
    
    console.log('🚀 [DEBUG] 开始调用 AdminService.updateAdmin...')
    const result = await AdminService.updateAdmin(editingAdmin.value.admin_id, updateData)
    console.log('✅ [DEBUG] API调用成功, 返回结果:', result)
    showEditDialog.value = false
    editingAdmin.value = null
    await handleRefresh()
    ElMessage.success('管理员信息更新成功')
  } catch (err) {
    console.error('❌ [DEBUG] 更新管理员失败, 完整错误信息:', err)
    console.error('❌ [DEBUG] 错误类型:', typeof err)
    console.error('❌ [DEBUG] 错误名称:', err?.name)
    console.error('❌ [DEBUG] 错误消息:', err?.message)
    console.error('❌ [DEBUG] 错误堆栈:', err?.stack)
    
    if (err?.response) {
      console.error('❌ [DEBUG] HTTP响应错误:')
      console.error('  状态码:', err.response.status)
      console.error('  状态文本:', err.response.statusText)
      console.error('  响应头:', err.response.headers)
      console.error('  响应数据:', err.response.data)
    }
    
    if (err?.request) {
      console.error('❌ [DEBUG] 请求信息:')
      console.error('  请求URL:', err.request.responseURL)
      console.error('  请求方法:', err.request.method)
      console.error('  请求头:', err.request.getAllResponseHeaders?.())
    }
    
    ElMessage.error(`更新管理员失败: ${err instanceof Error ? err.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

const handleEditClose = () => {
  showEditDialog.value = false
  editingAdmin.value = null
}

// 处理重置密码
const resetPasswordDialog = ref({
  visible: false,
  admin: null as AdminRoleInfo | null,
  loading: false
})

const showPasswordDialog = ref({
  visible: false,
  password: '',
  username: ''
})

const handleResetPassword = (admin: AdminRoleInfo) => {
  resetPasswordDialog.value = {
    visible: true,
    admin,
    loading: false
  }
}

const confirmResetPassword = async () => {
  if (!resetPasswordDialog.value.admin) return
  
  try {
    resetPasswordDialog.value.loading = true
    
    // 生成新密码
    const newPassword = AdminService.generateRandomPassword(12)
    
    // 调用重置密码API
    await AdminService.resetAdminPassword(resetPasswordDialog.value.admin.admin_id, newPassword)
    
    // 关闭确认对话框
    resetPasswordDialog.value.visible = false
    
    // 显示新密码
    showPasswordDialog.value = {
      visible: true,
      password: newPassword,
      username: resetPasswordDialog.value.admin.username
    }
    
    ElMessage.success('密码重置成功')
  } catch (error) {
    console.error('重置密码失败:', error)
    ElMessage.error('重置密码失败')
  } finally {
    resetPasswordDialog.value.loading = false
  }
}

const cancelResetPassword = () => {
  resetPasswordDialog.value.visible = false
  resetPasswordDialog.value.admin = null
}

const closePasswordDialog = () => {
  showPasswordDialog.value.visible = false
  showPasswordDialog.value.password = ''
  showPasswordDialog.value.username = ''
}

// 处理删除管理员
const deleteAdminDialog = ref({
  visible: false,
  admin: null as AdminRoleInfo | null,
  loading: false
})

const handleDeleteAdmin = (admin: AdminRoleInfo) => {
  // 防止删除自己
  if (admin.admin_id === currentUserId.value) {
    ElMessage.warning('不能删除自己的账号')
    return
  }
  
  deleteAdminDialog.value = {
    visible: true,
    admin,
    loading: false
  }
}

const confirmDeleteAdmin = async () => {
  if (!deleteAdminDialog.value.admin) return
  
  try {
    deleteAdminDialog.value.loading = true
    
    // 调用删除管理员API
    await AdminService.deleteAdmin(deleteAdminDialog.value.admin.admin_id)
    
    deleteAdminDialog.value.visible = false
    ElMessage.success('管理员删除成功')
    await handleRefresh()
  } catch (error) {
    console.error('删除管理员失败:', error)
    ElMessage.error('删除管理员失败')
  } finally {
    deleteAdminDialog.value.loading = false
  }
}

const cancelDeleteAdmin = () => {
  deleteAdminDialog.value.visible = false
  deleteAdminDialog.value.admin = null
}

const loadOptions = async () => {
  try {
    const [posOptions, roleOptionsData] = await Promise.all([
      getPositionOptions(),
      getRoleOptions()
    ])
    
    positionOptions.value = posOptions.map(pos => ({
      value: pos.id,
      label: pos.name
    }))
    
    roleOptions.value = roleOptionsData.map(role => ({
      value: role.id,
      label: role.name
    }))
  } catch (error) {
    console.error('加载选项失败:', error)
    ElMessage.error('加载选项失败')
  }
}

// 生命周期
onMounted(async () => {
  await Promise.all([
    getAdminRoles({ page: 1 }),
    loadOptions()
  ])
})
</script>

<style scoped>
.admin-roles-page {
  @apply p-6 space-y-6;
}

.page-header {
  @apply mb-6;
}
</style>