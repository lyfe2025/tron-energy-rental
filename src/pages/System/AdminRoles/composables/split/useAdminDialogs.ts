/**
 * 管理员对话框状态管理
 */
import { ref } from 'vue'
import type { AdminRoleInfo } from '../../types'

export function useAdminDialogs() {
  // 对话框状态
  const createAdminDialogVisible = ref(false)
  const editDialogVisible = ref(false)
  const assignDialogVisible = ref(false)
  const permissionDialogVisible = ref(false)
  const resetPasswordDialogVisible = ref(false)

  // 当前操作的管理员
  const currentAdmin = ref<AdminRoleInfo | null>(null)
  const editingAdmin = ref<AdminRoleInfo | null>(null)

  // 加载状态
  const assignLoading = ref(false)

  // 显示创建管理员对话框
  const showCreateAdminDialog = () => {
    currentAdmin.value = null
    createAdminDialogVisible.value = true
  }

  // 关闭创建管理员对话框
  const closeCreateAdminDialog = () => {
    createAdminDialogVisible.value = false
    currentAdmin.value = null
  }

  // 显示编辑管理员对话框
  const showEditAdminDialog = (admin: AdminRoleInfo) => {
    editingAdmin.value = { ...admin }
    editDialogVisible.value = true
  }

  // 关闭编辑管理员对话框
  const closeEditAdminDialog = () => {
    editDialogVisible.value = false
    editingAdmin.value = null
  }

  // 显示角色分配对话框
  const showAssignRoleDialog = (admin: AdminRoleInfo) => {
    currentAdmin.value = { ...admin }
    assignDialogVisible.value = true
  }

  // 关闭角色分配对话框
  const closeAssignRoleDialog = () => {
    assignDialogVisible.value = false
    currentAdmin.value = null
  }

  // 显示权限查看对话框
  const showPermissionDialog = (admin: AdminRoleInfo) => {
    currentAdmin.value = { ...admin }
    permissionDialogVisible.value = true
  }

  // 关闭权限查看对话框
  const closePermissionDialog = () => {
    permissionDialogVisible.value = false
    currentAdmin.value = null
  }

  // 显示重置密码对话框
  const showResetPasswordDialog = (admin: AdminRoleInfo) => {
    currentAdmin.value = { ...admin }
    resetPasswordDialogVisible.value = true
  }

  // 关闭重置密码对话框
  const closeResetPasswordDialog = () => {
    resetPasswordDialogVisible.value = false
    currentAdmin.value = null
  }

  // 关闭所有对话框
  const closeAllDialogs = () => {
    createAdminDialogVisible.value = false
    editDialogVisible.value = false
    assignDialogVisible.value = false
    permissionDialogVisible.value = false
    resetPasswordDialogVisible.value = false
    currentAdmin.value = null
    editingAdmin.value = null
  }

  return {
    // 对话框状态
    createAdminDialogVisible,
    editDialogVisible,
    assignDialogVisible,
    permissionDialogVisible,
    resetPasswordDialogVisible,
    
    // 当前数据
    currentAdmin,
    editingAdmin,
    
    // 加载状态
    assignLoading,
    
    // 创建管理员对话框方法
    showCreateAdminDialog,
    closeCreateAdminDialog,
    
    // 编辑管理员对话框方法
    showEditAdminDialog,
    closeEditAdminDialog,
    
    // 角色分配对话框方法
    showAssignRoleDialog,
    closeAssignRoleDialog,
    
    // 权限查看对话框方法
    showPermissionDialog,
    closePermissionDialog,
    
    // 重置密码对话框方法
    showResetPasswordDialog,
    closeResetPasswordDialog,
    
    // 工具方法
    closeAllDialogs
  }
}
