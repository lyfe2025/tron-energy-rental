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
export type RouteHandler = (req: Request, res: Response) => Promise<void>;

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
