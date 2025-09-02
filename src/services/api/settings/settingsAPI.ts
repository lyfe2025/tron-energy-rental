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
    apiClient.get<ApiResponse<SystemSettings>>('/api/settings'),

  /**
   * 更新系统设置
   */
  updateSettings: (data: UpdateSettingsData) => 
    apiClient.put<ApiResponse<SystemSettings>>('/api/settings', data),

  /**
   * 获取特定分类的设置
   */
  getCategorySettings: (category: string) => 
    apiClient.get<ApiResponse<Record<string, any>>>(`/api/settings/${category}`),

  /**
   * 更新特定分类的设置
   */
  updateCategorySettings: (category: string, data: Record<string, any>) => 
    apiClient.put<ApiResponse<Record<string, any>>>(`/api/settings/${category}`, data),

  /**
   * 重置设置为默认值
   */
  resetToDefaults: (categories?: string[]) => 
    apiClient.post<ApiResponse<SystemSettings>>('/api/settings/reset', { categories }),

  /**
   * 获取设置模板
   */
  getSettingsTemplate: () => 
    apiClient.get<ApiResponse<{
      categories: Array<{
        name: string
        label: string
        description: string
        settings: Array<{
          key: string
          label: string
          type: 'string' | 'number' | 'boolean' | 'select' | 'json'
          description: string
          default: any
          options?: Array<{ value: any; label: string }>
          validation?: {
            required?: boolean
            min?: number
            max?: number
            pattern?: string
          }
        }>
      }>
    }>>('/api/settings/template'),

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
    }>>('/api/settings/validate', data),

  /**
   * 导出设置配置
   */
  exportSettings: () => 
    apiClient.get<Blob>('/api/settings/export', { responseType: 'blob' }),

  /**
   * 导入设置配置
   */
  importSettings: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse<SystemSettings>>('/api/settings/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export default settingsAPI;
