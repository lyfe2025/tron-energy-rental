/**
 * 机器人路由相关类型定义
 */
import type { Request, Response } from 'express';
import TelegramBot from 'node-telegram-bot-api';

// 导出 TelegramBot 类型
export type { TelegramBot };

// 机器人基础信息接口
export interface Bot {
  id: string;
  name: string;
  username: string;
  bot_username: string;
  bot_token?: string;
  status: 'active' | 'inactive' | 'maintenance';
  is_active: boolean;
  work_mode: 'polling' | 'webhook';
  webhook_url?: string;
  webhook_secret?: string;
  max_connections?: number;
  network_id?: string;
  description?: string;
  short_description?: string;
  welcome_message?: string;
  help_message?: string;
  custom_commands?: CustomCommand[];
  menu_button_enabled?: boolean;
  menu_button_text?: string;
  menu_type?: 'commands' | 'web_app';
  web_app_url?: string;
  menu_commands?: MenuCommand[];
  keyboard_config?: any;
  health_status?: string;
  last_health_check?: string;
  total_users: number;
  total_orders: number;
  network_configurations?: BotNetworkConfiguration[];
  created_at: string;
  updated_at: string;
}

// 自定义命令接口
export interface CustomCommand {
  command: string;
  response_message: string;
  is_enabled: boolean;
}

// 菜单命令接口
export interface MenuCommand {
  command: string;
  description: string;
}

// 机器人创建数据接口
export interface CreateBotData {
  name: string;
  username: string;
  token: string;
  description?: string;
  short_description?: string;
  network_id?: string;
  work_mode?: 'polling' | 'webhook';
  webhook_url?: string;
  webhook_secret?: string;
  max_connections?: number;
  settings?: Record<string, any>;
  welcome_message?: string;
  help_message?: string;
  custom_commands?: CustomCommand[];
  menu_button_enabled?: boolean;
  menu_button_text?: string;
  menu_type?: 'commands' | 'web_app';
  web_app_url?: string;
  menu_commands?: MenuCommand[];
  keyboard_config?: any;
  price_config?: any;
  is_active?: boolean;
}

// 机器人更新数据接口
export interface UpdateBotData {
  name?: string;
  username?: string;
  token?: string;
  description?: string;
  short_description?: string;
  network_id?: string;
  work_mode?: 'polling' | 'webhook';
  webhook_url?: string;
  webhook_secret?: string;
  max_connections?: number;
  settings?: Record<string, any>;
  welcome_message?: string;
  help_message?: string;
  custom_commands?: CustomCommand[];
  menu_button_enabled?: boolean;
  menu_button_text?: string;
  menu_type?: 'commands' | 'web_app';
  web_app_url?: string;
  menu_commands?: MenuCommand[];
  keyboard_config?: any;
  price_config?: any;
  is_active?: boolean;
}

// 机器人模式切换接口
export interface BotModeSwitchData {
  work_mode: 'polling' | 'webhook';
  webhook_url?: string;
  webhook_secret?: string;
  max_connections?: number;
}

// Webhook状态检查响应接口
export interface WebhookStatusResponse {
  url?: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

// 机器人配置数据接口
export interface BotConfigData {
  welcome_message?: string;
  help_message?: string;
  commands?: string[];
}

// 扩展的机器人配置接口
export interface ExtendedBotConfigData {
  network_config?: {
    primary_network_id?: string;
    fallback_networks?: string[];
    auto_switch?: boolean;
    connection_timeout?: number;
  };
  webhook_config?: {
    url?: string;
    secret?: string;
    max_connections?: number;
    allowed_updates?: string[];
    drop_pending_updates?: boolean;
  };
  message_templates?: {
    welcome?: string;
    help?: string;
    error?: string;
    maintenance?: string;
    [key: string]: string | undefined;
  };
  rate_limits?: {
    messages_per_minute?: number;
    commands_per_hour?: number;
    orders_per_day?: number;
  };
  security_settings?: {
    allowed_user_ids?: string[];
    blocked_user_ids?: string[];
    require_verification?: boolean;
    max_failed_attempts?: number;
  };
}

// 网络配置接口
export interface NetworkConfig {
  id: string;
  name: string;
  type: 'mainnet' | 'testnet' | 'private';
  rpc_url: string;
  api_key?: string;
  chain_id: string;
  explorer_url?: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  timeout_ms: number;
  retry_count: number;
  rate_limit: number;
  config: Record<string, any>;
  health_check_url?: string;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
  description?: string;
  created_at: string;
  updated_at: string;
}

// 机器人网络配置接口（合并后的JSONB数组元素）
export interface BotNetworkConfiguration {
  id: string;
  network_id: string;
  network_name: string;
  network_type: string;
  rpc_url: string;
  is_active: boolean;
  is_primary: boolean;
  priority: number;
  config: Record<string, any>;
  api_settings: Record<string, any>;
  contract_addresses: Record<string, string>;
  gas_settings: Record<string, any>;
  monitoring_settings: Record<string, any>;
  last_sync_at?: string;
  sync_status: 'pending' | 'success' | 'error';
  error_count: number;
  last_error?: string;
  last_error_at?: string;
  created_at: string;
  updated_at: string;
}

// 添加/更新网络配置的请求接口
export interface AddBotNetworkConfigRequest {
  bot_id: string;
  network_id: string;
  is_active?: boolean;
  is_primary?: boolean;
  priority?: number;
  config?: Record<string, any>;
  api_settings?: Record<string, any>;
  contract_addresses?: Record<string, string>;
  gas_settings?: Record<string, any>;
  monitoring_settings?: Record<string, any>;
}

// 更新网络配置的请求接口
export interface UpdateBotNetworkConfigRequest {
  bot_id: string;
  config_id: string;
  is_active?: boolean;
  is_primary?: boolean;
  priority?: number;
  config?: Record<string, any>;
  api_settings?: Record<string, any>;
  contract_addresses?: Record<string, string>;
  gas_settings?: Record<string, any>;
  monitoring_settings?: Record<string, any>;
}

// 机器人健康检查接口
export interface BotHealthCheck {
  bot_id: string;
  status: 'healthy' | 'unhealthy' | 'maintenance';
  last_check: string;
  response_time_ms?: number;
  error_message?: string;
  network_status: Record<string, 'connected' | 'disconnected' | 'error'>;
}

// 机器人状态更新接口
export interface BotStatusData {
  status: 'active' | 'inactive' | 'maintenance';
}

// 分页查询参数接口
export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

// 机器人统计数据接口
export interface BotStats {
  users: {
    total_bot_users: number;
    active_users: number;
    blocked_users: number;
    active_users_week: number;
  };
  orders: {
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    orders_week: number;
    total_revenue: number;
  };
}

// 机器人详情响应接口
export interface BotDetailsResponse {
  bot: Bot;
  stats: BotStats;
}

// 路由处理器类型
export type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

// API响应基础接口
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
