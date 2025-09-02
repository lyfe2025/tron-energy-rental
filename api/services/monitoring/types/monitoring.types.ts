/**
 * 监控服务类型定义
 */

export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
}

export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
}

export interface DiskUsage {
  used: number;
  total: number;
  percentage: number;
}

export interface Performance {
  cpuUsage: number;
  memoryUsage: MemoryUsage;
  diskUsage: DiskUsage;
}

export interface MonitoringOverview {
  systemInfo: SystemInfo;
  performance: Performance;
  onlineUsers: number;
  runningTasks: number;
  systemLoad: string;
}

export interface OnlineUser {
  id: string;
  username: string;
  email: string;
  role: string;
  lastActivity: Date;
  loginTime: Date;
  ipAddress: string;
  userAgent: string;
  onlineDuration: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OnlineUsersResponse {
  users: OnlineUser[];
  pagination: PaginationInfo;
}

export interface ScheduledTask {
  id: string | number;
  name: string;
  description?: string;
  cron_expression: string;
  is_active: boolean;
  last_run?: Date;
  next_run?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TaskExecutionLog {
  id: string;
  task_id: string | number;
  status: 'pending' | 'running' | 'success' | 'failed';
  start_time?: Date;
  end_time?: Date;
  duration?: number;
  error_message?: string;
  created_at: Date;
}

export interface DatabaseStats {
  table_name: string;
  row_count: number;
  table_size: string;
  index_size: string;
  total_size: string;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime?: number;
  details?: any;
}

export interface CacheInfo {
  connected: boolean;
  keyCount?: number;
  memory?: {
    used: number;
    peak: number;
  };
  stats?: any;
}
