import { ref } from 'vue'
import type {
    AdminOption,
    AdminRole,
    AdminRoleAssignRequest,
    AdminRoleAssignResponse,
    BatchAdminRoleOperation,
    BatchOperationResponse,
    RoleOption
} from '../types'

export function useRoleAssignment() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 通用请求函数
  const request = async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = localStorage.getItem('admin_token')
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // 获取单个管理员的角色列表
  const getAdminRolesByAdminId = async (adminId: string): Promise<AdminRole[]> => {
    try {
      const response = await request<{ success: boolean; data: any[] }>(`/api/system/admin-roles/admin/${adminId}/roles`, {
        method: 'GET'
      })
      
      if (response.success) {
        // 转换后端数据格式为前端期望的格式
        return (response.data || []).map((role: any) => ({
          id: role.id,
          name: role.name,
          description: role.description || '',
          status: 'active', // 后端返回的都是活跃角色
          assigned_at: role.assigned_at,
          assigned_by: 0, // 暂时设为0，实际应该从后端获取
          assigned_by_name: '系统' // 暂时设为系统，实际应该从后端获取
        }))
      } else {
        console.error('获取管理员角色失败:', '请求失败')
        return []
      }
    } catch (err) {
      console.error('获取管理员角色失败:', err)
      return []
    }
  }

  // 分配管理员角色
  const assignAdminRoles = async (assignRequest: AdminRoleAssignRequest, onSuccess?: () => void) => {
    loading.value = true
    error.value = ''
    
    try {
      const response = await request<AdminRoleAssignResponse>('/api/system/admin-roles', {
        method: 'POST',
        body: JSON.stringify(assignRequest)
      })
      
      if (response.success) {
        // 执行成功回调
        if (onSuccess) {
          await onSuccess()
        }
        return true
      } else {
        error.value = response.message || '分配角色失败'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '分配管理员角色失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // 移除管理员角色
  const removeAdminRoles = async (data: AdminRoleAssignRequest): Promise<boolean> => {
    try {
      const response = await request<AdminRoleAssignResponse>(
        '/api/system/admin-roles',
        {
          method: 'DELETE',
          body: JSON.stringify(data)
        }
      )

      if (response.success) {
        return true
      } else {
        throw new Error(response.message)
      }
    } catch (err) {
      console.error('移除管理员角色失败:', err)
      return false
    }
  }

  // 批量操作管理员角色
  const batchOperateAdminRoles = async (data: BatchAdminRoleOperation, onSuccess?: () => void): Promise<BatchOperationResponse | null> => {
    loading.value = true
    error.value = ''
    
    try {
      const response = await request<BatchOperationResponse>('/api/system/admin-roles/batch', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      
      if (response.success) {
        // 执行成功回调
        if (onSuccess) {
          await onSuccess()
        }
        return response
      } else {
        error.value = response.message || '批量操作失败'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量操作管理员角色失败'
      return null
    } finally {
      loading.value = false
    }
  }

  // 获取角色选项
  const getRoleOptions = async (): Promise<RoleOption[]> => {
    try {
      const response = await request<{ success: boolean; data: RoleOption[] }>('/api/system/roles/options')
      return response.success ? response.data : []
    } catch (err) {
      console.error('获取角色选项失败:', err)
      return []
    }
  }

  // 获取管理员选项 (暂时禁用 - 后端API不存在)
  const getAdminOptions = async (query: any = {}): Promise<AdminOption[]> => {
    return []
  }

  return {
    // 状态
    loading,
    error,

    // 方法
    getAdminRolesByAdminId,
    assignAdminRoles,
    removeAdminRoles,
    batchOperateAdminRoles,
    getRoleOptions,
    getAdminOptions
  }
}
