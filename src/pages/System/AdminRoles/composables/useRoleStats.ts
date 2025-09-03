import { ref } from 'vue'
import type { AdminRoleStats } from '../types'

export function useRoleStats() {
  const stats = ref<AdminRoleStats | null>(null)
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

  return {
    // 状态
    stats,
    loading,
    error,

    // 方法
    loadStats
  }
}
