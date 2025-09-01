/**
 * 用户UI状态管理
 * 从 useUserManagement.ts 中安全分离的UI状态管理功能
 */

import { computed, ref, type Ref } from 'vue'
import type { User, UserModalMode } from '../types/user.types'

export function useUserUI() {
  // 选择状态
  const selectedUsers = ref<string[]>([])
  const selectAll = ref(false)

  // 模态框状态
  const modalMode = ref<UserModalMode>('view')
  const isModalOpen = ref(false)
  const currentUser = ref<User | undefined>()
  const isSubmitting = ref(false)

  // 其他UI状态
  const showUserMenu = ref('')

  // 确认对话框状态
  const showConfirmDialog = ref(false)
  const confirmDialogConfig = ref({
    title: '',
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    type: 'warning' as 'info' | 'warning' | 'danger',
    onConfirm: () => {},
    onCancel: () => {}
  })

  // 计算属性
  const selectedCount = computed(() => selectedUsers.value.length)

  // 选择方法
  const toggleSelectAll = (paginatedUsers: Ref<User[]>) => {
    if (selectAll.value) {
      selectedUsers.value = []
    } else {
      selectedUsers.value = paginatedUsers.value.map(user => user.id)
    }
    selectAll.value = !selectAll.value
  }

  const toggleUserSelect = (userId: string, paginatedUsers: Ref<User[]>) => {
    const index = selectedUsers.value.indexOf(userId)
    if (index > -1) {
      selectedUsers.value.splice(index, 1)
    } else {
      selectedUsers.value.push(userId)
    }
    
    // 更新全选状态
    selectAll.value = selectedUsers.value.length === paginatedUsers.value.length
  }

  const clearSelection = () => {
    selectedUsers.value = []
    selectAll.value = false
  }

  // 模态框方法
  const openModal = (mode: UserModalMode, user?: User) => {
    modalMode.value = mode
    currentUser.value = user
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
    currentUser.value = undefined
    isSubmitting.value = false
  }

  const viewUser = (user: User) => {
    openModal('view', user)
  }

  const editUser = (user: User) => {
    openModal('edit', user)
  }

  const createUser = () => {
    openModal('create')
  }

  // 确认对话框辅助函数
  const showConfirm = (config: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'info' | 'warning' | 'danger'
    onConfirm: () => void
    onCancel?: () => void
  }) => {
    confirmDialogConfig.value = {
      title: config.title,
      message: config.message,
      confirmText: config.confirmText || '确认',
      cancelText: config.cancelText || '取消',
      type: config.type || 'warning',
      onConfirm: () => {
        showConfirmDialog.value = false
        config.onConfirm()
      },
      onCancel: () => {
        showConfirmDialog.value = false
        config.onCancel?.()
      }
    }
    showConfirmDialog.value = true
  }

  // 其他UI方法
  const toggleUserMenu = (userId: string) => {
    showUserMenu.value = showUserMenu.value === userId ? '' : userId
  }

  return {
    // 状态
    selectedUsers,
    selectAll,
    modalMode,
    isModalOpen,
    currentUser,
    isSubmitting,
    showUserMenu,
    showConfirmDialog,
    confirmDialogConfig,
    
    // 计算属性
    selectedCount,
    
    // 选择方法
    toggleSelectAll,
    toggleUserSelect,
    clearSelection,
    
    // 模态框方法
    openModal,
    closeModal,
    viewUser,
    editUser,
    createUser,
    
    // 确认对话框方法
    showConfirm,
    
    // 其他UI方法
    toggleUserMenu
  }
}
