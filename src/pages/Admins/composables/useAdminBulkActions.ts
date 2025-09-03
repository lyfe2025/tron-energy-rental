/**
 * 管理员页面批量操作组合式函数
 * 从 useAdminPage.ts 中安全分离的批量操作逻辑
 */

import { ref } from 'vue'
import { useToast } from '../../../composables/useToast'
import type { Admin } from '../types'
import { useAdminNetwork } from './useAdminNetwork'
import { useAdminStore } from './useAdminStore'

export function useAdminBulkActions() {
  const adminStore = useAdminStore()
  const toast = useToast()
  const { handleApiError } = useAdminNetwork()

  // 选中的管理员
  const selectedAdmins = ref<string[]>([])

  // 处理选择变化
  const handleSelectionChange = (selected: string[]) => {
    selectedAdmins.value = selected
  }

  // 清除选择
  const clearSelection = () => {
    selectedAdmins.value = []
  }

  // 处理删除
  const handleDelete = (
    admin: Admin,
    setConfirmDialog: (config: any) => void,
    closeConfirmDialog: () => void
  ) => {
    setConfirmDialog({
      visible: true,
      title: '确认删除',
      message: `确定要删除管理员 "${admin.username}" 吗？此操作不可撤销。`,
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog((prev: any) => ({ ...prev, loading: true }))
        try {
          await adminStore.deleteAdmin(admin.id)
          
          if (adminStore.error.value) {
            handleApiError(new Error(adminStore.error.value), '删除管理员')
            return
          }
          
          toast.success(`管理员 "${admin.username}" 删除成功`)
          
          await Promise.all([
            adminStore.fetchAdmins(),
            adminStore.fetchStats()
          ])
          
          closeConfirmDialog()
        } catch (error) {
          handleApiError(error, '删除管理员')
        } finally {
          setConfirmDialog((prev: any) => ({ ...prev, loading: false }))
        }
      }
    })
  }

  // 处理批量操作
  const handleBulkAction = async (
    action: string,
    adminIds: string[],
    setConfirmDialog: (config: any) => void,
    closeConfirmDialog: () => void
  ) => {
    const actionMap: Record<string, { title: string; message: string; type: 'info' | 'warning' | 'danger' }> = {
      enable: {
        title: '批量启用',
        message: `确定要启用选中的 ${adminIds.length} 个管理员吗？`,
        type: 'info'
      },
      disable: {
        title: '批量停用',
        message: `确定要停用选中的 ${adminIds.length} 个管理员吗？`,
        type: 'warning'
      },
      delete: {
        title: '批量删除',
        message: `确定要删除选中的 ${adminIds.length} 个管理员吗？此操作不可撤销。`,
        type: 'danger'
      }
    }
    
    const config = actionMap[action]
    if (!config) return
    
    setConfirmDialog({
      visible: true,
      title: config.title,
      message: config.message,
      type: config.type,
      loading: false,
      onConfirm: async () => {
        setConfirmDialog((prev: any) => ({ ...prev, loading: true }))
        try {
          await adminStore.bulkAction(action, adminIds)
          
          if (adminStore.error.value) {
            handleApiError(new Error(adminStore.error.value), config.title)
            return
          }
          
          const actionMessages: Record<string, string> = {
            enable: `成功启用 ${adminIds.length} 个管理员`,
            disable: `成功停用 ${adminIds.length} 个管理员`,
            delete: `成功删除 ${adminIds.length} 个管理员`
          }
          
          toast.success(actionMessages[action] || '批量操作完成')
          
          await Promise.all([
            adminStore.fetchAdmins(),
            adminStore.fetchStats()
          ])
          
          clearSelection()
          closeConfirmDialog()
        } catch (error) {
          handleApiError(error, config.title)
        } finally {
          setConfirmDialog((prev: any) => ({ ...prev, loading: false }))
        }
      }
    })
  }

  return {
    // 状态
    selectedAdmins,
    
    // 方法
    handleSelectionChange,
    clearSelection,
    handleDelete,
    handleBulkAction
  }
}
