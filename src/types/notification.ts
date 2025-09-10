/**
 * 前端通知管理相关类型定义
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
  last_used_at?: string;
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_at: string;
  updated_at: string;
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
  scheduled_at?: string;
  priority: number;
  options?: { [key: string]: any };
  metadata?: { [key: string]: any };
  error_details?: string;
  error_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  created_by: string;
  created_by_name?: string;
  template_name?: string;
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
  created_at: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
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
  scheduled_at?: string;
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

// 常量定义
export const NOTIFICATION_TYPES = {
  BUSINESS: {
    ORDER_CREATED: 'order_created',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    ENERGY_DELEGATION_COMPLETE: 'energy_delegation_complete',
    ENERGY_DELEGATION_FAILED: 'energy_delegation_failed',
    ORDER_STATUS_UPDATE: 'order_status_update',
    BALANCE_RECHARGED: 'balance_recharged',
    BALANCE_INSUFFICIENT: 'balance_insufficient'
  },
  AGENT: {
    APPLICATION_SUBMITTED: 'application_submitted',
    APPLICATION_APPROVED: 'application_approved',
    APPLICATION_REJECTED: 'application_rejected',
    COMMISSION_EARNED: 'commission_earned',
    LEVEL_UPGRADE: 'level_upgrade',
    WITHDRAWAL_COMPLETED: 'withdrawal_completed',
    MONTHLY_SUMMARY: 'monthly_summary'
  },
  PRICE: {
    PRICE_INCREASE: 'price_increase',
    PRICE_DECREASE: 'price_decrease',
    NEW_PACKAGE: 'new_package',
    LIMITED_OFFER: 'limited_offer',
    STOCK_WARNING: 'stock_warning'
  },
  SYSTEM: {
    MAINTENANCE_NOTICE: 'maintenance_notice',
    MAINTENANCE_START: 'maintenance_start',
    MAINTENANCE_COMPLETE: 'maintenance_complete',
    SYSTEM_ALERT: 'system_alert',
    SECURITY_WARNING: 'security_warning',
    DAILY_REPORT: 'daily_report'
  },
  MARKETING: {
    NEW_FEATURE: 'new_feature',
    USER_REACTIVATION: 'user_reactivation',
    SATISFACTION_SURVEY: 'satisfaction_survey',
    BIRTHDAY_GREETING: 'birthday_greeting',
    VIP_EXCLUSIVE: 'vip_exclusive'
  }
} as const;

export const NOTIFICATION_CATEGORIES = [
  'business', 'agent', 'price', 'system', 'marketing'
] as const;

export const NOTIFICATION_STATUSES = [
  'pending', 'sending', 'completed', 'failed', 'cancelled'
] as const;

export const TARGET_TYPES = [
  'all', 'active_only', 'agents_only', 'vip_only', 'custom'
] as const;

export const URGENCY_LEVELS = [
  'low', 'medium', 'high'
] as const;

// 通知类型显示名称映射
export const NOTIFICATION_TYPE_NAMES = {
  // 业务通知
  order_created: '订单创建通知',
  payment_success: '支付成功通知',
  payment_failed: '支付失败通知',
  energy_delegation_complete: '能量委托完成通知',
  energy_delegation_failed: '能量委托失败通知',
  order_status_update: '订单状态更新通知',
  balance_recharged: '余额充值成功通知',
  balance_insufficient: '余额不足提醒',
  
  // 代理通知
  application_submitted: '代理申请提交通知',
  application_approved: '代理审核通过通知',
  application_rejected: '代理审核拒绝通知',
  commission_earned: '佣金到账通知',
  level_upgrade: '代理等级升级通知',
  withdrawal_completed: '提现成功通知',
  monthly_summary: '月度佣金统计通知',
  
  // 价格通知
  price_increase: '价格上涨通知',
  price_decrease: '价格下降通知',
  new_package: '新套餐上线通知',
  limited_offer: '限时优惠通知',
  stock_warning: '库存预警通知',
  
  // 系统通知
  maintenance_notice: '系统维护通知',
  maintenance_start: '维护开始通知',
  maintenance_complete: '维护完成通知',
  system_alert: '系统异常通知',
  security_warning: '安全警告通知',
  daily_report: '每日数据报告',
  
  // 营销通知
  new_feature: '新功能介绍',
  user_reactivation: '用户召回通知',
  satisfaction_survey: '满意度调查',
  birthday_greeting: '生日祝福',
  vip_exclusive: 'VIP专享通知'
} as const;
