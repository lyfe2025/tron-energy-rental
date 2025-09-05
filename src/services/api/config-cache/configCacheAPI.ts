/**
 * 配置缓存管理API
 */
import { apiClient } from '../core/apiClient';
import type { ApiResponse } from '../core/types';

export interface ConfigHistoryRecord {
  id: string;
  entity_type: 'bot' | 'network' | 'energy_pool' | 'system' | string;
  entity_id?: string;
  operation_type: 'create' | 'update' | 'delete' | 'activate' | 'deactivate' | string;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  change_reason?: string;
  change_description?: string;
  user_id?: string;
  user_type?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  rollback_id?: string;
  is_rollback?: boolean;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ConfigHistoryQueryParams {
  entity_type?: string;
  entity_id?: string;
  operation_type?: string;
  limit?: number;
  offset?: number;
}

export interface ConfigHistoryResponse {
  history: ConfigHistoryRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export const configCacheAPI = {
  /**
   * 获取配置变更历史
   */
  getHistory: (params?: ConfigHistoryQueryParams) => 
    apiClient.get<ApiResponse<ConfigHistoryResponse>>('/api/config-cache/history', { params }),

  /**
   * 获取缓存状态
   */
  getCacheStatus: () => 
    apiClient.get<ApiResponse<any>>('/api/config-cache/status'),

  /**
   * 清除指定机器人缓存
   */
  clearBotCache: (id: string) => 
    apiClient.delete<ApiResponse<void>>(`/api/config-cache/bot/${id}`),

  /**
   * 清除指定网络缓存
   */
  clearNetworkCache: (id: string) => 
    apiClient.delete<ApiResponse<void>>(`/api/config-cache/network/${id}`),

  /**
   * 清除指定能量池缓存
   */
  clearPoolCache: (id: string) => 
    apiClient.delete<ApiResponse<void>>(`/api/config-cache/pool/${id}`),

  /**
   * 清除系统缓存
   */
  clearSystemCache: () => 
    apiClient.delete<ApiResponse<void>>('/api/config-cache/system'),

  /**
   * 批量清除缓存
   */
  clearBatchCache: (data: any) => 
    apiClient.delete<ApiResponse<void>>('/api/config-cache/batch', { data }),

  /**
   * 预热缓存
   */
  warmupCache: () => 
    apiClient.post<ApiResponse<void>>('/api/config-cache/warmup'),

  /**
   * 发送通知
   */
  publishNotification: (data: any) => 
    apiClient.post<ApiResponse<void>>('/api/config-cache/notify', data)
};

export default configCacheAPI;
