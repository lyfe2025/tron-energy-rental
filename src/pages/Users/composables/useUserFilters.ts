/**
 * 用户搜索筛选逻辑
 * 从 useUserManagement.ts 中安全分离的搜索筛选功能
 */

import { computed, reactive, type Ref } from 'vue'
import type { User, UserSearchParams } from '../types/user.types'

export function useUserFilters() {
  // 搜索和筛选状态
  const searchParams = reactive<UserSearchParams>({
    query: '',
    status: '',
    login_type: '',
    type: '',
    user_type: '',
    bot_filter: '',
    dateRange: {
      start: '',
      end: ''
    }
  })

  // 过滤逻辑
  const createFilteredUsers = (users: Ref<User[]>) => {
    return computed(() => {
      // 安全检查：确保 users.value 是数组
      if (!Array.isArray(users.value)) {
        return []
      }
      
      let result = users.value

      // 搜索过滤
      if (searchParams.query) {
        const query = searchParams.query.toLowerCase()
        result = result.filter(user => 
          user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.phone && user.phone.includes(query))
        )
      }

      // 状态过滤
      if (searchParams.status) {
        result = result.filter(user => user.status === searchParams.status)
      }

      // 登录类型过滤
      if (searchParams.type) {
        result = result.filter(user => user.login_type === searchParams.type)
      }

      // 用户角色过滤
      if (searchParams.user_type) {
        result = result.filter(user => user.user_type === searchParams.user_type)
      }

      // 机器人过滤
      if (searchParams.bot_filter) {
        result = result.filter(user => user.bot_id === searchParams.bot_filter)
      }

      // 日期范围过滤
      if (searchParams.dateRange.start && searchParams.dateRange.end) {
        result = result.filter(user => {
          const userDate = new Date(user.created_at)
          const startDate = new Date(searchParams.dateRange.start)
          const endDate = new Date(searchParams.dateRange.end)
          return userDate >= startDate && userDate <= endDate
        })
      }

      return result
    })
  }

  // 分页逻辑
  const createPaginatedUsers = (filteredUsers: Ref<User[]>, currentPage: Ref<number>, pageSize: Ref<number>) => {
    return computed(() => {
      const filtered = filteredUsers.value
      if (!Array.isArray(filtered)) {
        return []
      }
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filtered.slice(start, end)
    })
  }

  // 计算总页数
  const createTotalPages = (filteredUsers: Ref<User[]>, pageSize: Ref<number>) => {
    return computed(() => {
      const filtered = filteredUsers.value
      if (!Array.isArray(filtered)) {
        return 0
      }
      return Math.ceil(filtered.length / pageSize.value)
    })
  }

  // 搜索方法
  const handleSearch = (query: string, loadUsers: (searchParams: any) => Promise<void>) => {
    searchParams.query = query
    loadUsers(searchParams)
  }

  const handleStatusFilter = (status: string, loadUsers: (searchParams: any) => Promise<void>, handlePageChange: (page: number) => void) => {
    searchParams.status = status as any
    handlePageChange(1)
    loadUsers(searchParams)
  }

  const handleTypeFilter = (type: string, loadUsers: (searchParams: any) => Promise<void>, handlePageChange: (page: number) => void) => {
    searchParams.type = type as any
    handlePageChange(1)
    loadUsers(searchParams)
  }

  const handleUserTypeFilter = (userType: string, loadUsers: (searchParams: any) => Promise<void>, handlePageChange: (page: number) => void) => {
    searchParams.user_type = userType as any
    handlePageChange(1)
    loadUsers(searchParams)
  }

  const handleBotFilter = (botId: string, loadUsers: (searchParams: any) => Promise<void>, handlePageChange: (page: number) => void) => {
    searchParams.bot_filter = botId
    handlePageChange(1)
    loadUsers(searchParams)
  }

  const handleDateRangeFilter = (start: string, end: string, loadUsers: (searchParams: any) => Promise<void>, handlePageChange: (page: number) => void) => {
    searchParams.dateRange.start = start
    searchParams.dateRange.end = end
    handlePageChange(1)
    loadUsers(searchParams)
  }

  const clearFilters = (loadUsers: (searchParams: any) => Promise<void>, handlePageChange: (page: number) => void) => {
    searchParams.query = ''
    searchParams.status = ''
    searchParams.type = ''
    searchParams.user_type = ''
    searchParams.bot_filter = ''
    searchParams.dateRange.start = ''
    searchParams.dateRange.end = ''
    handlePageChange(1)
    loadUsers(searchParams)
  }

  return {
    // 状态
    searchParams,
    
    // 计算属性创建器
    createFilteredUsers,
    createPaginatedUsers,
    createTotalPages,
    
    // 搜索筛选方法
    handleSearch,
    handleStatusFilter,
    handleTypeFilter,
    handleUserTypeFilter,
    handleBotFilter,
    handleDateRangeFilter,
    clearFilters
  }
}
