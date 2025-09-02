/**
 * 用户管理API
 */
import type { CreateUserData, UpdateUserData, User } from '../../../types/api';
import { apiClient } from '../core/apiClient';
import type { ApiResponse, PaginatedResponse, QueryParams } from '../core/types';

export interface UserQueryParams extends QueryParams {
  status?: string
}

export interface ResetPasswordResponse {
  new_password: string
}

export const usersAPI = {
  /**
   * 获取用户列表
   */
  getUsers: (params?: UserQueryParams) => 
    apiClient.get<PaginatedResponse<User>>('/api/users', { params }),
  
  /**
   * 获取用户详情
   */
  getUser: (id: string) => 
    apiClient.get<ApiResponse<User>>(`/api/users/${id}`),
  
  /**
   * 创建用户
   */
  createUser: (data: CreateUserData) => 
    apiClient.post<ApiResponse<User>>('/api/users', data),
  
  /**
   * 更新用户状态
   */
  updateUserStatus: (id: string, status: string) => 
    apiClient.patch<ApiResponse<User>>(`/api/users/${id}/status`, { status }),
  
  /**
   * 更新用户信息
   */
  updateUser: (id: string, data: UpdateUserData) => 
    apiClient.put<ApiResponse<User>>(`/api/users/${id}`, data),
  
  /**
   * 重置用户密码
   */
  resetPassword: (id: string) => 
    apiClient.post<ApiResponse<ResetPasswordResponse>>(`/api/users/${id}/reset-password`),

  /**
   * 删除用户
   */
  deleteUser: (id: string) => 
    apiClient.delete<ApiResponse<void>>(`/api/users/${id}`),

  /**
   * 批量更新用户状态
   */
  batchUpdateStatus: (userIds: string[], status: string) => 
    apiClient.post<ApiResponse<void>>('/api/users/batch/status', { userIds, status }),

  /**
   * 导出用户数据
   */
  exportUsers: (params?: UserQueryParams) => 
    apiClient.get<Blob>('/api/users/export', { 
      params, 
      responseType: 'blob' 
    })
};

export default usersAPI;
