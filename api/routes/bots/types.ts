/**
 * 机器人路由相关类型定义
 */
import type { Request, Response } from 'express';

// 机器人基础信息接口
export interface Bot {
  id: string;
  name: string;
  username: string;
  status: 'active' | 'inactive' | 'maintenance';
  webhook_url?: string;
  total_users: number;
  total_orders: number;
  created_at: string;
  updated_at: string;
}

// 机器人创建数据接口
export interface CreateBotData {
  name: string;
  username: string;
  token: string;
  description?: string;
  webhook_url?: string;
  settings?: Record<string, any>;
  welcome_message?: string;
  help_message?: string;
  commands?: string[];
}

// 机器人更新数据接口
export interface UpdateBotData {
  name?: string;
  username?: string;
  token?: string;
  description?: string;
  webhook_url?: string;
  settings?: Record<string, any>;
  welcome_message?: string;
  help_message?: string;
  commands?: string[];
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

// 机器人网络配置关联接口
export interface BotNetworkConfig {
  id: string;
  bot_id: string;
  network_id: string;
  is_active: boolean;
  is_primary: boolean;
  priority: number;
  config: Record<string, any>;
  api_settings: Record<string, any>;
  contract_addresses: Record<string, string>;
  gas_settings: Record<string, any>;
  monitoring_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
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
