import { ref } from 'vue'
import type {
    AdminRoleHistory,
    AdminRoleImportRequest,
    AdminRoleImportResponse,
    AdminRoleQuery
} from '../types'

export function useRoleHistory() {
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

  return {
    // 状态
    loading,
    error,

    // 方法
    getAdminRoleHistory,
    exportAdminRoles,
    importAdminRoles
  }
}
