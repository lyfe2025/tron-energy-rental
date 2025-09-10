/**
 * Telegram机器人通知系统类型定义
 */

// 基础通知配置接口
export interface BotNotificationConfig {
  enabled: boolean;
  default_language: string;
  timezone: string;
  business_notifications: BusinessNotificationConfig;
  agent_notifications: AgentNotificationConfig;
  price_notifications: PriceNotificationConfig;
  system_notifications: SystemNotificationConfig;
  marketing_notifications: MarketingNotificationConfig;
  rate_limiting: RateLimitingConfig;
  retry_strategy: RetryConfig;
  quiet_hours: QuietHoursConfig;
  analytics_enabled: boolean;
  performance_monitoring: boolean;
}

// 业务通知配置
export interface BusinessNotificationConfig {
  enabled: boolean;
  order_created: NotificationTypeConfig;
  payment_success: NotificationTypeConfig;
  payment_failed: NotificationTypeConfig;
  energy_delegation_complete: NotificationTypeConfig;
  energy_delegation_failed: NotificationTypeConfig;
  order_status_update: NotificationTypeConfig;
  balance_recharged: NotificationTypeConfig;
  balance_insufficient: NotificationTypeConfig;
}

// 代理通知配置
export interface AgentNotificationConfig {
  enabled: boolean;
  application_submitted: NotificationTypeConfig;
  application_approved: NotificationTypeConfig;
  application_rejected: NotificationTypeConfig;
  commission_earned: NotificationTypeConfig;
  level_upgrade: NotificationTypeConfig;
  withdrawal_completed: NotificationTypeConfig;
  monthly_summary: NotificationTypeConfig;
}

// 价格通知配置
export interface PriceNotificationConfig {
  enabled: boolean;
  price_increase: NotificationTypeConfig;
  price_decrease: NotificationTypeConfig;
  new_package: NotificationTypeConfig;
  limited_offer: NotificationTypeConfig;
  stock_warning: NotificationTypeConfig;
}

// 系统通知配置
export interface SystemNotificationConfig {
  enabled: boolean;
  maintenance_notice: NotificationTypeConfig;
  maintenance_start: NotificationTypeConfig;
  maintenance_complete: NotificationTypeConfig;
  system_alert: NotificationTypeConfig;
  security_warning: NotificationTypeConfig;
  daily_report: NotificationTypeConfig;
}

// 营销通知配置
export interface MarketingNotificationConfig {
  enabled: boolean;
  new_feature: NotificationTypeConfig;
  user_reactivation: NotificationTypeConfig;
  satisfaction_survey: NotificationTypeConfig;
  birthday_greeting: NotificationTypeConfig;
  vip_exclusive: NotificationTypeConfig;
}

// 通知类型配置
export interface NotificationTypeConfig {
  enabled: boolean;
  delay_seconds?: number;
  include_image?: boolean;
  include_buttons?: boolean;
  edit_existing_message?: boolean;
  retry_notification?: boolean;
  admin_only?: boolean;
  target_all_users?: boolean;
  target_active_users?: boolean;
  vip_only?: boolean;
  min_amount?: number;
  threshold_percent?: number;
  advance_hours?: number;
  inactive_days?: number;
  frequency_days?: number;
  send_on_day?: number;
  urgency_indicators?: boolean;
  include_welcome_guide?: boolean;
  include_feedback?: boolean;
  include_benefits?: boolean;
  include_support_contact?: boolean;
  show_tx_link?: boolean;
}

// 频率限制配置
export interface RateLimitingConfig {
  enabled: boolean;
  max_per_hour: number;
  max_per_day: number;
  user_limits: {
    [key: string]: number;
  };
}

// 重试策略配置
export interface RetryConfig {
  enabled: boolean;
  max_attempts: number;
  delay_seconds: number[];
  exponential_backoff: boolean;
}

// 静默时间配置
export interface QuietHoursConfig {
  enabled: boolean;
  start_time: string;
  end_time: string;
  timezone: string;
}

// 消息模板接口
export interface MessageTemplate {
  id: string;
  bot_id: string;
  name: string;
  type: string;
  category: string;
  language: string;
  content: string;
  parse_mode: 'Markdown' | 'HTML' | 'text';
  buttons: TemplateButton[][];
  variables: TemplateVariable[];
  description?: string;
  tags?: string;
  usage_count: number;
  last_used_at?: Date;
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

// 模板按钮
export interface TemplateButton {
  text: string;
  type: 'callback_data' | 'url' | 'switch_inline_query' | 'switch_inline_query_current_chat';
  value: string;
}

// 模板变量
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'currency';
  description: string;
  required?: boolean;
  default_value?: any;
}

// 通知数据接口
export interface NotificationData {
  type: string;
  category: string;
  title?: string;
  data: { [key: string]: any };
  language?: string;
  image_url?: string;
  priority?: number;
  scheduled_at?: Date;
  target_users?: string[];
  metadata?: { [key: string]: any };
}

// 手动通知数据接口
export interface ManualNotificationData {
  type: string;
  title: string;
  content: string;
  image_url?: string;
  target_users: 'all' | 'active_only' | 'agents_only' | 'vip_only' | 'custom';
  target_criteria?: { [key: string]: any };
  urgency: 'low' | 'medium' | 'high';
  send_immediately?: boolean;
  scheduled_at?: Date;
  action_button?: {
    text: string;
    type: 'url' | 'callback_data';
    value: string;
  };
  options?: {
    disable_notification?: boolean;
    protect_content?: boolean;
    pin_message?: boolean;
    disable_preview?: boolean;
  };
  metadata?: { [key: string]: any };
}

// 系统维护通知数据
export interface MaintenanceNotificationData extends ManualNotificationData {
  maintenance_time: string;
  duration: string;
  affected_features: string[];
  send_schedule: string[];
}

// 公告通知数据
export interface AnnouncementData extends ManualNotificationData {
  policy_change?: boolean;
  feature_update?: boolean;
  security_alert?: boolean;
  holiday_greeting?: boolean;
}

// 发送结果接口
export interface SendResult {
  success: boolean;
  messageId?: number;
  templateId?: string;
  reason?: string;
  error?: any;
}

// 通知日志接口
export interface NotificationLog {
  id: string;
  bot_id: string;
  notification_type: string;
  category: string;
  title?: string;
  target_type: string;
  target_count: number;
  sent_count: number;
  failed_count: number;
  status: 'pending' | 'sending' | 'completed' | 'failed' | 'cancelled';
  message_content?: string;
  template_id?: string;
  template_variables?: { [key: string]: any };
  send_immediately: boolean;
  scheduled_at?: Date;
  priority: number;
  options?: { [key: string]: any };
  metadata?: { [key: string]: any };
  error_details?: string;
  error_count: number;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  created_by: string;
}

// 通知统计接口
export interface NotificationAnalytics {
  bot_id: string;
  date: string;
  notification_type: string;
  category: string;
  total_sent: number;
  total_failed: number;
  total_scheduled: number;
  opened_count: number;
  clicked_count: number;
  callback_count: number;
  avg_send_time_ms: number;
  max_send_time_ms: number;
  min_send_time_ms: number;
  error_rate: number;
  retry_count: number;
  created_at: Date;
}

// 用户通知偏好接口
export interface UserNotificationPreferences {
  id: string;
  user_id: string;
  bot_id: string;
  enabled_types: string[];
  disabled_types: string[];
  global_enabled: boolean;
  quiet_hours: QuietHoursConfig;
  timezone: string;
  prefer_images: boolean;
  language: string;
  max_notifications_per_hour: number;
  marketing_enabled: boolean;
  price_alerts_enabled: boolean;
  agent_notifications_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

// 通知队列接口
export interface NotificationQueueItem {
  id: string;
  bot_id: string;
  queue_type: 'notification' | 'bulk' | 'scheduled';
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  attempts: number;
  max_attempts: number;
  notification_data: any;
  target_user_id?: string;
  target_chat_id?: number;
  scheduled_at: Date;
  next_attempt_at: Date;
  result?: any;
  error_message?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

// API请求和响应类型
export interface GetNotificationConfigRequest {
  bot_id: string;
}

export interface GetNotificationConfigResponse {
  success: boolean;
  data: BotNotificationConfig;
}

export interface UpdateNotificationConfigRequest {
  bot_id: string;
  config: Partial<BotNotificationConfig>;
}

export interface UpdateNotificationConfigResponse {
  success: boolean;
  message: string;
}

export interface SendManualNotificationRequest {
  bot_id: string;
  notification_data: ManualNotificationData;
  created_by: string;
}

export interface SendManualNotificationResponse {
  success: boolean;
  notification_id: string;
  message: string;
}

export interface GetTemplatesRequest {
  bot_id: string;
  type?: string;
  category?: string;
  language?: string;
  page?: number;
  limit?: number;
}

export interface GetTemplatesResponse {
  success: boolean;
  data: {
    templates: MessageTemplate[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface CreateTemplateRequest {
  bot_id: string;
  template: Omit<MessageTemplate, 'id' | 'usage_count' | 'last_used_at' | 'created_at' | 'updated_at'>;
  created_by: string;
}

export interface CreateTemplateResponse {
  success: boolean;
  template_id: string;
  message: string;
}

export interface UpdateTemplateRequest {
  template_id: string;
  template: Partial<MessageTemplate>;
}

export interface UpdateTemplateResponse {
  success: boolean;
  message: string;
}

export interface GetNotificationLogsRequest {
  bot_id: string;
  start_date?: string;
  end_date?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface GetNotificationLogsResponse {
  success: boolean;
  data: {
    logs: NotificationLog[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface GetAnalyticsRequest {
  bot_id: string;
  start_date: string;
  end_date: string;
  group_by?: 'day' | 'week' | 'month';
  type?: string;
  category?: string;
}

export interface GetAnalyticsResponse {
  success: boolean;
  data: {
    analytics: NotificationAnalytics[];
    summary: {
      total_sent: number;
      total_failed: number;
      success_rate: number;
      avg_response_time: number;
    };
  };
}

// 内部工具类型
export type NotificationCategory = 'business' | 'agent' | 'price' | 'system' | 'marketing';
export type NotificationStatus = 'pending' | 'sending' | 'completed' | 'failed' | 'cancelled';
export type NotificationPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type TargetType = 'all' | 'user' | 'group' | 'agents' | 'custom';
export type UrgencyLevel = 'low' | 'medium' | 'high';
export type QueueType = 'notification' | 'bulk' | 'scheduled';

// 常量定义
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'business', 'agent', 'price', 'system', 'marketing'
];

export const NOTIFICATION_STATUSES: NotificationStatus[] = [
  'pending', 'sending', 'completed', 'failed', 'cancelled'
];

export const TARGET_TYPES: TargetType[] = [
  'all', 'user', 'group', 'agents', 'custom'
];

export const URGENCY_LEVELS: UrgencyLevel[] = [
  'low', 'medium', 'high'
];

// 默认配置常量
export const DEFAULT_RATE_LIMITING: RateLimitingConfig = {
  enabled: true,
  max_per_hour: 10,
  max_per_day: 50,
  user_limits: {
    transaction: 5,
    order_status: 3,
    price_change: 2,
    marketing: 1,
    system: 3
  }
};

export const DEFAULT_RETRY_STRATEGY: RetryConfig = {
  enabled: true,
  max_attempts: 3,
  delay_seconds: [30, 300, 1800],
  exponential_backoff: true
};

export const DEFAULT_QUIET_HOURS: QuietHoursConfig = {
  enabled: false,
  start_time: '23:00',
  end_time: '07:00',
  timezone: 'Asia/Shanghai'
};
