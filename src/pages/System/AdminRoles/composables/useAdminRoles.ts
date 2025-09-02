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
  const adminRoles = ref<AdminRoleInfo[]>([]) // 确保初始值为空数组
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = reactive<Pagination>({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0
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
        adminRoles.value = response.data.admins || []
        pagination.page = response.data.pagination.page
        pagination.page_size = response.data.pagination.page_size
        pagination.total = response.data.pagination.total
        pagination.total_pages = response.data.pagination.total_pages
      } else {
        error.value = response.message
        adminRoles.value = [] // 确保失败时也设置为空数组
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取管理员角色列表失败'
      adminRoles.value = [] // 确保异常时也设置为空数组
    } finally {
      loading.value = false
    }
  }

  // 获取管理员权限
  const getAdminPermissions = async (adminId: string) => {
    loading.value = true
    error.value = ''
    
    try {
      const response = await request<AdminPermissionResponse>(`/api/system/admin-roles/admin/${adminId}/permissions`, {
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

  // 权限名称映射表
  const getPermissionDisplayName = (permissionKey: string): string => {
    const permissionMap: Record<string, string> = {
      // 仪表板
      'dashboard:view': '仪表板查看',
      
      // 用户管理
      'user:list': '用户列表',
      'user:create': '创建用户',
      'user:edit': '编辑用户',
      'user:delete': '删除用户',
      'user:view': '查看用户详情',
      
      // 代理商管理
      'agent:list': '代理商列表',
      'agent:create': '创建代理商',
      'agent:edit': '编辑代理商',
      'agent:delete': '删除代理商',
      'agent:view': '查看代理商详情',
      
      // 订单管理
      'order:list': '订单列表',
      'order:create': '创建订单',
      'order:edit': '编辑订单',
      'order:delete': '删除订单',
      'order:view': '查看订单详情',
      'order:refund': '订单退款',
      
      // 机器人管理
      'bot:list': '机器人列表',
      'bot:create': '创建机器人',
      'bot:edit': '编辑机器人',
      'bot:delete': '删除机器人',
      'bot:view': '查看机器人详情',
      'bot:start': '启动机器人',
      'bot:stop': '停止机器人',
      
      // 能量池管理
      'energy:pool': '能量池管理',
      'energy:pool:view': '查看能量池',
      'energy:pool:manage': '管理能量池',
      'energy:pool:add': '新增账户',
      'energy:pool:edit': '编辑账户',
      'energy:pool:delete': '删除账户',
      'energy:pool:toggle': '切换账户状态',
      
      // 能量质押管理
      'energy:stake:manage': '质押管理',
      'business:energy:stake': '能量质押',
      'business:energy:stake:freeze': '质押操作',
      'business:energy:stake:unfreeze': '解质押操作',
      'business:energy:stake:delegate': '委托资源',
      'business:energy:stake:undelegate': '取消委托',
      'business:energy:stake:withdraw': '提取解质押',
      
      // 价格配置
      'price:config': '价格配置',
      'price:view': '查看价格',
      'price:edit': '编辑价格',
      
      // 统计分析
      'statistics:view': '统计分析',
      'statistics:export': '导出统计',
      
      // 监控中心
      'monitoring:view': '监控中心',
      'monitoring:overview': '监控概览',
      'monitoring:database': '数据库监控',
      'monitoring:cache': '缓存监控',
      'monitoring:service': '服务监控',
      'monitoring:tasks': '任务监控',
      'monitoring:users': '用户监控',
      
      // 系统管理
      'system:view': '系统管理',
      'system:user:list': '管理员管理',
      'system:user:create': '创建管理员',
      'system:user:edit': '编辑管理员',
      'system:user:delete': '删除管理员',
      'system:role:list': '角色管理',
      'system:role:create': '创建角色',
      'system:role:edit': '编辑角色',
      'system:role:delete': '删除角色',
      'system:dept:list': '部门管理',
      'system:dept:create': '创建部门',
      'system:dept:edit': '编辑部门',
      'system:dept:delete': '删除部门',
      'system:position:list': '岗位管理',
      'system:position:create': '创建岗位',
      'system:position:edit': '编辑岗位',
      'system:position:delete': '删除岗位',
      'system:menu:list': '菜单管理',
      'system:menu:create': '创建菜单',
      'system:menu:edit': '编辑菜单',
      'system:menu:delete': '删除菜单',
      'system:settings:list': '系统设置',
      'system:settings:edit': '编辑设置',
      
      // 日志管理
      'system:log:view': '日志管理',
      'system:log:login:list': '登录日志',
      'system:log:operation:list': '操作日志',
      'system:log:export': '导出日志'
    }
    
    return permissionMap[permissionKey] || permissionKey
  }

  // 权限分类映射
  const getPermissionCategory = (permissionKey: string): string => {
    if (permissionKey.startsWith('dashboard:')) return '仪表板'
    if (permissionKey.startsWith('user:')) return '用户管理'
    if (permissionKey.startsWith('agent:')) return '代理商管理'
    if (permissionKey.startsWith('order:')) return '订单管理'
    if (permissionKey.startsWith('bot:')) return '机器人管理'
    if (permissionKey.startsWith('energy:') || permissionKey.startsWith('business:energy:')) return '能量管理'
    if (permissionKey.startsWith('price:')) return '价格管理'
    if (permissionKey.startsWith('statistics:')) return '统计分析'
    if (permissionKey.startsWith('monitoring:')) return '监控中心'
    if (permissionKey.startsWith('system:')) return '系统管理'
    return '其他'
  }

  // 转换权限数据格式
  const transformPermissionData = (rawData: any): AdminPermissionInfo => {
    
    // 处理新的后端数据结构：{allPermissions, selectedPermissions, adminId}
    const selectedPermissions = rawData.selectedPermissions || []
    const allPermissions = rawData.allPermissions || []
    
    // 将选中的权限字符串数组转换为前端期望的对象数组
    const permissions = selectedPermissions.map((permissionKey: string, index: number) => {
      // 解析权限字符串，例如 "system:user:list" -> resource: "system:user", action: "list"
      const parts = permissionKey.split(':')
      const action = parts.pop() || 'unknown'
      const resource = parts.join(':') || 'unknown'
      
      // 从allPermissions中查找对应的权限详情
      const permissionDetail = allPermissions.find((p: any) => p.id === permissionKey)
      
      return {
        id: index + 1,
        name: permissionDetail?.name || getPermissionDisplayName(permissionKey), // 使用后端返回的名称或映射名称
        key: permissionKey,
        type: 'menu',
        resource: permissionDetail?.category || getPermissionCategory(permissionKey), // 使用后端返回的分类
        action: action,
        description: permissionDetail?.description || getPermissionCategory(permissionKey),
        source: 'role' as const,
        source_name: '角色权限' // 简化处理，因为当前系统主要通过角色分配权限
      }
    })

    // 处理直接权限（当前系统暂不支持直接权限分配）
    const directPermissions: any[] = []

    // 处理角色信息（从原始数据中获取，如果有的话）
    const roles = (rawData.roles || []).map((role: any) => {
      return {
        id: role.id,
        name: role.name,
        code: role.code || role.name,
        description: role.description,
        permissions: permissions // 当前用户通过此角色获得的所有权限
      }
    })

    const result = {
      admin_id: rawData.adminId || rawData.admin_id,
      username: rawData.username || 'unknown',
      permissions: [...permissions, ...directPermissions],
      roles: roles
    }
    
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