import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type {
    Bot,
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
    UpdateEnergyPackageData,
    UpdateOrderStatusData,
    UpdatePriceTemplateData,
    UpdateSettingsData,
    UpdateUserData,
    User,
    UserActivityStats
} from '../types/api';

// API基础配置
// 在开发环境中使用相对路径以利用Vite代理，在生产环境中使用完整URL
interface ImportMeta {
  env: {
    VITE_API_BASE_URL?: string;
  };
}

// 在开发环境中使用相对路径以利用Vite代理，在生产环境中使用完整URL
const API_BASE_URL = (import.meta as ImportMeta).env?.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001')

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
})

console.log('🔍 [API Client] 初始化配置:', {
  baseURL: API_BASE_URL,
  isDev: import.meta.env.DEV,
  env: import.meta.env
})

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    console.log('🔍 [API Client] 请求拦截器:', {
      url: config.url,
      token: token ? '存在' : '不存在',
      headers: config.headers
    })
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('🔍 [API Client] 已添加认证头:', `Bearer ${token.substring(0, 20)}...`)
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
      // Token过期或无效，清除本地存储
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      
      // 触发自定义事件，让应用知道需要处理认证问题
      // 完全避免使用window.location，防止页面刷新
      window.dispatchEvent(new CustomEvent('auth:token-expired', {
        detail: { 
          status: error.response.status,
          message: error.response.data?.message || 'Token已过期'
        }
      }))
    }
    return Promise.reject(error)
  }
)

// 导出apiClient实例
export { apiClient };

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
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
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
  getOrders: (params?: { page?: number; limit?: number; status?: string; user_id?: string; search?: string; start_date?: string; end_date?: string }) => 
    apiClient.get<ApiResponse<{ orders: Order[]; pagination: { page: number; limit: number; total: number; totalPages: number }; stats: OrderStats }>>('/api/orders', { params }),
  
  // 获取订单详情
  getOrder: (id: string) => 
    apiClient.get<ApiResponse<Order>>(`/api/orders/${id}`),
  
  // 更新订单状态
  updateOrderStatus: (id: string, data: UpdateOrderStatusData) => 
    apiClient.put<ApiResponse<Order>>(`/api/orders/${id}/status`, data),
  
  // 处理订单
  processOrder: (id: string) => 
    apiClient.post<ApiResponse<{ message: string }>>(`/api/orders/${id}/process`),
}

// 机器人管理API
export const botsAPI = {
  // 获取机器人列表
  getBots: (params?: { page?: number; limit?: number; status?: string; search?: string }) => 
    apiClient.get<ApiResponse<{ bots: Bot[]; pagination: unknown }>>('/api/bots', { params }),
  
  // 获取机器人详情
  getBot: (id: string) => 
    apiClient.get<ApiResponse<{ bot: Bot; stats?: unknown }>>(`/api/bots/${id}`),
  
  // 创建机器人
  createBot: (data: {
    name: string;
    username: string;
    token: string;
    description?: string;
    webhook_url?: string;
    settings?: unknown;
    welcome_message?: string;
    help_message?: string;
    commands?: unknown[];
  }) => 
    apiClient.post<ApiResponse<{ bot: Bot }>>('/api/bots', data),
  
  // 更新机器人
  updateBot: (id: string, data: {
    name?: string;
    username?: string;
    token?: string;
    description?: string;
    webhook_url?: string;
    settings?: unknown;
    welcome_message?: string;
    help_message?: string;
    commands?: unknown[];
  }) => 
    apiClient.put<ApiResponse<{ bot: Bot }>>(`/api/bots/${id}`, data),
  
  // 更新机器人状态
  updateBotStatus: (id: string, status: string) => 
    apiClient.patch<ApiResponse<{ bot: Bot }>>(`/api/bots/${id}/status`, { status }),
  
  // 删除机器人
  deleteBot: (id: string) => 
    apiClient.delete<ApiResponse<{ message: string }>>(`/api/bots/${id}`),
  
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

// 分页信息类型
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// 系统配置API
export const systemConfigsAPI = {
  // 获取系统配置列表
  getConfigs: (params?: { category?: string; is_public?: boolean; limit?: number }) => 
    apiClient.get<ApiResponse<{ configs: SystemConfig[]; pagination: PaginationInfo }>>('/api/system-configs', { params }),
  
  // 获取所有必要的配置（用于设置页面）
  getAllSettingsConfigs: async () => {
    const categories = ['system', 'security', 'notification', 'pricing', 'cache', 'logging', 'api', 'features'];
    const promises = categories.map(category => 
      apiClient.get<ApiResponse<{ configs: SystemConfig[]; pagination: PaginationInfo }>>('/api/system-configs', { 
        params: { category, limit: 100 } 
      })
    );
    
    const responses = await Promise.all(promises);
    const allConfigs: SystemConfig[] = [];
    
    responses.forEach(response => {
      if (response.data.success && response.data.data?.configs) {
        allConfigs.push(...response.data.data.configs);
      }
    });
    
    return {
      data: {
        success: true,
        data: allConfigs
      }
    };
  },
  
  // 获取配置详情
  getConfig: (key: string) => 
    apiClient.get<ApiResponse<SystemConfig>>(`/api/system-configs/${key}`),
  
  // 更新配置
  updateConfig: (key: string, value: string | number | boolean) => 
    apiClient.put<ApiResponse<SystemConfig>>(`/api/system-configs/${key}`, { config_value: value }),
  
  // 批量更新配置
  updateConfigs: (configs: Array<{ config_key: string; config_value: string | number | boolean }>, changeReason?: string) => 
    apiClient.put<ApiResponse<{ updated: SystemConfig[]; errors: Array<{ config_key: string; error: string }> }>>('/api/system-configs/batch/update', { 
      configs, 
      change_reason: changeReason || '系统设置更新'
    }),
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
  
  // 注意：机器人定价和代理商价格管理相关的API已移除
  // 如需重新实现，请根据新的架构设计相应的接口
}

// 能量池管理API
export const energyPoolAPI = {
  // 获取能量池统计信息
  getStatistics: () => 
    apiClient.get<ApiResponse<{
      totalAccounts: number;
      activeAccounts: number;
      totalEnergy: number;
      availableEnergy: number;
      reservedEnergy: number;
      averageCost: number;
    }>>('/api/energy-pool/statistics'),
  
  // 获取能量池账户列表
  getAccounts: () => 
    apiClient.get<ApiResponse<Array<{
      id: string;
      name: string;
      tron_address: string;
      private_key_encrypted: string;
      total_energy: number;
      available_energy: number;
      reserved_energy: number;
      cost_per_energy: number;
      status: 'active' | 'inactive' | 'maintenance';
      last_updated_at: string;
      created_at: string;
      updated_at: string;
    }>>>('/api/energy-pool/accounts'),
  
  // 获取特定能量池账户详情
  getAccount: (id: string) => 
    apiClient.get<ApiResponse<{
      id: string;
      name: string;
      tron_address: string;
      private_key_encrypted: string;
      total_energy: number;
      available_energy: number;
      reserved_energy: number;
      cost_per_energy: number;
      status: 'active' | 'inactive' | 'maintenance';
      last_updated_at: string;
      created_at: string;
      updated_at: string;
    }>>(`/api/energy-pool/accounts/${id}`),
  
  // 刷新能量池状态
  refreshStatus: () => 
    apiClient.post<ApiResponse<{ message: string }>>('/api/energy-pool/refresh'),
  
  // 优化能量分配
  optimizeAllocation: (requiredEnergy: number) => 
    apiClient.post<ApiResponse<{
      allocations: Array<{
        poolAccountId: number;
        energyAmount: number;
        estimatedCost: number;
      }>;
      totalCost: number;
      success: boolean;
      message?: string;
    }>>('/api/energy-pool/optimize', { requiredEnergy }),
  
  // 预留能量资源
  reserveEnergy: (allocations: Array<{ poolAccountId: number; energyAmount: number }>) => 
    apiClient.post<ApiResponse<{ message: string }>>('/api/energy-pool/reserve', { allocations }),
  
  // 释放预留的能量资源
  releaseEnergy: (allocations: Array<{ poolAccountId: number; energyAmount: number }>) => 
    apiClient.post<ApiResponse<{ message: string }>>('/api/energy-pool/release', { allocations }),
  
  // 确认能量使用
  confirmUsage: (allocations: Array<{ poolAccountId: number; energyAmount: number }>) => 
    apiClient.post<ApiResponse<{ message: string }>>('/api/energy-pool/confirm-usage', { allocations }),
  
  // 添加新的能量池账户
  addAccount: (data: {
    name: string;
    tron_address: string;
    private_key_encrypted: string;
    total_energy: number;
    available_energy?: number;
    cost_per_energy?: number;
    status?: 'active' | 'inactive' | 'maintenance';
  }) => 
    apiClient.post<ApiResponse<{ id: string }>>('/api/energy-pool/accounts', data),
  
  // 更新能量池账户
  updateAccount: (id: string, data: Partial<{
    name: string;
    tron_address: string;
    private_key_encrypted: string;
    total_energy: number;
    available_energy: number;
    cost_per_energy: number;
    status: 'active' | 'inactive' | 'maintenance';
  }>) => 
    apiClient.put<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}`, data),
  

  
  // 获取今日消耗统计
  getTodayConsumption: () => 
    apiClient.get<ApiResponse<{
      totalConsumption: number;
      totalCost: number;
      transactionCount: number;
      byAccount: Array<{
        pool_account_id: number;
        account_name: string;
        total_energy: number;
        total_cost: number;
        transaction_count: number;
      }>;
      byType: Array<{
        transaction_type: string;
        total_energy: number;
        total_cost: number;
        transaction_count: number;
      }>;
    }>>('/api/energy-pool/today-consumption'),
  
  // 启用账户
  enableAccount: (id: string) => 
    apiClient.put<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}/enable`),
  
  // 停用账户
  disableAccount: (id: string) => 
    apiClient.put<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}/disable`),
  
  // 批量启用账户
  batchEnableAccounts: (accountIds: string[]) => 
    apiClient.put<ApiResponse<{ successCount: number; failedCount: number; errors: Array<{ id: string; error: string }> }>>('/api/energy-pool/accounts/batch/enable', { accountIds }),
  
  // 批量停用账户
  batchDisableAccounts: (accountIds: string[]) => 
    apiClient.put<ApiResponse<{ successCount: number; failedCount: number; errors: Array<{ id: string; error: string }> }>>('/api/energy-pool/accounts/batch/disable', { accountIds }),
  
  // 删除账户
  deleteAccount: (id: string) => 
    apiClient.delete<ApiResponse<{ message: string }>>(`/api/energy-pool/accounts/${id}`),
}

// 质押管理API
export const stakeAPI = {
  // 获取质押概览
  getOverview: (poolId: string) => 
    apiClient.get<ApiResponse<{
      totalStaked: number;
      totalDelegated: number;
      totalUnfreezing: number;
      availableToWithdraw: number;
      stakingRewards: number;
      delegationRewards: number;
    }>>(`/api/energy-pool/stake/overview?poolId=${poolId}`),

  // 获取质押统计信息
  getStatistics: (poolId: string) => 
    apiClient.get<ApiResponse<{
      totalStakedTrx: number;
      totalDelegatedEnergy: number;
      totalDelegatedBandwidth: number;
      pendingUnfreezes: number;
      availableToWithdraw: number;
      estimatedDailyRewards: number;
    }>>(`/api/energy-pool/stake/statistics?poolId=${poolId}`),

  // 质押TRX
  freezeTrx: (data: {
    poolId: string;
    amount: number;
    resourceType: 'ENERGY' | 'BANDWIDTH';
    lockPeriod?: number;
  }) => 
    apiClient.post<ApiResponse<{ txid: string; message: string }>>('/api/energy-pool/stake/freeze', data),

  // 解质押TRX
  unfreezeTrx: (data: {
    poolId: string;
    amount: number;
    resourceType: 'ENERGY' | 'BANDWIDTH';
  }) => 
    apiClient.post<ApiResponse<{ txid: string; message: string }>>('/api/energy-pool/stake/unfreeze', data),

  // 委托资源
  delegateResource: (data: {
    poolId: string;
    toAddress: string;
    amount: number;
    resourceType: 'ENERGY' | 'BANDWIDTH';
    lockPeriod?: number;
  }) => 
    apiClient.post<ApiResponse<{ txid: string; message: string }>>('/api/energy-pool/stake/delegate', data),

  // 取消委托资源
  undelegateResource: (data: {
    poolId: string;
    toAddress: string;
    amount: number;
    resourceType: 'ENERGY' | 'BANDWIDTH';
  }) => 
    apiClient.post<ApiResponse<{ txid: string; message: string }>>('/api/energy-pool/stake/undelegate', data),

  // 提取已解质押资金
  withdrawUnfrozen: (data: {
    poolId: string;
  }) => 
    apiClient.post<ApiResponse<{ txid: string; amount: number; message: string }>>('/api/energy-pool/stake/withdraw', data),

  // 获取质押记录
  getStakeRecords: (params: {
    poolId: string;
    page?: number;
    limit?: number;
    operationType?: 'freeze' | 'unfreeze';
    resourceType?: 'ENERGY' | 'BANDWIDTH';
    startDate?: string;
    endDate?: string;
  }) => 
    apiClient.get<ApiResponse<{
      records: Array<{
        id: string;
        poolId: string;
        txid: string;
        operationType: 'freeze' | 'unfreeze';
        amount: number;
        resourceType: 'ENERGY' | 'BANDWIDTH';
        lockPeriod?: number;
        unfreezeTime?: string;
        status: 'pending' | 'success' | 'failed';
        createdAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>('/api/energy-pool/stake/records', { params }),

  // 获取委托记录
  getDelegateRecords: (params: {
    poolId: string;
    page?: number;
    limit?: number;
    operationType?: 'delegate' | 'undelegate';
    resourceType?: 'ENERGY' | 'BANDWIDTH';
    toAddress?: string;
    startDate?: string;
    endDate?: string;
  }) => 
    apiClient.get<ApiResponse<{
      records: Array<{
        id: string;
        poolId: string;
        txid: string;
        operationType: 'delegate' | 'undelegate';
        toAddress: string;
        amount: number;
        resourceType: 'ENERGY' | 'BANDWIDTH';
        lockPeriod?: number;
        expireTime?: string;
        status: 'pending' | 'success' | 'failed';
        createdAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>('/api/energy-pool/stake/delegates', { params }),

  // 获取解质押记录
  getUnfreezeRecords: (params: {
    poolId: string;
    page?: number;
    limit?: number;
    status?: 'pending' | 'available' | 'withdrawn';
    resourceType?: 'ENERGY' | 'BANDWIDTH';
    startDate?: string;
    endDate?: string;
  }) => 
    apiClient.get<ApiResponse<{
      records: Array<{
        id: string;
        poolId: string;
        txid: string;
        amount: number;
        resourceType: 'ENERGY' | 'BANDWIDTH';
        unfreezeTime: string;
        expireTime: string;
        status: 'pending' | 'available' | 'withdrawn';
        createdAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>('/api/energy-pool/stake/unfreezes', { params }),

  // 获取账户资源信息
  getAccountResources: (address: string) => 
    apiClient.get<ApiResponse<{
      address: string;
      balance: number;
      energy: {
        total: number;
        used: number;
        available: number;
      };
      bandwidth: {
        total: number;
        used: number;
        available: number;
      };
      frozen: {
        energy: number;
        bandwidth: number;
      };
      delegated: {
        energy: number;
        bandwidth: number;
      };
    }>>(`/api/energy-pool/stake/account-resources/${address}`),

  // 获取账户信息
  getAccountInfo: (address: string) => 
    apiClient.get<ApiResponse<{
      address: string;
      balance: number;
      createTime: number;
      latestOperationTime: number;
      allowance: number;
      activePermissions: Array<{
        type: string;
        permissionName: string;
        threshold: number;
        keys: Array<{
          address: string;
          weight: number;
        }>;
      }>;
    }>>(`/api/energy-pool/stake/account-info/${address}`),
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