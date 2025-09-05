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
    apiClient.get<ApiResponse<SystemConfig[]>>('/api/system-configs', { params }),

  /**
   * 获取单个配置
   */
  getConfig: (key: string) => 
    apiClient.get<ApiResponse<SystemConfig>>('/api/system-configs/get', { params: { key } }),

  /**
   * 更新配置
   */
  updateConfig: (key: string, config_value: any, changeReason?: string) => 
    apiClient.put<ApiResponse<SystemConfig>>('/api/system-configs/update', { 
      key, 
      config_value, 
      change_reason: changeReason 
    }),

  /**
   * 批量更新配置
   */
  batchUpdateConfigs: (configs: Array<{ config_key: string; config_value: any }>, changeReason?: string) => 
    apiClient.put<ApiResponse<void>>('/api/system-configs/batch/update', { 
      configs, 
      change_reason: changeReason 
    }),

  /**
   * 重置配置为默认值
   */
  resetConfig: (key: string, changeReason?: string) => 
    apiClient.post<ApiResponse<SystemConfig>>('/api/system-configs/reset', { 
      key, 
      change_reason: changeReason 
    }),

  /**
   * 获取所有设置配置
   */
  getAllSettingsConfigs: () => 
    apiClient.get<ApiResponse<SystemConfig[]>>('/api/system-configs/all-settings'),

  /**
   * 批量更新配置（别名方法，保持向后兼容）
   */
  updateConfigs: (configs: Array<{ config_key: string; config_value: any }>, changeReason?: string) => {
    console.log('🌐 [API调用] updateConfigs 开始调用');
    console.log('📤 [API调用] 请求数据:', {
      url: '/api/system-configs/batch/update',
      method: 'PUT',
      configs,
      change_reason: changeReason
    });
    
    return apiClient.put<ApiResponse<void>>('/api/system-configs/batch/update', { 
      configs, 
      change_reason: changeReason 
    }).then(response => {
      console.log('📥 [API调用] updateConfigs 响应:', response);
      return response;
    }).catch(error => {
      console.error('💥 [API调用] updateConfigs 错误:', error);
      throw error;
    });
  },

  /**
   * 获取配置分类统计
   */
  getConfigStats: () => 
    apiClient.get<ApiResponse<any>>('/api/system-configs/stats'),

  /**
   * 获取配置历史记录
   */
  getConfigHistory: (key: string, page = 1, limit = 20) => 
    apiClient.get<ApiResponse<any>>('/api/system-configs/history', { 
      params: { key, page, limit } 
    })
};

export default systemConfigsAPI;
