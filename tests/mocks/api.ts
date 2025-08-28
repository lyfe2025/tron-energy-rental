/**
 * API Mock数据和函数
 */
import { vi } from 'vitest'

// Mock API基础URL
export const API_BASE_URL = 'http://localhost:3001/api'

// Mock API响应数据
export const mockApiResponses = {
  // 用户相关
  users: {
    list: {
      success: true,
      data: [
        {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'user',
          status: 'active',
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10
      }
    },
    create: {
      success: true,
      data: {
        id: 2,
        username: 'newuser',
        email: 'new@example.com',
        role: 'user',
        status: 'active',
        created_at: '2024-01-01T00:00:00.000Z'
      }
    }
  },

  // 机器人相关
  bots: {
    list: {
      success: true,
      data: [
        {
          id: 1,
          name: 'Test Bot',
          address: 'TTest123456789012345678901234567890',
          type: 'energy',
          status: 'active',
          balance: 1000,
          last_active: '2024-01-01T00:00:00.000Z'
        }
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10
      }
    },
    stats: {
      success: true,
      data: {
        total_bots: 10,
        active_bots: 8,
        inactive_bots: 2,
        total_balance: 50000
      }
    }
  },

  // 能量包相关
  energyPackages: {
    list: {
      success: true,
      data: [
        {
          id: 1,
          name: 'Basic Energy Package',
          energy_amount: 65000,
          price: 1.5,
          duration_hours: 1,
          status: 'active'
        }
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10
      }
    }
  },

  // 订单相关
  orders: {
    list: {
      success: true,
      data: [
        {
          id: 1,
          user_id: 1,
          package_id: 1,
          quantity: 1,
          total_price: 1.5,
          status: 'completed',
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10
      }
    }
  },

  // 统计数据
  statistics: {
    overview: {
      success: true,
      data: {
        total_revenue: 10000,
        total_orders: 500,
        active_users: 100,
        total_energy_sent: 1000000
      }
    }
  },

  // 价格计算
  pricing: {
    calculate: {
      success: true,
      data: {
        base_price: 1.5,
        discount: 0.1,
        final_price: 1.35,
        breakdown: {
          base: 1.5,
          discount_amount: 0.15,
          total: 1.35
        }
      }
    }
  },

  // 系统配置
  systemConfigs: {
    list: {
      success: true,
      data: [
        {
          id: 1,
          key: 'min_energy_amount',
          value: '32000',
          description: '最小能量数量',
          status: 'active'
        }
      ]
    }
  }
}

// Mock API错误响应
export const mockApiErrors = {
  unauthorized: {
    success: false,
    message: 'Unauthorized',
    code: 'UNAUTHORIZED'
  },
  validation: {
    success: false,
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    errors: {
      email: 'Invalid email format'
    }
  },
  notFound: {
    success: false,
    message: 'Resource not found',
    code: 'NOT_FOUND'
  },
  serverError: {
    success: false,
    message: 'Internal server error',
    code: 'SERVER_ERROR'
  }
}

// Mock Axios实例
export const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  request: vi.fn(),
  defaults: {
    baseURL: API_BASE_URL,
    headers: {}
  },
  interceptors: {
    request: {
      use: vi.fn()
    },
    response: {
      use: vi.fn()
    }
  }
}

// 设置默认的API Mock响应
export function setupApiMocks() {
  // Mock成功的GET请求
  mockAxios.get.mockImplementation((url: string) => {
    if (url.includes('/users')) {
      return Promise.resolve({ data: mockApiResponses.users.list })
    }
    if (url.includes('/bots')) {
      return Promise.resolve({ data: mockApiResponses.bots.list })
    }
    if (url.includes('/energy-packages')) {
      return Promise.resolve({ data: mockApiResponses.energyPackages.list })
    }
    if (url.includes('/orders')) {
      return Promise.resolve({ data: mockApiResponses.orders.list })
    }
    if (url.includes('/statistics')) {
      return Promise.resolve({ data: mockApiResponses.statistics.overview })
    }
    if (url.includes('/system-configs')) {
      return Promise.resolve({ data: mockApiResponses.systemConfigs.list })
    }
    return Promise.resolve({ data: { success: true, data: [] } })
  })

  // Mock成功的POST请求
  mockAxios.post.mockImplementation((url: string, data: unknown) => {
    if (url.includes('/users')) {
      return Promise.resolve({ data: mockApiResponses.users.create })
    }
    return Promise.resolve({ data: { success: true, data: { id: 1, ...data } } })
  })

  // Mock成功的PUT请求
  mockAxios.put.mockImplementation((url: string, data: unknown) => {
    return Promise.resolve({ data: { success: true, data: { id: 1, ...data } } })
  })

  // Mock成功的DELETE请求
  mockAxios.delete.mockImplementation(() => {
    return Promise.resolve({ data: { success: true, message: 'Deleted successfully' } })
  })
}

// 重置所有Mock
export function resetApiMocks() {
  mockAxios.get.mockReset()
  mockAxios.post.mockReset()
  mockAxios.put.mockReset()
  mockAxios.delete.mockReset()
  mockAxios.patch.mockReset()
}

// Mock特定API错误
export function mockApiError(method: 'get' | 'post' | 'put' | 'delete', error: unknown) {
  mockAxios[method].mockRejectedValueOnce(error)
}
