import { reactive, ref } from 'vue'
import type {
    AdminOption,
    AdminPermissionInfo,
    AdminPermissionResponse,
    AdminRole,
    AdminRoleApproval,
    AdminRoleApprovalRequest,
    AdminRoleApprovalResponse,
    AdminRoleAssignRequest,
    AdminRoleAssignResponse,
    AdminRoleConfig,
    AdminRoleConfigResponse,
    AdminRoleHistory,
    AdminRoleImportRequest,
    AdminRoleImportResponse,
    AdminRoleInfo,
    AdminRoleListResponse,
    AdminRoleQuery,
    AdminRoleStats,
    BatchAdminRoleOperation,
    BatchOperationResponse,
    Pagination,
    RoleConflictCheck,
    RoleConflictResponse,
    RoleOption
} from '../types'

export function useAdminRoles() {
  // 状态
  const adminRoles = ref<AdminRoleInfo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = reactive<Pagination>({
    page: 1,
    page_size: 20,
    total: 0,
    pages: 0
  })
  const stats = ref<AdminRoleStats | null>(null)

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

  // 获取管理员角色列表
  const getAdminRoles = async (query: AdminRoleQuery = {}) => {
    loading.value = true
    error.value = ''
    
    try {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
      
      const url = params.toString() ? `/api/system/admin-roles?${params.toString()}` : '/api/system/admin-roles'
      const response = await request<AdminRoleListResponse>(url, {
        method: 'GET'
      })
      
      if (response.success) {
        adminRoles.value = response.data.list
        pagination.page = response.data.pagination.page
        pagination.page_size = response.data.pagination.page_size
        pagination.total = response.data.pagination.total
        pagination.pages = response.data.pagination.pages
      } else {
        error.value = response.message
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取管理员角色列表失败'
    } finally {
      loading.value = false
    }
  }

  // 获取管理员权限
  const getAdminPermissions = async (adminId: string) => {
    loading.value = true
    error.value = ''
    
    try {
      const response = await request<AdminPermissionResponse>(`/api/system/admin-roles/admin/${adminId}`, {
        method: 'GET'
      })
      
      if (response.success) {
        return response.data
      } else {
        error.value = response.message
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取管理员权限失败'
      return null
    } finally {
      loading.value = false
    }
  }

  // 转换权限数据格式
  const transformPermissionData = (rawData: any): AdminPermissionInfo => {
    console.log('原始权限数据:', rawData)
    
    // 将简单的权限字符串数组转换为前端期望的对象数组
    const permissions = (rawData.permissions || []).map((permissionKey: string, index: number) => {
      // 解析权限字符串，例如 "system:user:list" -> resource: "system:user", action: "list"
      const parts = permissionKey.split(':')
      const action = parts.pop() || 'unknown'
      const resource = parts.join(':') || 'unknown'
      
      return {
        id: index + 1,
        name: permissionKey, // 使用权限key作为名称
        key: permissionKey,
        type: 'menu',
        resource: resource,
        action: action,
        description: `${resource} - ${action}`,
        source: 'role' as const,
        source_name: (rawData.roles || []).map((r: any) => r.name).join(', ') || '系统角色'
      }
    })

    // 处理直接权限
    const directPermissions = (rawData.direct_permissions || []).map((permissionKey: string, index: number) => {
      const parts = permissionKey.split(':')
      const action = parts.pop() || 'unknown'
      const resource = parts.join(':') || 'unknown'
      
      return {
        id: permissions.length + index + 1,
        name: permissionKey,
        key: permissionKey,
        type: 'menu',
        resource: resource,
        action: action,
        description: `${resource} - ${action}`,
        source: 'direct' as const,
        source_name: '直接分配'
      }
    })

    // 处理角色信息，为每个角色分配对应的权限
    const roles = (rawData.roles || []).map((role: any) => {
      // 为角色分配所有来自角色的权限（因为后端返回的permissions是所有角色权限的合集）
      const rolePermissions = permissions.filter(p => p.source === 'role')
      
      return {
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description,
        permissions: rolePermissions
      }
    })

    const result = {
      admin_id: rawData.admin_id || rawData.id,
      username: rawData.username,
      permissions: [...permissions, ...directPermissions],
      roles: roles
    }
    
    console.log('转换后的权限数据:', result)
    return result
  }

  // 获取用户权限 (alias for getAdminPermissions)
  const getUserPermissions = async (userId: string): Promise<AdminPermissionInfo | null> => {
    const rawData = await getAdminPermissions(userId)
    if (rawData) {
      return transformPermissionData(rawData)
    }
    return null
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
  const assignAdminRoles = async (assignRequest: AdminRoleAssignRequest) => {
    loading.value = true
    error.value = ''
    
    try {
      const response = await request<AdminRoleAssignResponse>('/api/system/admin-roles', {
        method: 'POST',
        body: JSON.stringify(assignRequest)
      })
      
      if (response.success) {
        // 重新加载列表
        await getAdminRoles({ page: pagination.page })
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
  const batchOperateAdminRoles = async (data: BatchAdminRoleOperation): Promise<BatchOperationResponse | null> => {
    loading.value = true
    error.value = ''
    
    try {
      const response = await request<BatchOperationResponse>('/api/system/admin-roles/batch', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      
      if (response.success) {
        // 重新加载列表
        await getAdminRoles({ page: pagination.page })
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

  // 加载统计信息
  const loadStats = async (): Promise<void> => {
    try {
      const response = await request<{ success: boolean; data: AdminRoleStats }>('/api/system/admin-roles/stats')
      if (response.success) {
        stats.value = response.data
      } else {
        console.error('获取统计信息失败:', response)
        stats.value = {
          total_users: 0,
          active_users: 0,
          inactive_users: 0,
          users_with_roles: 0,
          users_without_roles: 0,
          role_distribution: [],
          department_distribution: []
        }
      }
    } catch (err) {
      console.error('加载统计信息失败:', err)
      stats.value = {
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
        users_with_roles: 0,
        users_without_roles: 0,
        role_distribution: [],
        department_distribution: []
      }
    }
  }

  // 获取管理员角色历史记录 (暂时禁用 - 后端API不存在)
  const getAdminRoleHistory = async (query: AdminRoleQuery = {}): Promise<AdminRoleHistory[] | null> => {
    return []
  }

  // 导出管理员角色 (暂时禁用 - 后端API不存在)
  const exportAdminRoles = async (query: AdminRoleQuery = {}): Promise<boolean> => {
    return false
  }

  // 导入管理员角色 (暂时禁用 - 后端API不存在)
  const importAdminRoles = async (importRequest: AdminRoleImportRequest): Promise<AdminRoleImportResponse> => {
    return {
      success: false,
      message: '导入功能暂时不可用',
      data: {
        total: 0,
        success_count: 0,
        failed_count: 0,
        failed_items: []
      }
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

  // 获取管理员角色配置 (暂时禁用 - 后端API不存在)
  const getAdminRoleConfig = async (): Promise<AdminRoleConfig | null> => {
    return {
      allow_multiple_roles: true,
      require_approval: false,
      auto_inherit_permissions: true,
      role_priority_enabled: false,
      max_roles_per_user: 5
    }
  }

  // 更新管理员角色配置 (暂时禁用 - 后端API不存在)
  const updateAdminRoleConfig = async (config: AdminRoleConfig): Promise<AdminRoleConfigResponse> => {
    return {
      success: false,
      message: '更新配置功能暂时不可用',
      data: config
    }
  }

  // 检查角色冲突 (暂时禁用 - 后端API不存在)
  const checkRoleConflicts = async (data: RoleConflictCheck): Promise<RoleConflictResponse | null> => {
    return {
      success: true,
      message: '无冲突',
      data: {
        has_conflicts: false,
        conflicts: []
      }
    }
  }

  // 获取管理员角色审批列表 (暂时禁用 - 后端API不存在)
  const getAdminRoleApprovals = async (query: AdminRoleQuery = {}): Promise<AdminRoleApproval[] | null> => {
    return []
  }

  // 处理管理员角色审批 (暂时禁用 - 后端API不存在)
  const processAdminRoleApproval = async (approvalRequest: AdminRoleApprovalRequest): Promise<AdminRoleApprovalResponse> => {
    return {
      success: false,
      message: '审批处理功能暂时不可用',
      data: null
    }
  }

  // 重置状态
  const resetState = () => {
    adminRoles.value = []
    error.value = null
    Object.assign(pagination, {
      page: 1,
      page_size: 20,
      total: 0,
      pages: 0
    })
    stats.value = null
  }

  return {
    // 状态
    adminRoles,
    loading,
    error,
    pagination,
    stats,

    // 方法
    getAdminRoles,
    getAdminPermissions,
    getAdminRolesByAdminId,
    getUserPermissions,
    assignAdminRoles,
    removeAdminRoles,
    batchOperateAdminRoles,
    loadStats,
    getAdminRoleHistory,
    exportAdminRoles,
    importAdminRoles,
    getRoleOptions,
    getAdminOptions,
    getAdminRoleConfig,
    updateAdminRoleConfig,
    checkRoleConflicts,
    getAdminRoleApprovals,
    processAdminRoleApproval,
    resetState
  }
}