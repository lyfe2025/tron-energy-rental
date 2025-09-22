/**
 * Logger 核心类型定义
 */

// 日志级别定义
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// 日志级别类型
export type LogLevel = keyof typeof LOG_LEVELS;

// 日志分类定义
export const LOG_CATEGORIES = {
  SYSTEM: 'SYSTEM',      // 系统启动、关闭、配置变更
  API: 'API',            // API请求响应
  BOT: 'BOT',            // 机器人相关操作
  TRON: 'TRON',          // TRON网络交互
  DATABASE: 'DATABASE',   // 数据库操作
  CACHE: 'CACHE',        // 缓存操作
  SCHEDULER: 'SCHEDULER', // 定时任务
  SECURITY: 'SECURITY',   // 安全相关
  BUSINESS: 'BUSINESS',   // 业务逻辑
  ORDER: 'ORDER'         // 订单处理
} as const;

export type LogCategory = keyof typeof LOG_CATEGORIES;

// 业务事件类型（需要存储到数据库）
export const BUSINESS_EVENTS = [
  'bot_started',
  'bot_stopped', 
  'bot_error',
  'config_changed',
  'webhook_registered',
  'webhook_failed',
  'critical_error'
] as const;

export type BusinessEventType = typeof BUSINESS_EVENTS[number];

// 扩展的日志元数据接口
export interface LogMetadata {
  category?: LogCategory;
  module?: string;
  action?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: {
    code?: string;
    stack?: string;
  };
  context?: Record<string, any>;
}

// 判断是否为业务事件
export function isBusinessEvent(eventType: string): eventType is BusinessEventType {
  return BUSINESS_EVENTS.includes(eventType as BusinessEventType);
}
