/**
 * 认证相关API
 */
import type { User } from '../../../types/api';
import { apiClient } from '../core/apiClient';
import type { ApiResponse } from '../core/types';

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface VerifyTokenResponse {
  user: User
}

export interface RefreshTokenResponse {
  token: string
}

export const authAPI = {
  /**
   * 管理员登录
   */
  login: (credentials: LoginCredentials) => 
    apiClient.post<ApiResponse<LoginResponse>>('/api/auth/login', credentials),
  
  /**
   * 验证token
   */
  verifyToken: () => 
    apiClient.get<ApiResponse<VerifyTokenResponse>>('/api/auth/verify'),
  
  /**
   * 刷新token
   */
  refreshToken: () => 
    apiClient.post<ApiResponse<RefreshTokenResponse>>('/api/auth/refresh'),

  /**
   * 登出
   */
  logout: () => 
    apiClient.post<ApiResponse<void>>('/api/auth/logout')
};

export default authAPI;
