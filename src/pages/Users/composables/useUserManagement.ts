/**
 * 用户管理主组合式函数
 * 整合了所有分离的模块，保持原有API接口不变
 */

import { useUserActions } from './useUserActions'
import { useUserData, type StatCard } from './useUserData'
import { useUserFilters } from './useUserFilters'
import { useUserUI } from './useUserUI'
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    getStatusColor,
    getStatusText,
    getTypeColor,
    getTypeText,
    getUserTypeColor,
    getUserTypeText
} from './userFormatUtils'

// 导出类型以确保外部可访问
export type { StatCard }

export function useUserManagement() {
  // 使用分离的模块
  const userData = useUserData()
  const userFilters = useUserFilters()
  const userUI = useUserUI()
  const userActions = useUserActions()

  // 创建过滤和分页的计算属性
  const filteredUsers = userFilters.createFilteredUsers(userData.users)
  const paginatedUsers = userFilters.createPaginatedUsers(filteredUsers, userData.currentPage, userData.pageSize)
  const totalPages = userFilters.createTotalPages(filteredUsers, userData.pageSize)

  // 包装数据加载方法，支持搜索参数
  const loadUsersWithParams = (searchParams?: any) => {
    return userData.loadUsers(searchParams || userFilters.searchParams)
  }

  // 包装分页方法
  const handlePageChange = (page: number) => {
    userData.handlePageChange(page)
    loadUsersWithParams()
  }

  // 包装搜索筛选方法
  const handleSearch = (query: string) => {
    userFilters.handleSearch(query, loadUsersWithParams)
  }

  const handleStatusFilter = (status: string) => {
    userFilters.handleStatusFilter(status, loadUsersWithParams, userData.handlePageChange)
  }

  const handleTypeFilter = (type: string) => {
    userFilters.handleTypeFilter(type, loadUsersWithParams, userData.handlePageChange)
  }

  const handleUserTypeFilter = (userType: string) => {
    userFilters.handleUserTypeFilter(userType, loadUsersWithParams, userData.handlePageChange)
  }

  const handleBotFilter = (botId: string) => {
    userFilters.handleBotFilter(botId, loadUsersWithParams, userData.handlePageChange)
  }

  const handleDateRangeFilter = (start: string, end: string) => {
    userFilters.handleDateRangeFilter(start, end, loadUsersWithParams, userData.handlePageChange)
  }

  const clearFilters = () => {
    userFilters.clearFilters(loadUsersWithParams, userData.handlePageChange)
  }

  // 包装UI方法
  const toggleSelectAll = () => {
    userUI.toggleSelectAll(paginatedUsers)
  }

  const toggleUserSelect = (userId: string) => {
    userUI.toggleUserSelect(userId, paginatedUsers)
  }

  // 包装用户操作方法
  const saveUser = (formData: any) => {
    return userActions.saveUser(
      formData,
      userUI.modalMode,
      userUI.currentUser,
      userUI.closeModal,
      loadUsersWithParams,
      userData.loadUserStats,
      userUI.isSubmitting,
      userFilters.searchParams
    )
  }

  const deleteUser = (userId: string) => {
    return userActions.deleteUser(
      userId,
      loadUsersWithParams,
      userData.loadUserStats,
      userFilters.searchParams
    )
  }

  // 包装批量操作方法
  const batchActivate = () => {
    return userActions.batchActivate(
      userUI.selectedUsers,
      userUI.clearSelection,
      loadUsersWithParams,
      userData.loadUserStats,
      userFilters.searchParams
    )
  }

  const batchDeactivate = () => {
    return userActions.batchDeactivate(
      userUI.selectedUsers,
      userUI.clearSelection,
      loadUsersWithParams,
      userData.loadUserStats,
      userFilters.searchParams
    )
  }

  const batchDelete = () => {
    return userActions.batchDelete(
      userUI.selectedUsers,
      userUI.clearSelection,
      loadUsersWithParams,
      userData.loadUserStats,
      userFilters.searchParams
    )
  }

  const batchExport = () => {
    return userActions.batchExport(userUI.selectedUsers)
  }

  const batchTypeChange = (type: string) => {
    return userActions.batchTypeChange(
      type,
      userUI.selectedUsers,
      userUI.clearSelection,
      loadUsersWithParams,
      userData.loadUserStats,
      userFilters.searchParams
    )
  }

  // 包装其他业务操作
  const resetPassword = (user: any) => {
    return userActions.resetPassword(user, userUI.showConfirm, userUI.showUserMenu)
  }

  const adjustBalance = (user: any) => {
    return userActions.adjustBalance(user, userUI.showConfirm, userUI.showUserMenu)
  }

  const viewUserOrders = (user: any) => {
    return userActions.viewUserOrders(user, userUI.showConfirm, userUI.showUserMenu)
  }

  const banUser = (user: any) => {
    return userActions.banUser(
      user,
      userUI.showConfirm,
      loadUsersWithParams,
      userData.loadUserStats,
      userUI.showUserMenu,
      userFilters.searchParams
    )
  }

  return {
    // 状态 - 从各个模块整合
    isLoading: userData.isLoading,
    users: userData.users,
    userStats: userData.userStats,
    searchParams: userFilters.searchParams,
    currentPage: userData.currentPage,
    pageSize: userData.pageSize,
    totalUsers: userData.totalUsers,
    selectedUsers: userUI.selectedUsers,
    selectAll: userUI.selectAll,
    modalMode: userUI.modalMode,
    isModalOpen: userUI.isModalOpen,
    currentUser: userUI.currentUser,
    isSubmitting: userUI.isSubmitting,
    showUserMenu: userUI.showUserMenu,
    
    // 确认对话框状态
    showConfirmDialog: userUI.showConfirmDialog,
    confirmDialogConfig: userUI.confirmDialogConfig,
    
    // 计算属性
    filteredUsers,
    totalPages,
    paginatedUsers,
    selectedCount: userUI.selectedCount,
    
    // 工具函数
    formatDateTime,
    formatDate,
    formatCurrency,
    getTypeText,
    getTypeColor,
    getUserTypeText,
    getUserTypeColor,
    getStatusText,
    getStatusColor,
    
    // 数据加载
    loadUsers: loadUsersWithParams,
    loadUserStats: userData.loadUserStats,
    
    // 搜索筛选
    handleSearch,
    handleStatusFilter,
    handleTypeFilter,
    handleUserTypeFilter,
    handleBotFilter,
    handleDateRangeFilter,
    clearFilters,
    
    // 分页
    handlePageChange,
    
    // 选择
    toggleSelectAll,
    toggleUserSelect,
    clearSelection: userUI.clearSelection,
    
    // 模态框
    openModal: userUI.openModal,
    closeModal: userUI.closeModal,
    viewUser: userUI.viewUser,
    editUser: userUI.editUser,
    createUser: userUI.createUser,
    
    // 用户操作
    saveUser,
    deleteUser,
    
    // 批量操作
    batchActivate,
    batchDeactivate,
    batchDelete,
    batchExport,
    batchTypeChange,
    
    // 其他
    toggleUserMenu: userUI.toggleUserMenu,
    resetPassword,
    adjustBalance,
    viewUserOrders,
    banUser,
    showConfirm: userUI.showConfirm
  }
}