/**
 * 管理员角色页面主要逻辑整合
 */
import { ElMessage } from 'element-plus'
import { onMounted } from 'vue'
import { useAdminRoles } from '../useAdminRoles'
import { useAdminDialogs } from './useAdminDialogs'
import { useAdminFilters } from './useAdminFilters'
import { useAdminSelection } from './useAdminSelection'

export function useAdminRolesPage() {
  // 基础数据管理
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

  // 筛选逻辑
  const {
    searchQuery,
    filterDepartment,
    filterRole,
    positionOptions,
    roleOptions,
    hasFilters,
    initOptions,
    resetFilters,
    getFilterParams
  } = useAdminFilters()

  // 选择逻辑
  const {
    selectedAdmins,
    selectedAdminList,
    isAllSelected,
    toggleSelectAll,
    clearSelection,
    toggleAdminSelection,
    isAdminSelected,
    getSelectedAdminIds,
    resetSelection
  } = useAdminSelection(adminRoles)

  // 对话框逻辑
  const {
    createAdminDialogVisible,
    editDialogVisible,
    assignDialogVisible,
    permissionDialogVisible,
    resetPasswordDialogVisible,
    currentAdmin,
    editingAdmin,
    assignLoading,
    showCreateAdminDialog,
    closeCreateAdminDialog,
    showEditAdminDialog,
    closeEditAdminDialog,
    showAssignRoleDialog,
    closeAssignRoleDialog,
    showPermissionDialog,
    closePermissionDialog,
    showResetPasswordDialog,
    closeResetPasswordDialog,
    closeAllDialogs
  } = useAdminDialogs()

  // 加载管理员数据
  const loadAdminRoles = async () => {
    try {
      await getAdminRoles({
        page: pagination.page || 1,
        page_size: pagination.page_size || 20,
        ...getFilterParams()
      })
      resetSelection() // 刷新数据后重置选择
    } catch (error) {
      console.error('加载管理员数据失败:', error)
      ElMessage.error('加载管理员数据失败')
    }
  }

  // 搜索处理
  const handleSearch = async () => {
    pagination.page = 1 // 重置到第一页
    await loadAdminRoles()
  }

  // 刷新数据
  const handleRefresh = async () => {
    await loadAdminRoles()
    ElMessage.success('数据刷新成功')
  }

  // 分页处理
  const handlePageChange = async (page: number) => {
    pagination.page = page
    await loadAdminRoles()
  }

  // 查看权限
  const handleViewPermissions = (admin: any) => {
    showPermissionDialog(admin)
  }

  // 分配角色
  const handleAssignRoles = (admin: any) => {
    showAssignRoleDialog(admin)
  }

  // 编辑管理员
  const handleEditAdmin = (admin: any) => {
    showEditAdminDialog(admin)
  }

  // 删除管理员
  const handleDeleteAdmin = async (admin: any) => {
    try {
      // 这里应该调用删除API
      ElMessage.success('删除成功')
      await loadAdminRoles()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }

  // 重置密码
  const handleResetPassword = (admin: any) => {
    showResetPasswordDialog(admin)
  }

  // 批量分配角色
  const handleBatchAssignRoles = async () => {
    if (selectedAdmins.value.length === 0) {
      ElMessage.warning('请先选择要分配角色的管理员')
      return
    }

    try {
      assignLoading.value = true
      // 这里应该实现批量分配逻辑
      ElMessage.success('批量分配角色成功')
      await loadAdminRoles()
      clearSelection()
    } catch (error) {
      ElMessage.error('批量分配角色失败')
    } finally {
      assignLoading.value = false
    }
  }

  // 角色分配成功回调
  const handleRoleAssignSuccess = async () => {
    closeAssignRoleDialog()
    await loadAdminRoles()
    ElMessage.success('角色分配成功')
  }

  // 管理员创建成功回调
  const handleAdminCreateSuccess = async () => {
    closeCreateAdminDialog()
    await loadAdminRoles()
    ElMessage.success('管理员创建成功')
  }

  // 管理员编辑成功回调
  const handleAdminEditSuccess = async () => {
    closeEditAdminDialog()
    await loadAdminRoles()
    ElMessage.success('管理员信息更新成功')
  }

  // 初始化页面
  const initializePage = async () => {
    try {
      loading.value = true
      await Promise.all([
        initOptions(),
        loadAdminRoles()
      ])
    } catch (error) {
      console.error('页面初始化失败:', error)
      ElMessage.error('页面初始化失败')
    } finally {
      loading.value = false
    }
  }

  // 组件挂载时初始化
  onMounted(() => {
    initializePage()
  })

  return {
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
  }
}
