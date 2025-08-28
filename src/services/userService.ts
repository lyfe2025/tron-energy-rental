/**
 * 用户管理服务
 * 封装用户相关的 API 调用
 */
import type {
    BatchOperationParams,
    CreateUserParams,
    ExportUsersParams,
    ResetPasswordParams,
    UpdateUserParams,
    UserListParams,
    UserListResponse,
    UserStats
} from '../pages/Users/types/user.types'
import type { User } from '../types/api'
import { usersAPI } from './api'

export const userService = {
  /**
   * 获取用户列表
   */
  async getUserList(params: UserListParams): Promise<UserListResponse> {
    const apiParams = {
      page: params.page,
      limit: params.pageSize,
      search: params.search,
      status: params.status,
      type: params.type,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo
    }
    
    const response = await usersAPI.getUsers(apiParams)
    
    // 后端API返回的数据结构是 {data: {users: [], pagination: {total, totalPages}}}
    const responseData = response.data.data
    
    // 处理用户数据，确保字段映射正确
    const processedUsers = (responseData.users || []).map(user => ({
      ...user,
      // 确保 type 字段存在，根据 role 字段推断
      type: (user.role === 'admin' ? 'admin' : user.role === 'agent' ? 'agent' : 'telegram_user') as 'telegram_user' | 'agent' | 'admin',
      // 确保 last_login 字段存在
      last_login: user.last_login || null,
      // 确保数值字段是数字类型
      balance: String(parseFloat(String(user.balance)) || 0),
      usdt_balance: String(parseFloat(String(user.usdt_balance)) || 0),
      trx_balance: String(parseFloat(String(user.trx_balance)) || 0)
    }))

    const result = {
      users: processedUsers,
      total: responseData.pagination?.total || 0,
      page: responseData.pagination?.page || 1,
      pageSize: responseData.pagination?.limit || 10,
      totalPages: responseData.pagination?.totalPages || 1
    }
    
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
      const users = response?.data?.data?.users
      
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
      
      // 计算余额统计，确保数值类型正确
      const totalBalance = users.reduce((sum, u) => sum + (parseFloat(String(u.usdt_balance)) || 0), 0)
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
    // 转换 CreateUserParams 为 CreateUserData 格式
    const createData = {
      username: params.username || params.email || '',
      email: params.email || '',
      password: params.password || '',
      first_name: params.first_name,
      last_name: params.last_name,
      phone: params.phone,
      role: params.role,
      balance: params.balance,
      status: (params.status === 'pending' ? 'inactive' : params.status) as 'active' | 'inactive' | 'banned'
    }
    const response = await usersAPI.createUser(createData)
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
      type: params.type
    })
    
    // 转换为 CSV 格式
    const headers = ['ID', '用户名', '邮箱', '手机', '类型', '状态', '余额', '创建时间']
    const csvContent = [
      headers.join(','),
      ...response.users.map(user => [
        user.id,
        user.username || user.first_name || '',
        user.email || '',
        user.phone || '',
        user.type,
        user.status,
        user.balance || 0,
        user.created_at
      ].join(','))
    ].join('\n')
    
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  }
}