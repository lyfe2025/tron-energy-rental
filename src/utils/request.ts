import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { api } from './api'

// 请求接口
interface RequestConfig extends AxiosRequestConfig {
  url: string
  method: 'get' | 'post' | 'put' | 'delete' | 'patch'
  params?: any
  data?: any
}

// 响应接口
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 统一请求方法
const request = async <T = any>(config: RequestConfig): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse = await api(config)
    
    // 处理响应数据
    if (response.status >= 200 && response.status < 300) {
      // 如果后端已经返回标准格式（包含success字段），直接返回
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data
      }
      // 否则包装为标准格式
      return {
        success: true,
        data: response.data
      }
    } else {
      return {
        success: false,
        error: response.statusText || '请求失败'
      }
    }
  } catch (error: any) {
    console.error('Request error:', error)
    
    // 处理错误响应
    if (error.response) {
      // 如果错误响应也是标准格式，直接返回
      if (error.response.data && typeof error.response.data === 'object' && 'success' in error.response.data) {
        return error.response.data
      }
      return {
        success: false,
        error: error.response.data?.error || error.response.data?.message || error.message || '请求失败'
      }
    } else if (error.request) {
      return {
        success: false,
        error: '网络错误，请检查网络连接'
      }
    } else {
      return {
        success: false,
        error: error.message || '未知错误'
      }
    }
  }
}

export default request