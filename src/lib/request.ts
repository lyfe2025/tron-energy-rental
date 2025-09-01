/**
 * 统一的HTTP请求工具
 * 基于axios进行封装，提供类型安全的API调用
 */

import { apiClient } from '@/services/api'
import type { AxiosRequestConfig } from 'axios'

/**
 * 统一的请求函数
 * @param url - 请求URL
 * @param config - 请求配置
 * @returns Promise<T>
 */
export async function request<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient.request<T>({
      url,
      method: 'GET',
      ...config
    })
    
    // 直接返回响应数据
    return response.data
  } catch (error) {
    console.error('Request error:', error)
    throw error
  }
}

/**
 * GET请求
 * @param url - 请求URL
 * @param config - 请求配置
 * @returns Promise<T>
 */
export function get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>(url, { ...config, method: 'GET' })
}

/**
 * POST请求
 * @param url - 请求URL
 * @param data - 请求数据
 * @param config - 请求配置
 * @returns Promise<T>
 */
export function post<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  return request<T>(url, { 
    ...config, 
    method: 'POST',
    data
  })
}

/**
 * PUT请求
 * @param url - 请求URL
 * @param data - 请求数据
 * @param config - 请求配置
 * @returns Promise<T>
 */
export function put<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  return request<T>(url, { 
    ...config, 
    method: 'PUT',
    data
  })
}

/**
 * DELETE请求
 * @param url - 请求URL
 * @param config - 请求配置
 * @returns Promise<T>
 */
export function del<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>(url, { ...config, method: 'DELETE' })
}

// 默认导出
export default request
