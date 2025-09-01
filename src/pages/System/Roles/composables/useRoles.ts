import { ref, reactive } from 'vue'
import type {
  Role,
  Permission,
  RoleQuery,
  PermissionQuery,
  CreateRoleRequest,
  UpdateRoleRequest,
  RolePermissionRequest,
  RoleListResponse,
  RoleDetailResponse,
  PermissionListResponse,
  PermissionTreeResponse,
  RolePermissionResponse,
  RolePermissionsResponse,
  RoleStatsResponse,
  BatchRoleOperation,
  BatchRoleOperationResponse,
  RoleUsersResponse,
  RoleExportData,
  RoleImportRequest,
  RoleImportResponse,
  RoleUsageResponse,
  RoleChangeLogResponse,
  RoleOption,
  PermissionOption,
  RoleConfigResponse,
  RoleConflictCheck,
  RoleConflictResponse,
  RoleApprovalResponse,
  RoleApprovalRequest,
  Pagination,
  ErrorResponse
} from '../types'

export function useRoles() {
  // 响应式状态
  const roles = ref<Role[]>([])
  const permissions = ref<Permission[]>([])
  const rolePermissions = ref<Permission[]>([])
  const rolePermissionIds = ref<number[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = reactive<Pagination>({
    page: 1,
    limit: 10,
    total: 0
  })
  const stats = ref<any>({})

  // 通用请求函数
  const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem('admin_token')
    const response = await fetch(`/api/system${url}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: '请求失败' }))
      throw new Error(errorData.message || '请求失败')
    }

    return response.json()
  }

  // 加载角色列表
  const loadRoles = async (query: RoleQuery = {}) => {
    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()
      if (query.keyword) params.append('keyword', query.keyword)
      if (query.status) params.append('status', query.status)
      if (query.type) params.append('type', query.type)
      if (query.page) params.append('page', query.page.toString())
      if (query.limit) params.append('limit', query.limit.toString())

      const response = await request<RoleListResponse>(`/roles?${params}`)
      
      if (response.success) {
        roles.value = response.data.roles || []
        Object.assign(pagination, {
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total
        })
      } else {
        throw new Error(response.message)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载角色列表失败'
      console.error('加载角色列表失败:', err)
      // 确保roles始终是数组，避免undefined导致的length读取错误
      roles.value = []
    } finally {
      loading.value = false
    }
  }

  // 获取角色详情
  const getRole = async (id: number): Promise<Role | null> => {
    try {
      const response = await request<RoleDetailResponse>(`/roles/${id}`)
      return response.success ? response.data : null
    } catch (err) {
      console.error('获取角色详情失败:', err)
      return null
    }
  }

  // 创建角色
  const createRole = async (data: Partial<Role>): Promise<boolean> => {
    try {
      const response = await request<RoleDetailResponse>('/roles', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return response.success
    } catch (err) {
      console.error('创建角色失败:', err)
      throw err
    }
  }

  // 更新角色
  const updateRole = async (id: number, data: Partial<Role>): Promise<boolean> => {
    try {
      const response = await request<RoleDetailResponse>(`/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
      return response.success
    } catch (err) {
      console.error('更新角色失败:', err)
      throw err
    }
  }

  // 删除角色
  const deleteRole = async (id: number): Promise<boolean> => {
    try {
      const response = await request<{ success: boolean; message: string }>(`/roles/${id}`, {
        method: 'DELETE'
      })
      return response.success
    } catch (err) {
      console.error('删除角色失败:', err)
      throw err
    }
  }

  // 加载权限列表
  const loadPermissions = async (query: PermissionQuery = {}) => {
    try {
      const params = new URLSearchParams()
      if (query.keyword) params.append('keyword', query.keyword)
      if (query.type) params.append('type', query.type)
      if (query.parent_id) params.append('parent_id', query.parent_id.toString())
      if (query.page) params.append('page', query.page.toString())
      if (query.limit) params.append('limit', query.limit.toString())

      const response = await request<PermissionListResponse>(`/permissions?${params}`)
      
      if (response.success) {
        permissions.value = response.data.data
      }
    } catch (err) {
      console.error('加载权限列表失败:', err)
      // 确保permissions始终是数组，避免undefined导致的渲染错误
      permissions.value = []
    }
  }

  // 获取权限树
  const getPermissionTree = async (): Promise<Permission[]> => {
    try {
      const response = await request<PermissionTreeResponse>('/permissions/tree')
      return response.success ? response.data : []
    } catch (err) {
      console.error('获取权限树失败:', err)
      return []
    }
  }

  // 获取角色权限
  const getRolePermissions = async (roleId: number): Promise<number[]> => {
    try {
      const response = await request<RolePermissionsResponse>(`/roles/${roleId}/permissions`)
      if (response.success && Array.isArray(response.data)) {
        rolePermissionIds.value = response.data
        return response.data
      }
      // 确保返回数组
      rolePermissionIds.value = []
      return []
    } catch (err) {
      console.error('获取角色权限失败:', err)
      // 确保在错误情况下也返回数组
      rolePermissionIds.value = []
      return []
    }
  }

  // 配置角色权限
  const configRolePermissions = async (data: RolePermissionRequest): Promise<boolean> => {
    try {
      const response = await request<{ success: boolean; message: string }>(
        `/roles/${data.role_id}/permissions`,
        {
          method: 'PUT',
          body: JSON.stringify({ menu_ids: data.permission_ids })
        }
      )
      return response.success
    } catch (err) {
      console.error('配置角色权限失败:', err)
      throw err
    }
  }

  // 批量操作角色
  const batchOperateRoles = async (operation: BatchRoleOperation): Promise<any> => {
    try {
      const response = await request<BatchRoleOperationResponse>('/roles/batch', {
        method: 'POST',
        body: JSON.stringify(operation)
      })
      return response.success ? response.data : null
    } catch (err) {
      console.error('批量操作角色失败:', err)
      throw err
    }
  }

  // 加载角色统计
  const loadRoleStats = async () => {
    try {
      const response = await request<RoleStatsResponse>('/roles/stats')
      if (response.success) {
        stats.value = response.data
      }
    } catch (err) {
      console.error('加载角色统计失败:', err)
      // 确保stats始终是对象，避免undefined导致的渲染错误
      stats.value = {}
    }
  }

  // 获取角色用户列表
  const getRoleUsers = async (roleId: number, page = 1, perPage = 10) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      })
      const response = await request<RoleUsersResponse>(`/roles/${roleId}/users?${params}`)
      return response.success ? response.data : null
    } catch (err) {
      console.error('获取角色用户列表失败:', err)
      return null
    }
  }

  // 导出角色数据
  const exportRoles = async (roleIds?: number[]): Promise<Blob | null> => {
    try {
      const body = roleIds ? JSON.stringify({ role_ids: roleIds }) : undefined
      const response = await fetch('/api/system/roles/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body
      })

      if (!response.ok) {
        throw new Error('导出失败')
      }

      return response.blob()
    } catch (err) {
      console.error('导出角色数据失败:', err)
      return null
    }
  }

  // 导入角色数据
  const importRoles = async (request: RoleImportRequest): Promise<any> => {
    try {
      const formData = new FormData()
      formData.append('file', request.file)
      formData.append('overwrite_existing', request.overwrite_existing.toString())

      const response = await fetch('/api/system/roles/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: formData
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || '导入失败')
      }

      return result.data
    } catch (err) {
      console.error('导入角色数据失败:', err)
      throw err
    }
  }

  // 获取角色使用情况
  const getRoleUsage = async (): Promise<any[]> => {
    try {
      const response = await request<RoleUsageResponse>('/roles/usage')
      return response.success ? response.data : []
    } catch (err) {
      console.error('获取角色使用情况失败:', err)
      return []
    }
  }

  // 获取角色变更日志
  const getRoleChangeLogs = async (roleId?: number, page = 1, perPage = 10) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      })
      if (roleId) {
        params.append('role_id', roleId.toString())
      }

      const response = await request<RoleChangeLogResponse>(`/roles/change-logs?${params}`)
      return response.success ? response.data : null
    } catch (err) {
      console.error('获取角色变更日志失败:', err)
      return null
    }
  }

  // 获取角色选项
  const getRoleOptions = async (): Promise<RoleOption[]> => {
    try {
      const response = await request<{ success: boolean; data: RoleOption[] }>('/roles/options')
      return response.success ? response.data : []
    } catch (err) {
      console.error('获取角色选项失败:', err)
      return []
    }
  }

  // 获取权限选项
  const getPermissionOptions = async (): Promise<PermissionOption[]> => {
    try {
      const response = await request<{ success: boolean; data: PermissionOption[] }>('/permissions/options')
      return response.success ? response.data : []
    } catch (err) {
      console.error('获取权限选项失败:', err)
      return []
    }
  }

  // 检查角色代码是否可用
  const checkRoleCodeAvailable = async (code: string, excludeId?: number): Promise<boolean> => {
    try {
      const params = new URLSearchParams({ code })
      if (excludeId) {
        params.append('exclude_id', excludeId.toString())
      }
      const response = await request<{ success: boolean; data: { available: boolean } }>(
        `/roles/check-code?${params}`
      )
      return response.success ? response.data.available : false
    } catch (err) {
      console.error('检查角色代码失败:', err)
      return false
    }
  }

  // 获取角色配置
  const getRoleConfig = async () => {
    try {
      const response = await request<RoleConfigResponse>('/roles/config')
      return response.success ? response.data : null
    } catch (err) {
      console.error('获取角色配置失败:', err)
      return null
    }
  }

  // 更新角色配置
  const updateRoleConfig = async (config: any): Promise<boolean> => {
    try {
      const response = await request<{ success: boolean; message: string }>('/roles/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      })
      return response.success
    } catch (err) {
      console.error('更新角色配置失败:', err)
      throw err
    }
  }

  // 检查角色冲突
  const checkRoleConflicts = async (check: RoleConflictCheck) => {
    try {
      const response = await request<RoleConflictResponse>('/roles/check-conflicts', {
        method: 'POST',
        body: JSON.stringify(check)
      })
      return response.success ? response.data : null
    } catch (err) {
      console.error('检查角色冲突失败:', err)
      return null
    }
  }

  // 获取角色审批列表
  const getRoleApprovals = async (page = 1, perPage = 10) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      })
      const response = await request<RoleApprovalResponse>(`/roles/approvals?${params}`)
      return response.success ? response.data : null
    } catch (err) {
      console.error('获取角色审批列表失败:', err)
      return null
    }
  }

  // 处理角色审批
  const processRoleApproval = async (approvalId: number, action: 'approve' | 'reject', reason?: string): Promise<boolean> => {
    try {
      const response = await request<{ success: boolean; message: string }>(
        `/roles/approvals/${approvalId}/${action}`,
        {
          method: 'POST',
          body: JSON.stringify({ reason })
        }
      )
      return response.success
    } catch (err) {
      console.error('处理角色审批失败:', err)
      throw err
    }
  }

  // 重置状态
  const resetState = () => {
    roles.value = []
    permissions.value = []
    rolePermissions.value = []
    rolePermissionIds.value = []
    loading.value = false
    error.value = null
    Object.assign(pagination, {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 0,
      from: 0,
      to: 0
    })
    stats.value = {}
  }

  return {
    // 状态
    roles,
    permissions,
    rolePermissions,
    rolePermissionIds,
    loading,
    error,
    pagination,
    stats,

    // 角色管理
    loadRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    batchOperateRoles,
    loadRoleStats,
    getRoleUsers,
    exportRoles,
    importRoles,
    getRoleUsage,
    getRoleChangeLogs,
    getRoleOptions,
    checkRoleCodeAvailable,

    // 权限管理
    loadPermissions,
    getPermissionTree,
    getRolePermissions,
    configRolePermissions,
    getPermissionOptions,

    // 配置管理
    getRoleConfig,
    updateRoleConfig,
    checkRoleConflicts,

    // 审批管理
    getRoleApprovals,
    processRoleApproval,

    // 工具函数
    resetState
  }
}