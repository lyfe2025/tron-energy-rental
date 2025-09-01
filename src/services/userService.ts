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
import type { ApiResponse, User } from '../types/api'
import { apiClient, usersAPI } from './api'

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
      dateTo: params.dateTo,
      _t: Date.now() // 添加时间戳避免缓存
    }
    
    const response = await usersAPI.getUsers(apiParams)
    
    // 后端API返回的数据结构是 {success: true, data: [], pagination: {}}
    const responseData = response.data
    
    // 处理用户数据，确保字段映射正确
    const processedUsers = (responseData.data || []).map(user => ({
      ...user,
      // 确保 type 字段存在，根据 role 字段推断
      type: (user.role === 'admin' ? 'admin' : user.role === 'agent' ? 'agent' : 'telegram_user') as 'telegram_user' | 'agent' | 'admin',
      // 添加必需的 login_type 和 user_type 字段
      login_type: (user.role === 'admin' ? 'admin' : 'telegram') as 'telegram' | 'admin' | 'both',
      user_type: 'normal' as 'normal' | 'vip' | 'premium',
      // 确保 telegram_id 字段存在
      telegram_id: user.telegram_id || 0,
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
      // 直接调用用户API获取统计数据，添加时间戳避免缓存
      const response = await apiClient.get<ApiResponse<any>>('/api/users/stats', {
        params: { _t: Date.now() }
      })
      const data = response.data.data
      
      // 将后端返回的数据结构映射到前端期望的格式
      return {
        totalUsers: data.totalUsers || 0,
        activeUsers: data.activeUsers || 0,
        inactiveUsers: data.inactiveUsers || 0, // 后端已经提供了这个字段
        bannedUsers: data.bannedUsers || 0,
        newUsersToday: data.newUsersToday || 0,
        newUsersThisMonth: data.newUsersThisMonth || 0,
        totalBalance: data.totalBalance || 0,
        averageBalance: data.averageBalance || 0
      }
    } catch (error) {
      console.error('获取用户统计数据失败:', error)
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
    // 转换 CreateUserParams 为后端API期望的格式
    // 后端API期望的是login_type和user_type字段
    const createData = {
      username: params.username || params.email || '',
      email: params.email || '',
      password: params.password || '',
      phone: params.phone,
      // 直接使用前端传递的login_type和user_type
      login_type: params.login_type || 'admin',
      user_type: params.user_type || 'normal',
      // 根据login_type设置telegram相关字段
      telegram_id: params.telegram_id || null,
      first_name: params.first_name || null,
      last_name: params.last_name || null,
      usdt_balance: params.balance || 0,
      trx_balance: 0,
      status: params.status || 'active'
    }
    
    // 直接调用后端API
    const response = await apiClient.post<ApiResponse<User>>('/api/users', createData)
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