import { reactive, ref } from 'vue'
import type {
    AdminRoleInfo,
    AdminRoleListResponse,
    AdminRoleQuery,
    Pagination
} from '../types'

// 导入子模块
import { useAdminPermissions } from './useAdminPermissions'
import { useRoleAssignment } from './useRoleAssignment'
import { useRoleHistory } from './useRoleHistory'
import { useRoleStats } from './useRoleStats'
import { useRoleValidation } from './useRoleValidation'

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

  // 初始化子模块
  const permissionsModule = useAdminPermissions()
  const assignmentModule = useRoleAssignment()
  const historyModule = useRoleHistory()
  const statsModule = useRoleStats()
  const validationModule = useRoleValidation()

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
    statsModule.stats.value = null
  }

  // 增强分配角色功能，添加成功后的回调
  const assignAdminRoles = (assignRequest: any) => {
    return assignmentModule.assignAdminRoles(assignRequest, () => getAdminRoles({ page: pagination.page }))
  }

  // 增强批量操作功能，添加成功后的回调
  const batchOperateAdminRoles = (data: any) => {
    return assignmentModule.batchOperateAdminRoles(data, () => getAdminRoles({ page: pagination.page }))
  }

  return {
    // 核心状态
    adminRoles,
    loading,
    error,
    pagination,
    
    // 来自子模块的状态
    stats: statsModule.stats,

    // 核心方法
    getAdminRoles,
    resetState,

    // 权限管理方法（来自 useAdminPermissions）
    getAdminPermissions: permissionsModule.getAdminPermissions,
    getUserPermissions: permissionsModule.getUserPermissions,
    getPermissionDisplayName: permissionsModule.getPermissionDisplayName,
    getPermissionCategory: permissionsModule.getPermissionCategory,
    transformPermissionData: permissionsModule.transformPermissionData,

    // 角色分配方法（来自 useRoleAssignment）
    getAdminRolesByAdminId: assignmentModule.getAdminRolesByAdminId,
    assignAdminRoles, // 使用增强版本
    removeAdminRoles: assignmentModule.removeAdminRoles,
    batchOperateAdminRoles, // 使用增强版本
    getRoleOptions: assignmentModule.getRoleOptions,
    getAdminOptions: assignmentModule.getAdminOptions,

    // 历史记录方法（来自 useRoleHistory）
    getAdminRoleHistory: historyModule.getAdminRoleHistory,
    exportAdminRoles: historyModule.exportAdminRoles,
    importAdminRoles: historyModule.importAdminRoles,

    // 统计方法（来自 useRoleStats）
    loadStats: statsModule.loadStats,

    // 验证方法（来自 useRoleValidation）
    getAdminRoleConfig: validationModule.getAdminRoleConfig,
    updateAdminRoleConfig: validationModule.updateAdminRoleConfig,
    checkRoleConflicts: validationModule.checkRoleConflicts,
    getAdminRoleApprovals: validationModule.getAdminRoleApprovals,
    processAdminRoleApproval: validationModule.processAdminRoleApproval
  }
}