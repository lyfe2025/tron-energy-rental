/**
 * 用户管理服务
 * 封装用户相关的 API 调用
 */
import { usersAPI, statisticsAPI } from './api'
import type {
  User,
  UserStats,
  UserListParams,
  UserListResponse,
  CreateUserParams,
  UpdateUserParams,
  BatchOperationParams,
  ResetPasswordParams,
  ExportUsersParams
} from '../pages/Users/types/user.types'
import type { ApiResponse, PaginatedResponse } from './api'

export const userService = {
  /**
   * 获取用户列表
   */
  async getUserList(params: UserListParams): Promise<UserListResponse> {
    console.debug('userService.getUserList called with params:', params)
    
    const apiParams = {
      page: params.page,
      limit: params.pageSize,
      search: params.search,
      status: params.status,
      role: params.role,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo
    }
    
    console.debug('Calling usersAPI.getUsers with:', apiParams)
    const response = await usersAPI.getUsers(apiParams)
    console.debug('usersAPI.getUsers response:', response)
    
    // API返回的数据结构是 {data: {items: [], total, page, limit, totalPages}}
    const responseData = response.data.data
    console.debug('Response data:', responseData)
    
    const result = {
      users: responseData.items || [],
      total: responseData.total || 0,
      page: responseData.page || 1,
      pageSize: responseData.limit || 10,
      totalPages: responseData.totalPages || 1
    }
    
    console.debug('userService.getUserList returning:', result)
    return result
  },

  /**
   * 获取用户统计数据
   */
  async getUserStats(): Promise<UserStats> {
    try {
      // 这里可能需要调用统计 API 或者从用户列表中计算
      // 暂时返回模拟数据，实际应该从 API 获取
      const response = await usersAPI.getUsers({ limit: 1000 })
      const users = response?.data?.data?.items
      
      // 安全检查：确保 users 是数组
      if (!Array.isArray(users)) {
        return {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          bannedUsers: 0,
          newUsersToday: 0,
          newUsersThisMonth: 0,
          totalBalance: 0,
          averageBalance: 0
        }
      }
      
      const totalUsers = users.length
      const activeUsers = users.filter(u => u.status === 'active').length
      const inactiveUsers = users.filter(u => u.status === 'inactive').length
      const bannedUsers = users.filter(u => u.status === 'banned').length
      
      // 计算今日新用户（简化实现）
      const today = new Date().toISOString().split('T')[0]
      const newUsersToday = users.filter(u => u.created_at && u.created_at.startsWith(today)).length
      
      // 计算本月新用户
      const thisMonth = new Date().toISOString().substring(0, 7)
      const newUsersThisMonth = users.filter(u => u.created_at && u.created_at.startsWith(thisMonth)).length
      
      // 计算余额统计
      const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0)
      const averageBalance = totalUsers > 0 ? totalBalance / totalUsers : 0
      
      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        bannedUsers,
        newUsersToday,
        newUsersThisMonth,
        totalBalance,
        averageBalance
      }
    } catch (error) {
      console.error('获取用户统计数据失败:', error)
      // 返回默认值，避免页面崩溃
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        bannedUsers: 0,
        newUsersToday: 0,
        newUsersThisMonth: 0,
        totalBalance: 0,
        averageBalance: 0
      }
    }
  },

  /**
   * 获取用户详情
   */
  async getUser(id: string): Promise<User> {
    const response = await usersAPI.getUser(id)
    return response.data.data
  },

  /**
   * 创建用户
   */
  async createUser(params: CreateUserParams): Promise<User> {
    const response = await usersAPI.createUser(params)
    return response.data.data
  },

  /**
   * 更新用户
   */
  async updateUser(id: string, params: UpdateUserParams): Promise<User> {
    const response = await usersAPI.updateUser(id, params)
    return response.data.data
  },

  /**
   * 更新用户状态
   */
  async updateUserStatus(id: string, status: string): Promise<User> {
    const response = await usersAPI.updateUserStatus(id, status)
    return response.data.data
  },

  /**
   * 重置用户密码
   */
  async resetUserPassword(params: ResetPasswordParams): Promise<{ new_password: string }> {
    const response = await usersAPI.resetPassword(params.userId)
    return response.data.data
  },

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    // 由于API中没有删除用户的接口，这里使用更新状态为banned来代替
    await this.updateUserStatus(id, 'banned')
    return {
      success: true,
      message: '用户已被禁用'
    }
  },

  /**
   * 批量操作用户
   */
  async batchOperation(params: BatchOperationParams): Promise<{ success: boolean; message: string }> {
    // 根据操作类型执行不同的批量操作
    switch (params.operation) {
      case 'activate':
        // 批量激活用户
        await Promise.all(
          params.userIds.map(id => this.updateUserStatus(id, 'active'))
        )
        break
      case 'deactivate':
        // 批量停用用户
        await Promise.all(
          params.userIds.map(id => this.updateUserStatus(id, 'inactive'))
        )
        break
      case 'delete':
        // 批量删除用户（这里可能需要专门的删除 API）
        throw new Error('批量删除功能暂未实现')
      default:
        throw new Error(`不支持的操作类型: ${params.operation}`)
    }
    
    return {
      success: true,
      message: `批量${params.operation}操作完成`
    }
  },

  /**
   * 导出用户数据
   */
  async exportUsers(params: ExportUsersParams): Promise<Blob> {
    // 获取用户数据
    const response = await this.getUserList({
      page: 1,
      pageSize: 10000, // 导出所有数据
      search: params.search,
      status: params.status,
      role: params.role
    })
    
    // 转换为 CSV 格式
    const headers = ['ID', '用户名', '邮箱', '手机', '角色', '状态', '余额', '创建时间']
    const csvContent = [
      headers.join(','),
      ...response.users.map(user => [
        user.id,
        user.username,
        user.email,
        user.phone || '',
        user.role,
        user.status,
        user.balance,
        user.created_at
      ].join(','))
    ].join('\n')
    
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  }
}