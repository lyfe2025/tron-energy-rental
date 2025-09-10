/**
 * 通知管理API
 */
import { apiClient } from '../core/apiClient';
import type { ApiResponse } from '../core/types';

export interface NotificationConfig {
  enabled: boolean;
  default_language: string;
  timezone: string;
  business_notifications: any;
  agent_notifications: any;
  price_notifications: any;
  system_notifications: any;
  marketing_notifications: any;
  rate_limiting: any;
  retry_strategy: any;
  quiet_hours: any;
  analytics_enabled: boolean;
  performance_monitoring: boolean;
}

export interface NotificationTemplate {
  id: string;
  bot_id: string;
  template_type: string;
  language: string;
  title: string;
  content: string;
  variables: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  bot_id: string;
  notification_types: string[];
  quiet_hours: any;
  rate_limiting: any;
  delivery_preferences: any;
  created_at: string;
  updated_at: string;
}

export interface NotificationAnalytics {
  overview: any;
  trends: any;
  distribution: any;
  performance: any;
}

export interface SendNotificationData {
  message: string;
  target_type: 'all' | 'active' | 'specific';
  target_users?: string[];
  notification_type: string;
  include_image?: boolean;
  delay_seconds?: number;
}

/**
 * 通知API服务
 */
export const notificationsAPI = {
  /**
   * 获取机器人通知配置
   */
  getConfig: (botId: string) =>
    apiClient.get<ApiResponse<NotificationConfig>>(`/api/telegram-bot-notifications/${botId}/config`),

  /**
   * 更新机器人通知配置
   */
  updateConfig: (botId: string, config: Partial<NotificationConfig>) =>
    apiClient.put<ApiResponse<NotificationConfig>>(`/api/telegram-bot-notifications/${botId}/config`, config),

  /**
   * 获取消息模板列表
   */
  getTemplates: (botId: string, params: { page?: number; limit?: number; language?: string; template_type?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.language) queryParams.append('language', params.language);
    if (params.template_type) queryParams.append('template_type', params.template_type);
    
    return apiClient.get<ApiResponse<{ templates: NotificationTemplate[]; pagination: any }>>(`/api/telegram-bot-notifications/${botId}/templates?${queryParams}`);
  },

  /**
   * 创建消息模板
   */
  createTemplate: (botId: string, template: Omit<NotificationTemplate, 'id' | 'bot_id' | 'created_at' | 'updated_at'>) =>
    apiClient.post<ApiResponse<NotificationTemplate>>(`/api/telegram-bot-notifications/${botId}/templates`, template),

  /**
   * 更新消息模板
   */
  updateTemplate: (templateId: string, template: Partial<NotificationTemplate>) =>
    apiClient.put<ApiResponse<NotificationTemplate>>(`/api/telegram-bot-notifications/templates/${templateId}`, template),

  /**
   * 删除消息模板
   */
  deleteTemplate: (templateId: string) =>
    apiClient.delete<ApiResponse<void>>(`/api/telegram-bot-notifications/templates/${templateId}`),

  /**
   * 获取通知设置
   */
  getSettings: (botId: string) =>
    apiClient.get<ApiResponse<NotificationSettings>>(`/api/telegram-bot-notifications/${botId}/settings`),

  /**
   * 更新通知设置
   */
  updateSettings: (botId: string, settings: Partial<NotificationSettings>) =>
    apiClient.put<ApiResponse<NotificationSettings>>(`/api/telegram-bot-notifications/${botId}/settings`, settings),

  /**
   * 获取通知分析数据
   */
  getAnalytics: (botId: string, params: { start_date?: string; end_date?: string; notification_type?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.notification_type) queryParams.append('notification_type', params.notification_type);
    
    return apiClient.get<ApiResponse<NotificationAnalytics>>(`/api/telegram-bot-notifications/${botId}/analytics?${queryParams}`);
  },

  /**
   * 获取详细分析数据
   */
  getDetailedAnalytics: (botId: string, params: { start_date?: string; end_date?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    return apiClient.get<ApiResponse<any>>(`/api/telegram-bot-notifications/${botId}/analytics/detailed?${queryParams}`);
  },

  /**
   * 获取实时数据
   */
  getRealtime: (botId: string) =>
    apiClient.get<ApiResponse<any>>(`/api/telegram-bot-notifications/${botId}/realtime`),

  /**
   * 获取特定通知类型的分析数据
   */
  getNotificationAnalytics: (botId: string, notificationType: string) =>
    apiClient.get<ApiResponse<any>>(`/api/telegram-bot-notifications/${botId}/analytics/notification/${notificationType}`),

  /**
   * 发送手动通知
   */
  sendNotification: (botId: string, data: SendNotificationData) =>
    apiClient.post<ApiResponse<any>>(`/api/telegram-bot-notifications/${botId}/send`, data),

  /**
   * 测试Webhook
   */
  testWebhook: (data: any) =>
    apiClient.post<ApiResponse<any>>('/api/telegram-bot-notifications/test-webhook', data),
};

export default notificationsAPI;
