/**
 * 管理员页面表单处理组合式函数
 * 从 useAdminPage.ts 中安全分离的表单逻辑
 */

import { useToast } from '../../../composables/useToast'
import type { Admin, CreateAdminRequest, UpdateAdminRequest } from '../types'
import { useAdminNetwork } from './useAdminNetwork'
import { useAdminStore } from './useAdminStore'

export function useAdminForm() {
  const adminStore = useAdminStore()
  const { success } = useToast()
  const { handleApiError } = useAdminNetwork()

  // 处理表单提交
  const handleFormSubmit = async (
    data: CreateAdminRequest | UpdateAdminRequest,
    admin: Admin | null,
    setLoading: (loading: boolean) => void,
    closeModal: () => void
  ) => {
    setLoading(true)
    
    try {
      const isEdit = !!admin
      const operation = isEdit ? '更新管理员' : '创建管理员'
      
      if (isEdit) {
        await adminStore.updateAdmin(admin!.id, data as UpdateAdminRequest)
      } else {
        await adminStore.createAdmin(data as CreateAdminRequest)
      }
      
      if (adminStore.error.value) {
        handleApiError(new Error(adminStore.error.value), operation)
        return
      }
      
      success(isEdit ? '管理员更新成功' : '管理员创建成功')
      closeModal()
      
      // 刷新数据
      await Promise.all([
        adminStore.fetchAdmins(),
        adminStore.fetchStats()
      ])
    } catch (error) {
      const operation = admin ? '更新管理员' : '创建管理员'
      handleApiError(error, operation)
    } finally {
      setLoading(false)
    }
  }

  // 处理权限保存
  const handlePermissionSaved = async () => {
    try {
      success('权限配置保存成功')
      await adminStore.fetchAdmins()
      
      if (adminStore.error.value) {
        handleApiError(new Error(adminStore.error.value), '刷新管理员数据')
      }
    } catch (error) {
      handleApiError(error, '刷新管理员数据')
    }
  }

  // 处理角色分配
  const handleRoleAssign = async (adminId: string, roleId: number, reason?: string) => {
    try {
      await adminStore.assignRole(adminId, roleId)
      
      if (adminStore.error.value) {
        handleApiError(new Error(adminStore.error.value), '角色分配')
        return
      }
      
      success('角色分配成功')
      
      // 刷新数据
      await Promise.all([
        adminStore.fetchAdmins(),
        adminStore.fetchStats()
      ])
    } catch (error) {
      handleApiError(error, '角色分配')
    }
  }

  // 处理角色分配保存
  const handleRoleAssignSaved = async () => {
    try {
      success('角色分配成功')
      await adminStore.fetchAdmins()
      
      if (adminStore.error.value) {
        handleApiError(new Error(adminStore.error.value), '刷新管理员数据')
      }
    } catch (error) {
      handleApiError(error, '刷新管理员数据')
    }
  }

  return {
    // 方法
    handleFormSubmit,
    handlePermissionSaved,
    handleRoleAssign,
    handleRoleAssignSaved
  }
}
