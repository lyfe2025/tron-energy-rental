/**
 * 管理员页面核心逻辑组合式函数
 * 重构后的主要页面逻辑，整合其他分离的功能模块
 */

import { computed, ref } from 'vue'
import { useToast } from '../../../composables/useToast'
import { useAuthStore } from '../../../stores/auth'
import type { AdminSearchParams } from '../types'
import { useAdminBulkActions } from './useAdminBulkActions'
import { useAdminForm } from './useAdminForm'
import { useAdminModals } from './useAdminModals'
import { useAdminNetwork } from './useAdminNetwork'
import { useAdminStore } from './useAdminStore'

export function useAdminPage() {
  // Store
  const adminStore = useAdminStore()
  const authStore = useAuthStore()
  const toast = useToast()

  // 引入分离的功能模块
  const network = useAdminNetwork()
  const modals = useAdminModals()
  const form = useAdminForm()
  const bulkActions = useAdminBulkActions()

  // 刷新状态
  const refreshing = ref(false)

  // 错误状态
  const hasError = computed(() => !!adminStore.error.value)
  const errorMessage = computed(() => adminStore.error.value || '')

  // 初始化数据
  const initData = async () => {
    // 确保用户已认证
    if (!authStore.isAuthenticated) {
      toast.warning('用户未认证，请先登录')
      return
    }
    
    if (!network.isOnline.value) {
      toast.error('网络连接异常，无法获取数据')
      return
    }
    
    try {
      await Promise.all([
        adminStore.fetchAdmins(),
        adminStore.fetchStats()
      ])
      
      if (adminStore.error.value) {
        network.handleApiError(adminStore.error.value, '获取管理员数据')
      } else {
        network.retryCount.value = 0
      }
    } catch (error) {
      network.handleApiError(error, '获取管理员数据')
    }
  }

  // 刷新数据
  const refreshData = async () => {
    refreshing.value = true
    try {
      await network.retryOperation(initData, '刷新数据')
      toast.success('数据刷新成功')
    } catch (error) {
      network.handleApiError(error, '刷新数据')
    } finally {
      refreshing.value = false
    }
  }

  // 处理搜索
  const handleSearch = async (params: AdminSearchParams) => {
    try {
      await adminStore.fetchAdmins(params)
      if (adminStore.error.value) {
        network.handleApiError(adminStore.error.value, '搜索管理员')
      }
    } catch (error) {
      network.handleApiError(error, '搜索管理员')
    }
  }

  // 处理搜索重置
  const handleSearchReset = async () => {
    try {
      await adminStore.fetchAdmins()
      if (adminStore.error.value) {
        network.handleApiError(adminStore.error.value, '重置搜索')
      }
    } catch (error) {
      network.handleApiError(error, '重置搜索')
    }
  }

  // 处理分页变化
  const handlePageChange = async (page: number) => {
    try {
      await adminStore.fetchAdmins({ page })
      if (adminStore.error.value) {
        network.handleApiError(adminStore.error.value, '加载页面数据')
      }
    } catch (error) {
      network.handleApiError(error, '加载页面数据')
    }
  }

  return {
    // 状态
    refreshing,
    hasError,
    errorMessage,
    
    // 网络模块
    isOnline: network.isOnline,
    setupNetworkListeners: network.setupNetworkListeners,
    
    // 弹窗模块
    formModal: modals.formModal,
    detailModal: modals.detailModal,
    permissionModal: modals.permissionModal,
    roleAssignModal: modals.roleAssignModal,
    confirmDialog: modals.confirmDialog,
    showCreateModal: modals.showCreateModal,
    showEditModal: modals.showEditModal,
    showEditModalFromDetail: modals.showEditModalFromDetail,
    closeFormModal: modals.closeFormModal,
    showDetailModal: modals.showDetailModal,
    closeDetailModal: modals.closeDetailModal,
    showPermissionModal: modals.showPermissionModal,
    showPermissionModalFromDetail: modals.showPermissionModalFromDetail,
    closePermissionModal: modals.closePermissionModal,
    showRoleAssignModal: modals.showRoleAssignModal,
    closeRoleAssignModal: modals.closeRoleAssignModal,
    closeConfirmDialog: modals.closeConfirmDialog,
    
    // 表单模块
    handleFormSubmit: (data: any) => form.handleFormSubmit(
      data, 
      modals.formModal.value.admin, 
      (loading: boolean) => { modals.formModal.value.loading = loading },
      modals.closeFormModal
    ),
    handlePermissionSaved: form.handlePermissionSaved,
    handleRoleAssign: form.handleRoleAssign,
    handleRoleAssignSaved: form.handleRoleAssignSaved,
    
    // 批量操作模块
    selectedAdmins: bulkActions.selectedAdmins,
    handleSelectionChange: bulkActions.handleSelectionChange,
    clearSelection: bulkActions.clearSelection,
    handleDelete: (admin: any) => bulkActions.handleDelete(
      admin,
      (config: any) => { modals.confirmDialog.value = config },
      modals.closeConfirmDialog
    ),
    handleBulkAction: (action: string, adminIds: string[]) => bulkActions.handleBulkAction(
      action,
      adminIds,
      (config: any) => { modals.confirmDialog.value = config },
      modals.closeConfirmDialog
    ),
    
    // 核心方法
    initData,
    refreshData,
    handleSearch,
    handleSearchReset,
    handlePageChange
  }
}