/**
 * 测试辅助工具函数
 */
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import type { Component } from 'vue'

/**
 * 创建Vue组件的测试包装器
 */
export function createWrapper<T extends Component>(
  component: T,
  options: any = {}
): VueWrapper<any> {
  const defaultOptions = {
    global: {
      stubs: {
        'router-link': true,
        'router-view': true,
      },
      mocks: {
        $router: {
          push: vi.fn(),
          replace: vi.fn(),
          go: vi.fn(),
          back: vi.fn(),
          forward: vi.fn(),
        },
        $route: {
          path: '/',
          query: {},
          params: {},
          meta: {},
        },
      },
    },
  }

  return mount(component, {
    ...defaultOptions,
    ...options,
    global: {
      ...defaultOptions.global,
      ...options.global,
    },
  })
}

/**
 * 模拟API响应
 */
export function mockApiResponse(data: any, status = 200, ok = true) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response)
}

/**
 * 模拟API错误响应
 */
export function mockApiError(message: string, status = 500) {
  return Promise.reject(new Error(message))
}

/**
 * 等待异步操作完成
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * 创建模拟的用户数据
 */
export function createMockUser(overrides: any = {}) {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    status: 'active',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * 创建模拟的机器人数据
 */
export function createMockBot(overrides: any = {}) {
  return {
    id: 1,
    name: 'Test Bot',
    address: 'TTest123456789012345678901234567890',
    private_key: 'test_private_key',
    type: 'energy',
    status: 'active',
    balance: 1000,
    config: {},
    last_active: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * 创建模拟的能量包数据
 */
export function createMockEnergyPackage(overrides: any = {}) {
  return {
    id: 1,
    name: 'Test Energy Package',
    description: 'Test energy package description',
    energy_amount: 65000,
    price: 1.5,
    duration_hours: 1,
    resource_type: 'ENERGY',
    status: 'active',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * 创建模拟的订单数据
 */
export function createMockOrder(overrides: any = {}) {
  return {
    id: 1,
    user_id: 1,
    package_id: 1,
    recipient_address: 'TTest123456789012345678901234567890',
    quantity: 1,
    total_price: 1.5,
    status: 'completed',
    transaction_hash: 'test_tx_hash',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * 模拟Pinia store
 */
export function createMockStore(initialState: any = {}) {
  return {
    ...initialState,
    $patch: vi.fn(),
    $reset: vi.fn(),
    $subscribe: vi.fn(),
    $onAction: vi.fn(),
  }
}

/**
 * 模拟localStorage
 */
export function mockLocalStorage() {
  const storage: { [key: string]: string } = {}
  
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key]
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key])
    }),
  }
}

/**
 * 模拟网络请求
 */
export function mockFetch(response: any, options: { status?: number; ok?: boolean } = {}) {
  const { status = 200, ok = true } = options
  
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  } as Response)
  
  return global.fetch
}

/**
 * 测试异步错误
 */
export async function expectAsyncError(fn: () => Promise<any>, expectedMessage?: string) {
  try {
    await fn()
    throw new Error('Expected function to throw an error')
  } catch (error) {
    if (expectedMessage && error instanceof Error) {
      expect(error.message).toContain(expectedMessage)
    }
    return error
  }
}

/**
 * 模拟日期
 */
export function mockDate(dateString: string) {
  const mockDate = new Date(dateString)
  vi.spyOn(global, 'Date').mockImplementation(() => mockDate)
  return mockDate
}

/**
 * 等待DOM更新
 */
export async function nextTick(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}
