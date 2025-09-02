<template>
  <div class="admin-roles-page">
    <!-- 页面标题 -->
    <AdminRolesHeader :stats="stats" />

    <!-- 操作栏 -->
    <AdminRoleFilter
      v-model:search-query="searchQuery"
      v-model:filter-department="filterDepartment"
      v-model:filter-role="filterRole"
      :position-options="positionOptions"
      :role-options="roleOptions"
      :loading="loading"
      :can-create-admin="canCreateAdmin"
      @search="handleSearch"
      @refresh="handleRefresh"
      @create-admin="showCreateAdminDialog"
    />

    <!-- 管理员列表 -->
    <AdminRolesList
      v-model:selected-admins="selectedAdmins"
      :admin-roles="adminRoles"
      :loading="loading"
      :can-assign-roles="canAssignRoles"
      :can-create-admin="canCreateAdmin"
      :current-user-id="currentUserId"
      @view-permissions="handleViewPermissions"
      @assign-roles="handleAssignRoles"
      @edit-admin="handleEditAdmin"
      @delete-admin="handleDeleteAdmin"
      @reset-password="handleResetPassword"
      @batch-assign-roles="handleBatchAssignRoles"
    />

    <!-- 分页 -->
    <AdminRolesPagination
      v-if="pagination"
      :pagination="pagination"
      @page-change="handlePageChange"
    />

    <!-- 创建管理员对话框 -->
    <CreateAdminDialog
      v-model:visible="createAdminDialogVisible"
      :roles="roleOptions"
      :positions="positionOptions"
      @success="handleAdminCreateSuccess"
    />

    <!-- 编辑管理员对话框 -->
    <EditAdminDialog
      v-model:visible="editDialogVisible"
      :admin="editingAdmin"
      @success="handleAdminEditSuccess"
    />

    <!-- 角色分配对话框 -->
    <RoleAssignDialog
      v-model:visible="assignDialogVisible"
      :target-admins="currentAdmin ? [currentAdmin] : []"
      @close="() => assignDialogVisible = false"
      @submit="handleRoleAssignSuccess"
    />

    <!-- 权限查看对话框 -->
    <PermissionViewDialog
      v-model:visible="permissionDialogVisible"
      :admin="currentAdmin"
    />

    <!-- 重置密码对话框 -->
    <ResetPasswordDialog
      v-model:visible="resetPasswordDialogVisible"
      :admin="currentAdmin"
      @success="handleAdminEditSuccess"
    />

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-if="confirmDialog.visible"
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.onCancel"
    />
  </div>
</template>

<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { computed, reactive, ref } from 'vue'

// 导入拆分后的组件
import AdminRolesList from './components/admin-list/AdminRolesList.vue'
import AdminRolesPagination from './components/admin-list/AdminRolesPagination.vue'
import AdminRolesHeader from './components/AdminRolesHeader.vue'
import AdminRoleFilter from './components/filters/AdminRoleFilter.vue'

// 导入现有的对话框组件
import CreateAdminDialog from './components/CreateAdminDialog.vue'
import EditAdminDialog from './components/EditAdminDialog.vue'
import PermissionViewDialog from './components/PermissionViewDialog.vue'
import ResetPasswordDialog from './components/ResetPasswordDialog.vue'
import RoleAssignDialog from './components/RoleAssignDialog.vue'

// 导入主要业务逻辑
import { useAdminRolesPage } from './composables/split/useAdminRolesPage'
import type { AdminRoleInfo } from './types'


// 权限控制
const authStore = useAuthStore()
const canCreateAdmin = computed(() => authStore.isAdmin || authStore.isSuperAdmin)
const canAssignRoles = computed(() => authStore.isAdmin || authStore.isSuperAdmin)
const currentUserId = computed(() => authStore.user?.id)

// 使用主要业务逻辑
const {
  // 基础数据
  adminRoles,
  loading,
  error,
  pagination,
  
  // 筛选相关
  searchQuery,
  filterDepartment,
  filterRole,
  positionOptions,
  roleOptions,
  hasFilters,
  
  // 选择相关
  selectedAdmins,
  selectedAdminList,
  isAllSelected,
  
  // 对话框相关
  createAdminDialogVisible,
  editDialogVisible,
  assignDialogVisible,
  permissionDialogVisible,
  resetPasswordDialogVisible,
  currentAdmin,
  editingAdmin,
  assignLoading,
  
  // 数据操作方法
  loadAdminRoles,
  handleSearch,
  handleRefresh,
  handlePageChange,
  
  // 选择操作方法
  toggleSelectAll,
  clearSelection,
  toggleAdminSelection,
  isAdminSelected,
  
  // 对话框操作方法
  showCreateAdminDialog,
  showEditAdminDialog,
  showAssignRoleDialog,
  showPermissionDialog,
  showResetPasswordDialog,
  closeAllDialogs,
  
  // 业务操作方法
  handleViewPermissions,
  handleAssignRoles,
  handleEditAdmin,
  handleDeleteAdmin,
  handleResetPassword,
  handleBatchAssignRoles,
  
  // 回调方法
  handleRoleAssignSuccess,
  handleAdminCreateSuccess,
  handleAdminEditSuccess
} = useAdminRolesPage()

// 统计数据（可选，从API获取）
const stats = ref({
  totalAdmins: 0,
  totalRoles: 0,
  totalAssignments: 0,
  recentAssignments: 0
})

// 确认对话框状态
const confirmDialog = reactive({
  visible: false,
  title: '',
  message: '',
  loading: false,
  onConfirm: () => {},
  onCancel: () => {
    confirmDialog.visible = false
  }
})

// 重写删除管理员方法以显示确认对话框
const handleDeleteAdminWithConfirm = (admin: AdminRoleInfo) => {
  confirmDialog.title = '确认删除'
  confirmDialog.message = `确定要删除管理员 "${admin.username}" 吗？此操作不可恢复。`
  confirmDialog.visible = true
  confirmDialog.onConfirm = async () => {
    confirmDialog.loading = true
    try {
      await handleDeleteAdmin(admin)
      confirmDialog.visible = false
    } finally {
      confirmDialog.loading = false
    }
  }
}
</script>

<style scoped>
.admin-roles-page {
  @apply p-6 bg-gray-50 min-h-screen;
}

/* 其他页面特定样式 */
</style>
