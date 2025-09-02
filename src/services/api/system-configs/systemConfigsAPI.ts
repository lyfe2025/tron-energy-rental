/**
 * 系统配置API
 */
import type { SystemConfig } from '../../../types/api';
import { apiClient } from '../core/apiClient';
import type { ApiResponse } from '../core/types';

export interface ConfigQueryParams {
  category?: string
  key?: string
}

export const systemConfigsAPI = {
  /**
   * 获取系统配置
   */
  getConfigs: (params?: ConfigQueryParams) => 
    apiClient.get<ApiResponse<SystemConfig[]>>('/api/system/configs', { params }),

  /**
   * 获取单个配置
   */
  getConfig: (key: string) => 
    apiClient.get<ApiResponse<SystemConfig>>(`/api/system/configs/${key}`),

  /**
   * 更新配置
   */
  updateConfig: (key: string, value: any) => 
    apiClient.put<ApiResponse<SystemConfig>>(`/api/system/configs/${key}`, { value }),

  /**
   * 批量更新配置
   */
  batchUpdateConfigs: (configs: Array<{ key: string; value: any }>) => 
    apiClient.post<ApiResponse<void>>('/api/system/configs/batch', { configs }),

  /**
   * 重置配置为默认值
   */
  resetConfig: (key: string) => 
    apiClient.post<ApiResponse<SystemConfig>>(`/api/system/configs/${key}/reset`),

  /**
   * 获取所有设置配置（别名方法）
   */
  getAllSettingsConfigs: () => 
    apiClient.get<ApiResponse<SystemConfig[]>>('/api/system/configs'),

  /**
   * 批量更新配置（别名方法）
   */
  updateConfigs: (configs: Array<{ config_key: string; config_value: any }>, changeReason?: string) => 
    apiClient.post<ApiResponse<void>>('/api/system/configs/batch', { 
      configs, 
      changeReason 
    })
};

export default systemConfigsAPI;
