/**
 * 系统设置API
 */
import type { SystemSettings, UpdateSettingsData } from '../../../types/api';
import { apiClient } from '../core/apiClient';
import type { ApiResponse } from '../core/types';

export const settingsAPI = {
  /**
   * 获取系统设置
   */
  getSettings: () => 
    apiClient.get<ApiResponse<SystemSettings>>('/api/system-configs/all-settings'),

  /**
   * 更新系统设置
   */
  updateSettings: (data: UpdateSettingsData) => 
    apiClient.put<ApiResponse<SystemSettings>>('/api/system-configs/batch/update', data),

  /**
   * 获取特定分类的设置
   */
  getCategorySettings: (category: string) => 
    apiClient.get<ApiResponse<Record<string, any>>>('/api/system-configs', { params: { category } }),

  /**
   * 更新特定分类的设置
   */
  updateCategorySettings: (category: string, data: Record<string, any>) => {
    // 将分类设置转换为批量更新格式
    const configs = Object.entries(data).map(([key, value]) => ({
      config_key: `${category}.${key}`,
      config_value: value
    }));
    return apiClient.put<ApiResponse<Record<string, any>>>('/api/system-configs/batch/update', { 
      configs,
      change_reason: `更新${category}分类设置`
    });
  },

  /**
   * 重置设置为默认值
   */
  resetToDefaults: (categories?: string[]) => {
    // 暂时不实现，返回 Promise 避免编译错误
    return Promise.reject(new Error('暂不支持批量重置功能'));
  },

  /**
   * 获取设置模板
   */
  getSettingsTemplate: () => 
    Promise.reject(new Error('暂不支持设置模板功能')),

  /**
   * 验证设置配置
   */
  validateSettings: (data: Record<string, any>) => 
    apiClient.post<ApiResponse<{
      valid: boolean
      errors: Array<{
        field: string
        message: string
      }>
    }>>('/api/system-configs/validate', data),

  /**
   * 导出设置配置
   */
  exportSettings: () => 
    Promise.reject(new Error('暂不支持导出功能')),

  /**
   * 导入设置配置
   */
  importSettings: (file: File) => {
    return Promise.reject(new Error('暂不支持导入功能'));
  }
};

export default settingsAPI;
