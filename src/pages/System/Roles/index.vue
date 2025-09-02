<template>
  <div class="p-6">
    <!-- 页面头部 -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">角色管理</h1>
          <p class="text-gray-600 mt-1">管理系统角色和权限配置</p>
        </div>
        <button
          @click="handleAdd"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          新增角色
        </button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div class="flex items-center gap-4">
        <!-- 搜索框 -->
        <div class="flex-1">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              v-model="query.keyword"
              type="text"
              placeholder="搜索角色名称或描述"
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keyup.enter="() => loadRoles()"
            />
          </div>
        </div>

        <!-- 状态筛选 -->
        <div class="w-32">
          <select
            v-model="query.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @change="() => loadRoles()"
          >
            <option value="">全部状态</option>
            <option value="1">正常</option>
            <option value="0">停用</option>
          </select>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-2">
          <button
            @click="() => loadRoles()"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Search class="w-4 h-4" />
            搜索
          </button>
          <button
            @click="handleReset"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RotateCcw class="w-4 h-4" />
            重置
          </button>
          <button
            @click="() => loadRoles()"
            :disabled="loading"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
            刷新
          </button>
        </div>
      </div>
    </div>

    <!-- 角色列表 -->
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
        <AlertCircle class="w-12 h-12 text-red-500 mb-4" />
        <p class="text-gray-500 mb-4">{{ error }}</p>
        <button
          @click="() => loadRoles()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="roles.length === 0" class="flex flex-col items-center justify-center py-12">
        <Shield class="w-12 h-12 text-gray-400 mb-4" />
        <p class="text-gray-500 mb-4">暂无角色数据</p>
        <button
          @click="handleAdd"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          新增角色
        </button>
      </div>

      <!-- 角色表格 -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                角色信息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                权限数量
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户数量
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="role in roles" :key="role.id" class="hover:bg-gray-50">
              <!-- 角色信息 -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-blue-100 rounded-lg">
                    <Shield class="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ role.name }}</div>
                    <div class="text-sm text-gray-500">{{ role.code }}</div>
                    <div v-if="role.description" class="text-sm text-gray-500 mt-1">
                      {{ role.description }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- 权限数量 -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <Key class="w-4 h-4 text-gray-400" />
                  <span class="text-sm text-gray-900">{{ role.permission_count || 0 }}</span>
                </div>
              </td>

              <!-- 用户数量 -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <Users class="w-4 h-4 text-gray-400" />
                  <span class="text-sm text-gray-900">{{ role.user_count || 0 }}</span>
                </div>
              </td>

              <!-- 状态 -->
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="{
                    'bg-green-100 text-green-800': role.status === 1,
                    'bg-red-100 text-red-800': role.status === 0
                  }"
                >
                  {{ role.status === 1 ? '正常' : '停用' }}
                </span>
              </td>

              <!-- 创建时间 -->
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ formatDate(role.created_at) }}
              </td>

              <!-- 操作 -->
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="handleConfigPermissions(role)"
                    class="text-blue-600 hover:text-blue-800 transition-colors p-1"
                    title="配置权限"
                  >
                    <Settings class="w-4 h-4" />
                  </button>
                  <button
                    @click="handleEdit(role)"
                    class="text-gray-600 hover:text-gray-800 transition-colors p-1"
                    title="编辑"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button
                    @click="handleDelete(role)"
                    :disabled="role.is_system"
                    class="text-red-600 hover:text-red-800 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
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

      <!-- 分页 -->
      <div v-if="roles.length > 0" class="px-6 py-4 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">
            显示第 {{ (pagination.page - 1) * pagination.limit + 1 }} 到
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 条，
            共 {{ pagination.total }} 条记录
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="handlePageChange(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="px-3 py-1 text-gray-500 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span class="px-3 py-1 text-sm text-gray-700">
              {{ pagination.page }} / {{ Math.ceil(pagination.total / pagination.limit) }}
            </span>
            <button
              @click="handlePageChange(pagination.page + 1)"
              :disabled="pagination.page >= Math.ceil(pagination.total / pagination.limit)"
              class="px-3 py-1 text-gray-500 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色对话框 -->
    <RoleDialog
      :visible="dialogVisible"
      :role="selectedRole"
      @close="handleDialogClose"
      @submit="handleDialogSubmit"
    />

    <!-- 权限配置对话框 -->
    <PermissionDialog
      :visible="permissionDialogVisible"
      :role="selectedRole"
      @close="handlePermissionDialogClose"
      @submit="handlePermissionDialogSubmit"
    />

    <!-- 确认删除对话框 -->
    <ConfirmDialog
      :visible="confirmDialogVisible"
      type="danger"
      title="删除角色"
      subtitle="此操作不可恢复"
      :message="`确定要删除角色 '${selectedRole?.name}' 吗？`"
      warning="删除后该角色下的所有用户将失去相应权限"
      confirm-text="删除"
      :loading="deleteLoading"
      @close="handleConfirmDialogClose"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Plus,
  Search,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Shield,
  Key,
  Users,
  Settings,
  Edit,
  Trash2
} from 'lucide-vue-next'
import { useRoles } from './composables/useRoles'
import type { Role, RoleQuery } from './types'
import RoleDialog from './components/RoleDialog.vue'
import PermissionDialog from './components/PermissionDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'

// 使用组合式函数
const {
  roles,
  loading,
  error,
  pagination,
  loadRoles,
  createRole,
  updateRole,
  deleteRole
} = useRoles()

// 响应式数据
const query = ref<RoleQuery>({
  keyword: '',
  status: undefined,
  page: 1,
  limit: 10
})

const dialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const confirmDialogVisible = ref(false)
const selectedRole = ref<Role | null>(null)
const deleteLoading = ref(false)

// 生命周期
onMounted(() => {
  loadRoles(query.value)
})

// 方法
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const handleAdd = () => {
  selectedRole.value = null
  dialogVisible.value = true
}

const handleEdit = (role: Role) => {
  selectedRole.value = role
  dialogVisible.value = true
}

const handleDelete = (role: Role) => {
  selectedRole.value = role
  confirmDialogVisible.value = true
}

const handleConfigPermissions = (role: Role) => {
  selectedRole.value = role
  permissionDialogVisible.value = true
}

const handleReset = () => {
  query.value = {
    keyword: '',
    status: undefined,
    page: 1,
    limit: 10
  }
  loadRoles(query.value)
}

const handlePageChange = (page: number) => {
  query.value.page = page
  loadRoles(query.value)
}

const handleDialogClose = () => {
  dialogVisible.value = false
  selectedRole.value = null
}

const handleDialogSubmit = async (data: Partial<Role>) => {
  try {
    if (selectedRole.value?.id) {
      await updateRole(selectedRole.value.id, data)
    } else {
      await createRole(data)
    }
    dialogVisible.value = false
    selectedRole.value = null
    loadRoles(query.value)
  } catch (error) {
    console.error('保存角色失败:', error)
  }
}

const handlePermissionDialogClose = () => {
  permissionDialogVisible.value = false
  selectedRole.value = null
}

const handlePermissionDialogSubmit = async (permissionIds: number[]) => {
  if (!selectedRole.value?.id) {
    console.error('没有选中的角色')
    return
  }

  try {
    // 调用权限配置API
    const { configRolePermissions } = useRoles()
    const success = await configRolePermissions({
      role_id: selectedRole.value.id,
      permission_ids: permissionIds
    })

    if (success) {
      console.log('权限配置保存成功')
      // 关闭对话框并刷新数据
      permissionDialogVisible.value = false
      selectedRole.value = null
      loadRoles(query.value)
    } else {
      console.error('权限配置保存失败')
    }
  } catch (error) {
    console.error('权限配置保存异常:', error)
  }
}

const handleConfirmDialogClose = () => {
  confirmDialogVisible.value = false
  selectedRole.value = null
}

const handleConfirmDelete = async () => {
  if (!selectedRole.value?.id) return
  
  deleteLoading.value = true
  try {
    await deleteRole(selectedRole.value.id)
    confirmDialogVisible.value = false
    selectedRole.value = null
    loadRoles(query.value)
  } catch (error) {
    console.error('删除角色失败:', error)
  } finally {
    deleteLoading.value = false
  }
}
</script>