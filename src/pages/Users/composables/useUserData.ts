/**
 * 用户数据状态管理
 * 从 useUserManagement.ts 中安全分离的数据管理功能
 */

import { userService } from '@/services/userService'
import { Calendar, Shield, TrendingUp, UserCheck, Users, Wallet } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import type {
    AllUserStatus,
    User,
    UserListParams,
    UserRole,
    UserStats,
} from '../types/user.types'

// 统计卡片接口
export interface StatCard {
  label: string
  value: string | number
  icon: any
  bgColor: string
  iconColor: string
  change?: string
  changeColor?: string
}

export function useUserData() {
  // 响应式状态
  const isLoading = ref(false)
  const users = ref<User[]>([])
  const rawUserStats = ref<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    bannedUsers: 0,
    newUsersToday: 0,
    newUsersThisMonth: 0,
    totalBalance: 0,
    averageBalance: 0
  })
  
  // 分页状态
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalUsers = ref(0)

  // 统计卡片数据
  const userStats = computed((): StatCard[] => [
    {
      label: '总用户数',
      value: rawUserStats.value.totalUsers,
      icon: Users,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      label: '活跃用户',
      value: rawUserStats.value.activeUsers,
      icon: UserCheck,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      label: '封禁用户',
      value: rawUserStats.value.bannedUsers,
      icon: Shield,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      label: '今日新用户',
      value: rawUserStats.value.newUsersToday,
      icon: TrendingUp,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      label: '本月新用户',
      value: rawUserStats.value.newUsersThisMonth,
      icon: Calendar,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      label: '用户总余额',
      value: `$${(rawUserStats.value.totalBalance || 0).toFixed(2)}`,
      icon: Wallet,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    }
  ])

  // 数据加载方法
  const loadUsers = async (searchParams: {
    query?: string
    status?: string
    type?: string
    user_type?: string
    dateRange?: { start: string; end: string }
  }) => {
    try {
      isLoading.value = true
      const params: UserListParams = {
        page: currentPage.value,
        pageSize: pageSize.value,
        search: searchParams.query || undefined,
        status: searchParams.status as AllUserStatus || undefined,
        type: (searchParams.type === 'telegram_user') ? 'user' : searchParams.type as UserRole || undefined,
        user_type: searchParams.user_type as 'normal' | 'vip' | 'premium' || undefined,
        dateFrom: searchParams.dateRange?.start || undefined,
        dateTo: searchParams.dateRange?.end || undefined
      }
      
      console.debug('Loading users with params:', params)
      const response = await userService.getUserList(params)
      console.debug('User service response:', response)
      
      // 确保返回的数据结构正确
      if (response && typeof response === 'object') {
        users.value = Array.isArray(response.users) ? response.users : []
        totalUsers.value = typeof response.total === 'number' ? response.total : 0
        console.debug('Users loaded:', users.value.length, 'Total:', totalUsers.value)
        console.debug('First user sample:', users.value[0])
      } else {
        console.debug('Invalid response structure:', response)
        users.value = []
        totalUsers.value = 0
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      // 确保在错误情况下也有正确的初始值
      users.value = []
      totalUsers.value = 0
    } finally {
      isLoading.value = false
    }
  }

  const loadUserStats = async () => {
    try {
      const stats = await userService.getUserStats()
      // 确保返回的数据结构正确
      if (stats && typeof stats === 'object') {
        rawUserStats.value = {
          totalUsers: stats.totalUsers || 0,
          activeUsers: stats.activeUsers || 0,
          inactiveUsers: stats.inactiveUsers || 0,
          bannedUsers: stats.bannedUsers || 0,
          newUsersToday: stats.newUsersToday || 0,
          newUsersThisMonth: stats.newUsersThisMonth || 0,
          totalBalance: stats.totalBalance || 0,
          averageBalance: stats.averageBalance || 0
        }
      }
    } catch (error) {
      console.error('加载用户统计失败:', error)
      // 保持默认值，避免页面崩溃
    }
  }

  // 分页方法
  const handlePageChange = (page: number) => {
    currentPage.value = page
  }

  return {
    // 响应式状态
    isLoading,
    users,
    userStats,
    rawUserStats,
    currentPage,
    pageSize,
    totalUsers,
    
    // 数据加载方法
    loadUsers,
    loadUserStats,
    handlePageChange
  }
}
