/**
 * 管理员页面弹窗状态管理组合式函数
 * 从 useAdminPage.ts 中安全分离的弹窗逻辑
 */

import { ref } from 'vue'
import type { Admin } from '../types'

export function useAdminModals() {
  // 表单弹窗状态
  const formModal = ref({
    visible: false,
    admin: null as Admin | null,
    loading: false
  })

  // 详情弹窗状态
  const detailModal = ref({
    visible: false,
    adminId: null as string | null
  })

  // 权限配置弹窗状态
  const permissionModal = ref({
    visible: false,
    admin: null as Admin | null
  })

  // 角色分配弹窗状态
  const roleAssignModal = ref({
    visible: false,
    admin: null as Admin | null
  })

  // 确认对话框状态
  const confirmDialog = ref({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'danger',
    loading: false,
    onConfirm: () => {}
  })

  // 显示创建弹窗
  const showCreateModal = () => {
    formModal.value = {
      visible: true,
      admin: null,
      loading: false
    }
  }

  // 显示编辑弹窗
  const showEditModal = (admin: Admin) => {
    formModal.value = {
      visible: true,
      admin,
      loading: false
    }
  }

  // 从详情弹窗显示编辑弹窗
  const showEditModalFromDetail = (admin: Admin) => {
    detailModal.value.visible = false
    showEditModal(admin)
  }

  // 关闭表单弹窗
  const closeFormModal = () => {
    formModal.value = {
      visible: false,
      admin: null,
      loading: false
    }
  }

  // 显示详情弹窗
  const showDetailModal = (admin: Admin) => {
    detailModal.value = {
      visible: true,
      adminId: admin.id
    }
  }

  // 关闭详情弹窗
  const closeDetailModal = () => {
    detailModal.value = {
      visible: false,
      adminId: null
    }
  }

  // 显示权限配置弹窗
  const showPermissionModal = (admin: Admin) => {
    permissionModal.value = {
      visible: true,
      admin
    }
  }

  // 从详情弹窗显示权限配置弹窗
  const showPermissionModalFromDetail = (admin: Admin) => {
    detailModal.value.visible = false
    showPermissionModal(admin)
  }

  // 关闭权限配置弹窗
  const closePermissionModal = () => {
    permissionModal.value = {
      visible: false,
      admin: null
    }
  }

  // 显示角色分配弹窗
  const showRoleAssignModal = (admin: Admin) => {
    roleAssignModal.value = {
      visible: true,
      admin
    }
  }

  // 关闭角色分配弹窗
  const closeRoleAssignModal = () => {
    roleAssignModal.value = {
      visible: false,
      admin: null
    }
  }

  // 关闭确认对话框
  const closeConfirmDialog = () => {
    confirmDialog.value = {
      visible: false,
      title: '',
      message: '',
      type: 'info',
      loading: false,
      onConfirm: () => {}
    }
  }

  return {
    // 状态
    formModal,
    detailModal,
    permissionModal,
    roleAssignModal,
    confirmDialog,
    
    // 方法
    showCreateModal,
    showEditModal,
    showEditModalFromDetail,
    closeFormModal,
    showDetailModal,
    closeDetailModal,
    showPermissionModal,
    showPermissionModalFromDetail,
    closePermissionModal,
    showRoleAssignModal,
    closeRoleAssignModal,
    closeConfirmDialog
  }
}
