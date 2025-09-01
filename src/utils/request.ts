import { api } from './api'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

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