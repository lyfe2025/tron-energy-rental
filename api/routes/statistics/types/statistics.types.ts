/**
 * 统计分析相关类型定义
 */

export interface StatisticsQuery {
  period?: string;
  group_by?: 'day' | 'week' | 'month';
}

export interface OverviewStats {
  total_orders: number;
  total_revenue: number;
  total_users: number;
  active_users: number;
  online_bots: number;
  orders_change: number;
  revenue_change: number;
  users_change: number;
  bots_change: number;
}

export interface OrderStatistics {
  time_series: any[];
  by_status: any[];
  by_package: any[];
  top_users: any[];
  period_days: number;
  group_by: string;
}

export interface RevenueStatistics {
  time_series: any[];
  by_package: any[];
  agent_earnings: any[];
  summary: {
    current_period_revenue: number;
    previous_period_revenue: number;
    growth_rate: number;
  };
  period_days: number;
  group_by: string;
}

export interface UserStatistics {
  overview: {
    total_users: number;
    active_users: number;
    inactive_users: number;
    banned_users: number;
    new_users_today: number;
    new_users_month: number;
    total_balance: number;
    average_balance: number;
  };
  registration_trend: any[];
  activity_trend: any[];
  user_segmentation: any[];
  retention_analysis: any[];
  user_distribution: any[];
  period_days: number;
}

export interface BotStatistics {
  bot_overview: any[];
  order_statistics: any[];
  usage_trend: any[];
  performance_metrics: any[];
  error_statistics: any[];
  period_days: number;
}

export interface RealtimeStatistics {
  realtime_metrics: any;
  recent_orders: any[];
  system_status: any;
  timestamp: string;
}

export interface BotStatusStats {
  online: number;
  offline: number;
  error: number;
  maintenance: number;
  chart_data: any[];
}
