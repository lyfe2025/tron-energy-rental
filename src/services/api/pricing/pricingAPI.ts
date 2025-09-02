/**
 * 定价管理API
 */
import type { CreatePriceTemplateData, PriceTemplate, UpdatePriceTemplateData } from '../../../types/api';
import { apiClient } from '../core/apiClient';
import type { ApiResponse, PaginatedResponse } from '../core/types';

export const pricingAPI = {
  /**
   * 获取价格模板列表
   */
  getTemplates: () => 
    apiClient.get<PaginatedResponse<PriceTemplate>>('/api/pricing/templates'),

  /**
   * 创建价格模板
   */
  createTemplate: (data: CreatePriceTemplateData) => 
    apiClient.post<ApiResponse<PriceTemplate>>('/api/pricing/templates', data),

  /**
   * 更新价格模板
   */
  updateTemplate: (id: string, data: UpdatePriceTemplateData) => 
    apiClient.put<ApiResponse<PriceTemplate>>(`/api/pricing/templates/${id}`, data),

  /**
   * 删除价格模板
   */
  deleteTemplate: (id: string) => 
    apiClient.delete<ApiResponse<void>>(`/api/pricing/templates/${id}`),

  /**
   * 获取当前生效的价格配置
   */
  getActiveConfig: () => 
    apiClient.get<ApiResponse<any>>('/api/pricing/active-config'),

  /**
   * 应用价格模板
   */
  applyTemplate: (id: string) => 
    apiClient.post<ApiResponse<void>>(`/api/pricing/templates/${id}/apply`)
};

export default pricingAPI;
