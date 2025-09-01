/**
 * 用户操作逻辑
 * 从 useUserManagement.ts 中安全分离的用户操作功能
 */

import { useToast } from '@/composables/useToast'
import { userService } from '@/services/userService'
import type { Ref } from 'vue'
import type {
    BatchOperationParams,
    CreateUserParams,
    UpdateUserParams,
    User,
    UserFormData,
    UserModalMode,
} from '../types/user.types'
import { formatCurrency, formatDateTime } from './userFormatUtils'

export function useUserActions() {
  // 初始化 toast
  const toast = useToast()

  // 用户操作方法
  const saveUser = async (
    formData: UserFormData,
    modalMode: Ref<UserModalMode>,
    currentUser: Ref<User | undefined>,
    closeModal: () => void,
    loadUsers: (searchParams: any) => Promise<void>,
    loadUserStats: () => Promise<void>,
    isSubmitting: Ref<boolean>,
    searchParams: any
  ) => {
    try {
      isSubmitting.value = true
      
      if (modalMode.value === 'create') {
        const createParams: CreateUserParams = {
          login_type: formData.login_type as any,
          user_type: formData.user_type as any,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          balance: formData.balance,
          password: formData.password,
          remark: formData.remark,
          // 根据登录类型设置特有字段
          telegram_id: formData.login_type === 'telegram' ? formData.telegram_id || Math.floor(Math.random() * 1000000000) : undefined,
          first_name: formData.login_type === 'telegram' ? formData.first_name || formData.username : undefined,
          last_name: formData.login_type === 'telegram' ? formData.last_name || '' : undefined,
          // agent_id 和 commission_rate 已移除，因为 agent 不再是 user_type 的选项
        }
        await userService.createUser(createParams)
      } else if (modalMode.value === 'edit') {
        const updateParams: UpdateUserParams = {
          login_type: formData.login_type as any,
          user_type: formData.user_type as any,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          status: formData.status as any,
          balance: formData.balance,
          remark: formData.remark,
          // 根据类型更新特有字段
          first_name: formData.first_name,
          last_name: formData.last_name,
          commission_rate: formData.commission_rate
        }
        if (formData.password) {
          updateParams.password = formData.password
        }
        await userService.updateUser(currentUser.value!.id, updateParams)
      }
      
      closeModal()
      await loadUsers(searchParams)
      await loadUserStats()
    } catch (error) {
      console.error('保存用户失败:', error)
      // 这里可以添加错误提示
    } finally {
      isSubmitting.value = false
    }
  }

  const deleteUser = async (
    userId: string,
    loadUsers: (searchParams: any) => Promise<void>,
    loadUserStats: () => Promise<void>,
    searchParams: any
  ) => {
    try {
      await userService.deleteUser(userId)
      await loadUsers(searchParams)
      await loadUserStats()
    } catch (error) {
      console.error('删除用户失败:', error)
    }
  }

  // 批量操作方法
  const batchActivate = async (
    selectedUsers: Ref<string[]>,
    clearSelection: () => void,
    loadUsers: (searchParams: any) => Promise<void>,
    loadUserStats: () => Promise<void>,
    searchParams: any
  ) => {
    try {
      const params: BatchOperationParams = {
        userIds: selectedUsers.value,
        operation: 'activate'
      }
      await userService.batchOperation(params)
      clearSelection()
      await loadUsers(searchParams)
      await loadUserStats()
    } catch (error) {
      console.error('批量启用失败:', error)
    }
  }

  const batchDeactivate = async (
    selectedUsers: Ref<string[]>,
    clearSelection: () => void,
    loadUsers: (searchParams: any) => Promise<void>,
    loadUserStats: () => Promise<void>,
    searchParams: any
  ) => {
    try {
      const params: BatchOperationParams = {
        userIds: selectedUsers.value,
        operation: 'deactivate'
      }
      await userService.batchOperation(params)
      clearSelection()
      await loadUsers(searchParams)
      await loadUserStats()
    } catch (error) {
      console.error('批量停用失败:', error)
    }
  }

  const batchDelete = async (
    selectedUsers: Ref<string[]>,
    clearSelection: () => void,
    loadUsers: (searchParams: any) => Promise<void>,
    loadUserStats: () => Promise<void>,
    searchParams: any
  ) => {
    try {
      const params: BatchOperationParams = {
        userIds: selectedUsers.value,
        operation: 'delete'
      }
      await userService.batchOperation(params)
      clearSelection()
      await loadUsers(searchParams)
      await loadUserStats()
    } catch (error) {
      console.error('批量删除失败:', error)
    }
  }

  const batchExport = async (selectedUsers: Ref<string[]>) => {
    try {
      const params = {
        userIds: selectedUsers.value,
        format: 'excel' as const,
        fields: ['username', 'email', 'phone', 'type', 'status', 'balance', 'created_at']
      }
      await userService.exportUsers(params)
    } catch (error) {
      console.error('批量导出失败:', error)
    }
  }

  const batchTypeChange = async (
    type: string,
    selectedUsers: Ref<string[]>,
    clearSelection: () => void,
    loadUsers: (searchParams: any) => Promise<void>,
    loadUserStats: () => Promise<void>,
    searchParams: any
  ) => {
    try {
      const params: BatchOperationParams = {
        userIds: selectedUsers.value,
        operation: 'typeChange',
        data: { type }
      }
      await userService.batchOperation(params)
      clearSelection()
      await loadUsers(searchParams)
      await loadUserStats()
    } catch (error) {
      console.error('批量类型变更失败:', error)
    }
  }

  // 其他业务操作
  const resetPassword = async (
    user: User,
    showConfirm: (config: any) => void,
    showUserMenu: Ref<string>
  ) => {
    showConfirm({
      title: '重置密码确认',
      message: `确定要重置用户 "${user.username || user.email}" 的密码吗？重置后的临时密码为：temp123456`,
      type: 'warning',
      onConfirm: async () => {
        let loadingToastId: string | null = null
        try {
          loadingToastId = toast.loading('正在重置密码...')
          const result = await userService.resetUserPassword({
            userId: user.id,
            newPassword: 'temp123456'
          })
          // 关闭loading通知
          if (loadingToastId) {
            toast.dismiss(loadingToastId)
          }
          toast.success(`密码重置成功！新密码：${result.new_password}`)
          // 关闭用户菜单
          showUserMenu.value = ''
        } catch (error) {
          // 关闭loading通知
          if (loadingToastId) {
            toast.dismiss(loadingToastId)
          }
          console.error('重置密码失败:', error)
          toast.error('重置密码失败，请稍后重试')
        }
      }
    })
  }

  const adjustBalance = async (
    user: User,
    showConfirm: (config: any) => void,
    showUserMenu: Ref<string>
  ) => {
    // 实现余额调整功能
    showConfirm({
      title: '调整余额',
      message: `即将为用户 "${user.username || user.email}" 调整余额。\n\n当前余额：\nUSDT: ${formatCurrency(Number(user.usdt_balance) || 0)}\nTRX: ${formatCurrency(Number(user.trx_balance) || 0)}\n\n请确认是否继续？`,
      type: 'info',
      onConfirm: () => {
        // 这里可以打开余额调整模态框
        toast.info('余额调整功能开发中，敬请期待')
        // TODO: 实现余额调整模态框
        // 关闭用户菜单
        showUserMenu.value = ''
      }
    })
  }

  const viewUserOrders = (
    user: User,
    showConfirm: (config: any) => void,
    showUserMenu: Ref<string>
  ) => {
    // 实现查看用户订单功能
    showConfirm({
      title: '查看用户订单',
      message: `即将查看用户 "${user.username || user.email}" 的订单记录。\n\n用户ID: ${user.id}\n注册时间: ${formatDateTime(user.created_at)}\n\n请确认是否继续？`,
      type: 'info',
      onConfirm: () => {
        // 这里可以跳转到用户订单页面或打开订单模态框
        toast.info('订单查看功能开发中，敬请期待')
        // TODO: 实现跳转到用户订单页面
        // 关闭用户菜单
        showUserMenu.value = ''
      }
    })
  }

  const banUser = async (
    user: User,
    showConfirm: (config: any) => void,
    loadUsers: (searchParams: any) => Promise<void>,
    loadUserStats: () => Promise<void>,
    showUserMenu: Ref<string>,
    searchParams: any
  ) => {
    const action = user.status === 'banned' ? '解封' : '封禁'
    const newStatus = user.status === 'banned' ? 'active' : 'banned'
    
    showConfirm({
      title: `${action}用户确认`,
      message: `确定要${action}用户 "${user.username || user.email}" 吗？\n\n${action}后用户将${newStatus === 'banned' ? '无法登录和使用系统' : '恢复正常使用'}。\n\n此操作不可撤销，请谨慎操作！`,
      type: 'danger',
      onConfirm: async () => {
        let loadingToastId: string | null = null
        try {
          loadingToastId = toast.loading(`正在${action}用户...`)
          await userService.updateUser(user.id, {
            status: newStatus
          })
          // 关闭loading通知
          if (loadingToastId) {
            toast.dismiss(loadingToastId)
          }
          await loadUsers(searchParams)
          await loadUserStats()
          toast.success(`用户${action}成功`)
          // 关闭用户菜单
          showUserMenu.value = ''
        } catch (error) {
          // 关闭loading通知
          if (loadingToastId) {
            toast.dismiss(loadingToastId)
          }
          console.error(`${action}用户失败:`, error)
          toast.error(`${action}用户失败，请稍后重试`)
        }
      }
    })
  }

  return {
    // 用户操作
    saveUser,
    deleteUser,
    
    // 批量操作
    batchActivate,
    batchDeactivate,
    batchDelete,
    batchExport,
    batchTypeChange,
    
    // 其他业务操作
    resetPassword,
    adjustBalance,
    viewUserOrders,
    banUser
  }
}
