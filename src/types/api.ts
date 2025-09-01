// API 相关类型定义

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
  error?: string
}

// 用户相关类型
export interface User {
  id: string
  telegram_id?: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  role: 'admin' | 'agent' | 'user'
  status: 'active' | 'inactive' | 'banned'
  balance: number
  usdt_balance: number
  trx_balance: number
  last_login?: string
  login_count?: number
  permissions?: string[]
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone?: string
  role: 'admin' | 'agent' | 'user'
  balance?: number
  status?: 'active' | 'inactive' | 'banned'
}

export interface UpdateUserData {
  username?: string
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  role?: 'admin' | 'agent' | 'user'
  status?: 'active' | 'inactive' | 'banned'
  balance?: number
}

// 订单相关类型
export interface Order {
  id: number
  user_id: number
  package_id: number
  energy_amount: number
  duration_hours: number
  price_trx: number
  recipient_address: string
  status: 'pending' | 'paid' | 'processing' | 'active' | 'completed' | 'failed' | 'cancelled' | 'expired'
  payment_address?: string
  payment_amount?: number
  payment_tx_hash?: string
  delegation_tx_hash?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface UpdateOrderStatusData {
  status: string
  payment_tx_hash?: string
  note?: string
}

// 机器人相关类型
export interface Bot {
  id: string
  name: string
  username: string
  token?: string
  description?: string
  status: 'active' | 'inactive' | 'maintenance' | 'error'
  webhook_url?: string
  settings?: Record<string, unknown>
  welcome_message?: string
  help_message?: string
  commands?: unknown[]
  total_users?: number
  total_orders?: number
  min_order_amount?: number
  max_order_amount?: number
  commission_rate?: number
  daily_limit?: number
  monthly_limit?: number
  success_rate?: number
  balance?: number
  energy_balance?: number
  today_orders?: number
  last_active_at?: string
  last_activity?: string
  address?: string
  private_key?: string
  type?: 'energy' | 'bandwidth' | 'mixed'
  created_at: string
  updated_at: string
}

export interface CreateBotData {
  name: string
  private_key: string
  address: string
  type: string
  description: string
  min_order_amount: number
  max_order_amount: number
  status: 'active' | 'inactive' | 'maintenance'
}

export interface UpdateBotData {
  name?: string
  username?: string
  token?: string
  private_key?: string
  address?: string
  type?: string
  description?: string
  min_order_amount?: number
  max_order_amount?: number
  status?: 'active' | 'inactive' | 'maintenance'
}

// 价格模板相关类型
export interface PriceTemplate {
  id: string
  name: string
  base_price: number
  min_amount: number
  max_amount: number
  discount_rate: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreatePriceTemplateData {
  name: string
  base_price: number
  min_amount: number
  max_amount: number
  discount_rate: number
  description?: string
  is_active?: boolean
}

export interface UpdatePriceTemplateData {
  name?: string
  base_price?: number
  min_amount?: number
  max_amount?: number
  discount_rate?: number
  description?: string
  is_active?: boolean
}

// 机器人定价相关类型
export interface BotPricing {
  id: string
  bot_id: string
  energy_type: string
  base_price: number
  discount_rate: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UpdateBotPricingData {
  energy_type?: string
  base_price?: number
  discount_rate?: number
  is_active?: boolean
}

// 代理商价格相关类型
export interface AgentPricing {
  id: string
  agent_id: string
  energy_type: string
  base_price: number
  commission_rate: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UpdateAgentPricingData {
  energy_type?: string
  base_price?: number
  commission_rate?: number
  is_active?: boolean
}

// 能量包相关类型
export interface EnergyPackage {
  id: string
  name: string
  type: 'energy' | 'bandwidth' | 'mixed'
  description?: string
  energy_amount: number
  bandwidth_amount?: number
  price: number
  original_price?: number
  discount_percentage?: number
  status: 'active' | 'inactive'
  sales_count?: number
  today_sales?: number
  created_at: string
  updated_at: string
}

export interface CreateEnergyPackageData {
  name: string
  type: 'energy' | 'bandwidth' | 'mixed'
  description?: string
  energy_amount: number
  bandwidth_amount?: number
  price: number
  original_price?: number
  discount_percentage?: number
  status: 'active' | 'inactive'
}

export interface UpdateEnergyPackageData {
  name?: string
  type?: 'energy' | 'bandwidth' | 'mixed'
  description?: string
  energy_amount?: number
  bandwidth_amount?: number
  price?: number
  original_price?: number
  discount_percentage?: number
  duration_hours?: number
  is_active?: boolean
  status?: string
}

// 系统配置相关类型
export interface SystemConfig {
  id: string
  config_key: string
  config_value: string
  config_type: 'string' | 'number' | 'boolean' | 'json' | 'array'
  category: string
  description?: string
  is_public: boolean
  is_editable: boolean
  validation_rules?: string
  default_value?: string
  created_at: string
  updated_at: string
}

export interface UpdateSystemConfigData {
  config_value?: string
  config_type?: 'string' | 'number' | 'boolean' | 'json' | 'array'
  category?: string
  description?: string
  is_public?: boolean
  is_editable?: boolean
  validation_rules?: string
  default_value?: string
}

// 统计相关类型
export interface StatisticsParams {
  period?: string
  start_date?: string
  end_date?: string
  type?: string
  time_range?: string
}

export interface OrderStats {
  total: number
  pending: number
  paid: number
  processing: number
  active: number
  completed: number
  failed: number
  cancelled: number
  expired: number
  totalRevenue: number
  averageOrderValue: number
}

export interface RevenueStats {
  total_revenue: number
  daily_revenue: number
  weekly_revenue: number
  monthly_revenue: number
  revenue_growth: number
}

export interface UserActivityStats {
  total_users: number
  active_users: number
  new_users: number
  user_growth: number
}

// 系统设置相关类型
export interface SystemSettings {
  basic: {
    system_name: string
    system_version: string
    admin_email: string
    support_phone: string
    timezone: string
    language: string
    maintenance_message: string
  }
  business: {
    min_order_amount: number
    max_order_amount: number
    default_commission_rate: number
    auto_approve_orders: boolean
    require_kyc: boolean
    max_daily_orders: number
    order_timeout_minutes: number
    referral_reward_rate: number
    bot_min_balance: number
    bot_check_interval: number
    max_concurrent_orders: number
    bot_restart_limit: number
    max_retry_count: number
    default_user_balance: number
    max_recharge_amount: number
    vip_threshold: number
  }
  security: {
    password_min_length: number
    require_2fa: boolean
    session_timeout_minutes: number
    max_login_attempts: number
    ip_whitelist: string[]
    api_rate_limit: number
    enable_two_factor: boolean
    enable_ip_whitelist: boolean
    api_key_expiry: number
    enable_api_logging: boolean
    enable_request_signing: boolean
    login_fail_limit: number
    lockout_duration: number
    jwt_expiry: number
    require_strong_password: boolean
  }
  features: {
    user_registration: boolean
    auto_order_processing: boolean
    bot_auto_restart: boolean
    price_auto_adjustment: boolean
    maintenance_mode: boolean
    api_access: boolean
    audit_logging: boolean
    real_time_monitoring: boolean
  }
  notifications: {
    email_notifications: boolean
    sms_notifications: boolean
    order_status_updates: boolean
    system_alerts: boolean
    maintenance_notices: boolean
    security_alerts: boolean
    sms_provider: string
    sms_api_key: string
    enable_sms: boolean
    sms_urgent_only: boolean
    smtp_host: string
    smtp_port: number
    smtp_username: string
    smtp_password: string
    enable_email: boolean
    email_order_status: boolean
    email_system_alerts: boolean
  }
}

export interface OperationLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  details: string
  ip_address: string
  user_agent: string
  type: string
  created_at: string
}

export interface UpdateSettingsData {
  basic?: Partial<SystemSettings['basic']>
  business?: Partial<SystemSettings['business']>
  security?: Partial<SystemSettings['security']>
  features?: Partial<SystemSettings['features']>
  notifications?: Partial<SystemSettings['notifications']>
}
