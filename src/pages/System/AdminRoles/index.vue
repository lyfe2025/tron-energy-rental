<template>
  <div class="admin-roles-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-purple-100 rounded-lg">
          <UserCheck class="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">管理员角色管理</h1>
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
            <option value="">全部部门</option>
            <option
              v-for="dept in departmentOptions"
              :key="dept.value"
              :value="dept.value"
            >
              {{ dept.label }}
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
                <div class="flex items-center gap-2">
                  <button
                    @click="handleAssignRoles(adminRole)"
                    class="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    分配角色
                  </button>
                  <button
                    @click="handleViewPermissions(adminRole)"
                    class="text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    查看权限
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
      :user="currentAdmin"
      :users="selectedAdminList"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search, RefreshCw, UserCheck, UserPlus, User } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useAdminRoles } from './composables/useAdminRoles'
import { useDepartments } from '../Departments/composables/useDepartments'
import { useRoles } from '../Roles/composables/useRoles'
import RoleAssignDialog from './components/RoleAssignDialog.vue'
import PermissionViewDialog from './components/PermissionViewDialog.vue'
import type { AdminRoleInfo, AdminRoleAssignRequest } from './types'

// 使用组合式函数
const {
  adminRoles,
  loading,
  error,
  pagination,
  getAdminRoles,
  assignAdminRoles,
  removeAdminRoles
} = useAdminRoles()

const { getDepartmentOptions } = useDepartments()
const { getRoleOptions } = useRoles()

// 状态
const searchQuery = ref('')
const filterDepartment = ref('')
const filterRole = ref('')
const selectedAdmins = ref<string[]>([])
const currentAdmin = ref<AdminRoleInfo | null>(null)
const selectedAdminList = ref<AdminRoleInfo[]>([])
const assignDialogVisible = ref(false)
const assignLoading = ref(false)
const permissionDialogVisible = ref(false)
const departmentOptions = ref<Array<{ value: number; label: string }>>([])
const roleOptions = ref<Array<{ value: number; label: string }>>([])

// 计算属性
const isAllSelected = computed(() => {
  return adminRoles.value.length > 0 && selectedAdmins.value.length === adminRoles.value.length
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

const handleSubmitAssign = async (data: AdminRoleAssignRequest) => {
  try {
    assignLoading.value = true
    
    const success = await assignAdminRoles(data)
    
    if (success) {
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
    }
  } catch (err) {
    console.error('分配角色失败:', err)
  } finally {
    assignLoading.value = false
  }
}

const handleClosePermissionDialog = () => {
  permissionDialogVisible.value = false
  currentAdmin.value = null
}

const loadOptions = async () => {
  try {
    const [deptOptions, roleOptionsData] = await Promise.all([
      getDepartmentOptions(),
      getRoleOptions()
    ])
    
    departmentOptions.value = deptOptions.map(dept => ({
      value: dept.id,
      label: dept.name
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