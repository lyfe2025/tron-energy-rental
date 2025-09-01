import { reactive, ref } from 'vue'
import type {
    AdminOption,
    AdminPermissionInfo,
    AdminPermissionResponse,
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

  // 获取用户权限 (alias for getAdminPermissions)
  const getUserPermissions = async (userId: string): Promise<AdminPermissionInfo | null> => {
    return await getAdminPermissions(userId)
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

  // 批量操作管理员角色 (暂时禁用 - 后端API不存在)
  const batchOperateAdminRoles = async (data: BatchAdminRoleOperation): Promise<BatchOperationResponse | null> => {
    console.warn('批量操作功能暂时不可用 - 后端API未实现')
    return {
      success: false,
      message: '批量操作功能暂时不可用',
      data: {
        total: 0,
        success_count: 0,
        failed_count: 0,
        failed_items: []
      }
    }
  }

  // 加载统计信息 (暂时禁用 - 后端API不存在)
  const loadStats = async (): Promise<void> => {
    console.warn('统计信息功能暂时不可用 - 后端API未实现')
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

  // 获取管理员角色历史记录 (暂时禁用 - 后端API不存在)
  const getAdminRoleHistory = async (query: AdminRoleQuery = {}): Promise<AdminRoleHistory[] | null> => {
    console.warn('管理员角色历史记录功能暂时不可用 - 后端API未实现')
    return []
  }

  // 导出管理员角色 (暂时禁用 - 后端API不存在)
  const exportAdminRoles = async (query: AdminRoleQuery = {}): Promise<boolean> => {
    console.warn('导出管理员角色功能暂时不可用 - 后端API未实现')
    return false
  }

  // 导入管理员角色 (暂时禁用 - 后端API不存在)
  const importAdminRoles = async (importRequest: AdminRoleImportRequest): Promise<AdminRoleImportResponse> => {
    console.warn('导入管理员角色功能暂时不可用 - 后端API未实现')
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

  // 获取角色选项 (暂时禁用 - 后端API不存在)
  const getRoleOptions = async (): Promise<RoleOption[]> => {
    console.warn('获取角色选项功能暂时不可用 - 后端API未实现')
    return []
  }

  // 获取管理员选项 (暂时禁用 - 后端API不存在)
  const getAdminOptions = async (query: any = {}): Promise<AdminOption[]> => {
    console.warn('获取管理员选项功能暂时不可用 - 后端API未实现')
    return []
  }

  // 获取管理员角色配置 (暂时禁用 - 后端API不存在)
  const getAdminRoleConfig = async (): Promise<AdminRoleConfig | null> => {
    console.warn('获取管理员角色配置功能暂时不可用 - 后端API未实现')
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
    console.warn('更新管理员角色配置功能暂时不可用 - 后端API未实现')
    return {
      success: false,
      message: '更新配置功能暂时不可用',
      data: config
    }
  }

  // 检查角色冲突 (暂时禁用 - 后端API不存在)
  const checkRoleConflicts = async (data: RoleConflictCheck): Promise<RoleConflictResponse | null> => {
    console.warn('检查角色冲突功能暂时不可用 - 后端API未实现')
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
    console.warn('获取管理员角色审批列表功能暂时不可用 - 后端API未实现')
    return []
  }

  // 处理管理员角色审批 (暂时禁用 - 后端API不存在)
  const processAdminRoleApproval = async (approvalRequest: AdminRoleApprovalRequest): Promise<AdminRoleApprovalResponse> => {
    console.warn('处理管理员角色审批功能暂时不可用 - 后端API未实现')
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