import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import type {
  AgentPricing,
  Bot,
  BotPricing,
  CreateBotData,
  CreateEnergyPackageData,
  CreatePriceTemplateData,
  CreateUserData,
  EnergyPackage,
  OperationLog,
  Order,
  OrderStats,
  PriceTemplate,
  RevenueStats,
  StatisticsParams,
  SystemConfig,
  SystemSettings,
  UpdateAgentPricingData,
  UpdateBotData,
  UpdateBotPricingData,
  UpdateEnergyPackageData,
  UpdateOrderStatusData,
  UpdatePriceTemplateData,
  UpdateSettingsData,
  UpdateUserData,
  User,
  UserActivityStats
} from '../types/api'

// API基础配置
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001'

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误和token过期
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API响应类型定义
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 分页响应类型
export interface PaginatedResponse<T> {
  success: boolean
  data: {
    items: T[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
  message?: string
}

// 认证相关API
export const authAPI = {
  // 管理员登录
  login: (credentials: { email: string; password: string }) => 
    apiClient.post<ApiResponse<{ token: string; user: User }>>('/api/auth/login', credentials),
  
  // 验证token
  verifyToken: () => 
    apiClient.get<ApiResponse<{ user: User }>>('/api/auth/verify'),
  
  // 刷新token
  refreshToken: () => 
    apiClient.post<ApiResponse<{ token: string }>>('/api/auth/refresh'),
}

// 用户管理API
export const usersAPI = {
  // 获取用户列表
  getUsers: (params?: { page?: number; limit?: number; search?: string; status?: string }) => 
    apiClient.get<PaginatedResponse<User>>('/api/users', { params }),
  
  // 获取用户详情
  getUser: (id: string) => 
    apiClient.get<ApiResponse<User>>(`/api/users/${id}`),
  
  // 创建用户
  createUser: (data: CreateUserData) => 
    apiClient.post<ApiResponse<User>>('/api/users', data),
  
  // 更新用户状态
  updateUserStatus: (id: string, status: string) => 
    apiClient.patch<ApiResponse<User>>(`/api/users/${id}/status`, { status }),
  
  // 更新用户信息
  updateUser: (id: string, data: UpdateUserData) => 
    apiClient.put<ApiResponse<User>>(`/api/users/${id}`, data),
  
  // 重置用户密码
  resetPassword: (id: string) => 
    apiClient.post<ApiResponse<{ new_password: string }>>(`/api/users/${id}/reset-password`),
}

// 订单管理API
export const ordersAPI = {
  // 获取订单列表
  getOrders: (params?: { page?: number; limit?: number; status?: string; user_id?: string }) => 
    apiClient.get<PaginatedResponse<Order>>('/api/orders', { params }),
  
  // 获取订单详情
  getOrder: (id: string) => 
    apiClient.get<ApiResponse<Order>>(`/api/orders/${id}`),
  
  // 更新订单状态
  updateOrderStatus: (id: string, data: UpdateOrderStatusData) => 
    apiClient.patch<ApiResponse<Order>>(`/api/orders/${id}/status`, data),
  
  // 处理订单
  processOrder: (id: string) => 
    apiClient.post<ApiResponse<{ message: string }>>(`/api/orders/${id}/process`),
}

// 机器人管理API
export const botsAPI = {
  // 获取机器人列表
  getBots: (params?: { page?: number; limit?: number; status?: string }) => 
    apiClient.get<PaginatedResponse<Bot>>('/api/bots', { params }),
  
  // 获取机器人详情
  getBot: (id: string) => 
    apiClient.get<ApiResponse<Bot>>(`/api/bots/${id}`),
  
  // 创建机器人
  createBot: (data: CreateBotData) => 
    apiClient.post<ApiResponse<Bot>>('/api/bots', data),
  
  // 更新机器人
  updateBot: (id: string, data: UpdateBotData) => 
    apiClient.put<ApiResponse<Bot>>(`/api/bots/${id}`, data),
  
  // 更新机器人状态
  updateBotStatus: (id: string, status: string) => 
    apiClient.patch<ApiResponse<Bot>>(`/api/bots/${id}/status`, { status }),
  
  // 删除机器人
  deleteBot: (id: string) => 
    apiClient.delete<ApiResponse<Bot>>(`/api/bots/${id}`),
  
  // 测试机器人连接
  testBot: (id: string) => 
    apiClient.post<ApiResponse<{ status: string; message: string }>>(`/api/bots/${id}/test`),
  
  // 重置机器人
  resetBot: (id: string) => 
    apiClient.post<ApiResponse<{ message: string }>>(`/api/bots/${id}/reset`),
}

// 能量包管理API
export const energyPackagesAPI = {
  // 获取能量包列表
  getEnergyPackages: (params?: { page?: number; limit?: number; is_active?: boolean }) => 
    apiClient.get<PaginatedResponse<EnergyPackage>>('/api/energy-packages', { params }),
  
  // 获取能量包详情
  getEnergyPackage: (id: string) => 
    apiClient.get<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}`),
  
  // 创建能量包
  createEnergyPackage: (data: CreateEnergyPackageData) => 
    apiClient.post<ApiResponse<EnergyPackage>>('/api/energy-packages', data),
  
  // 更新能量包
  updateEnergyPackage: (id: string, data: UpdateEnergyPackageData) => 
    apiClient.put<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}`, data),
  
  // 更新能量包状态
  updateEnergyPackageStatus: (id: string, is_active: boolean) => 
    apiClient.patch<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}/status`, { is_active }),
  
  // 删除能量包
  deleteEnergyPackage: (id: string) => 
    apiClient.delete<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}`),
  
  // 方法别名（为了兼容页面中的调用）
  createPackage: (data: CreateEnergyPackageData) => 
    apiClient.post<ApiResponse<EnergyPackage>>('/api/energy-packages', data),
  
  updatePackage: (id: string, data: UpdateEnergyPackageData) => 
    apiClient.put<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}`, data),
  
  deletePackage: (id: string) => 
    apiClient.delete<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}`),
}

// 统计分析API
export const statisticsAPI = {
  // 获取总览统计
  getOverview: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<{
      total_users: number
      total_orders: number
      total_revenue: number
      orders_change: number
      revenue_change: number
      active_users: number
      users_change: number
      online_bots: number
      bots_change: number
      new_users: number
      paying_users: number
      conversion_rate: number
      retention_rate: number
    }>>('/api/statistics/overview', { params }),
  
  // 获取订单统计
  getOrderStats: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<OrderStats>>('/api/statistics/orders', { params }),
  
  // 获取收入统计
  getRevenueStats: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<RevenueStats>>('/api/statistics/revenue', { params }),
  
  // 获取用户活跃度统计
  getUserActivityStats: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<UserActivityStats>>('/api/statistics/user-activity', { params }),

  // 获取订单趋势
  getOrderTrend: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<Array<{ date: string; orders: number; revenue: number }>>>('/api/statistics/order-trend', { params }),

  // 获取收入分析
  getRevenueAnalysis: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<Array<{ period: string; revenue: number; change: number; percentage: number }>>>('/api/statistics/revenue-analysis', { params }),

  // 获取机器人状态
  getBotStatus: () => 
    apiClient.get<ApiResponse<{
      online: number
      offline: number
      error: number
      maintenance: number
      chart_data: Array<{ status: string; count: number; percentage: number }>
    }>>('/api/statistics/bot-status'),

  // 获取能量包排行
  getPackageRanking: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<Array<{ package_id: string; name: string; sales: number; revenue: number; rank: number }>>>('/api/statistics/package-ranking', { params }),

  // 获取详细数据
  getDetailData: (params?: StatisticsParams) => 
    apiClient.get<ApiResponse<Array<{ category: string; value: number; change: number; trend: 'up' | 'down' | 'stable' }>>>('/api/statistics/detail-data', { params }),
}

// 系统配置API
export const systemConfigsAPI = {
  // 获取系统配置列表
  getConfigs: (params?: { category?: string; is_public?: boolean }) => 
    apiClient.get<ApiResponse<SystemConfig[]>>('/api/system-configs', { params }),
  
  // 获取配置详情
  getConfig: (key: string) => 
    apiClient.get<ApiResponse<SystemConfig>>(`/api/system-configs/${key}`),
  
  // 更新配置
  updateConfig: (key: string, value: string | number | boolean) => 
    apiClient.put<ApiResponse<SystemConfig>>(`/api/system-configs/${key}`, { config_value: value }),
  
  // 批量更新配置
  updateConfigs: (configs: Array<{ config_key: string; config_value: string | number | boolean }>) => 
    apiClient.put<ApiResponse<SystemConfig[]>>('/api/system-configs/batch', { configs }),
}

// 价格管理API
export const pricingAPI = {
  // 价格模板管理
  getTemplates: (params?: { page?: number; limit?: number; search?: string; is_active?: boolean }) => 
    apiClient.get<PaginatedResponse<PriceTemplate>>('/api/price-templates', { params }),
  
  createTemplate: (data: CreatePriceTemplateData) => 
    apiClient.post<ApiResponse<PriceTemplate>>('/api/price-templates', data),
  
  updateTemplate: (id: string, data: UpdatePriceTemplateData) => 
    apiClient.put<ApiResponse<PriceTemplate>>(`/api/price-templates/${id}`, data),
  
  deleteTemplate: (id: string) => 
    apiClient.delete<ApiResponse<{ message: string }>>(`/api/price-templates/${id}`),
  
  // 机器人定价管理
  getBotPricing: (params?: { page?: number; limit?: number; search?: string; status?: string }) => 
    apiClient.get<PaginatedResponse<BotPricing>>('/api/robot-pricing', { params }),
  
  updateBotPricing: (id: string, data: UpdateBotPricingData) => 
    apiClient.put<ApiResponse<BotPricing>>(`/api/robot-pricing/${id}`, data),
  
  // 代理商价格管理
  getAgentPricing: (params?: { page?: number; limit?: number; search?: string; status?: string }) => 
    apiClient.get<PaginatedResponse<AgentPricing>>('/api/agent-pricing', { params }),
  
  updateAgentPricing: (id: string, data: UpdateAgentPricingData) => 
    apiClient.put<ApiResponse<AgentPricing>>(`/api/agent-pricing/${id}`, data),
}

// 系统设置API
export const settingsAPI = {
  // 获取系统设置
  getSettings: () => 
    apiClient.get<ApiResponse<SystemSettings>>('/api/settings'),
  
  // 更新系统设置
  updateSettings: (data: UpdateSettingsData) => 
    apiClient.put<ApiResponse<SystemSettings>>('/api/settings', data),
  
  // 恢复默认设置
  resetToDefaults: () => 
    apiClient.post<ApiResponse<{ message: string }>>('/api/settings/reset'),
  
  // 获取操作日志
  getOperationLogs: (params?: { page?: number; limit?: number }) => 
    apiClient.get<PaginatedResponse<OperationLog>>('/api/settings/logs', { params }),
}

export default apiClient