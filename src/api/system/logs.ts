import request, { type ApiResponse } from '@/utils/request'

// 登录日志API
export const loginLogApi = {
  // 获取登录日志列表
  getList: (params: any): Promise<ApiResponse> => {
    return request({
      url: '/system/logs/logins',
      method: 'get',
      params
    })
  },

  // 获取登录日志详情
  getDetail: (id: number): Promise<ApiResponse> => {
    return request({
      url: `/system/logs/logins/${id}`,
      method: 'get'
    })
  }
}

// 操作日志API
export const operationLogApi = {
  // 获取操作日志列表
  getList: (params: any): Promise<ApiResponse> => {
    return request({
      url: '/system/logs/operations',
      method: 'get',
      params
    })
  },

  // 获取操作日志详情
  getDetail: (id: number): Promise<ApiResponse> => {
    return request({
      url: `/system/logs/operations/${id}`,
      method: 'get'
    })
  }
}

// 导出所有日志API
export default {
  loginLog: loginLogApi,
  operationLog: operationLogApi
}