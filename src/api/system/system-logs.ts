import request, { type ApiResponse } from '@/utils/request'

export interface SystemLogSearchParams {
  page?: number
  pageSize?: number
  level?: string
  module?: string
  message?: string
  start_date?: string
  end_date?: string
  user_id?: string
}

// 系统日志API
export const systemLogsApi = {
  // 获取系统日志列表
  getList: (params: SystemLogSearchParams): Promise<ApiResponse> => {
    return request({
      url: '/system/logs/system',
      method: 'get',
      params
    })
  },

  // 获取系统日志详情
  getDetail: (id: string): Promise<ApiResponse> => {
    return request({
      url: `/system/logs/system/${id}`,
      method: 'get'
    })
  },

  // 获取系统日志统计
  getStats: (): Promise<ApiResponse> => {
    return request({
      url: '/system/logs/system/stats',
      method: 'get'
    })
  }
}

export default systemLogsApi
