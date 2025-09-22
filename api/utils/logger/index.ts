/**
 * Logger 模块主入口文件
 * 保持与原logger.ts相同的导出，确保向后兼容性
 */

// ========== 核心类型和配置 ==========
export * from './core/config';
export * from './core/formatters';
export * from './core/types';

// ========== Logger 创建函数 ==========
export { createApiLogger } from './loggers/api';
export { createBotLogger } from './loggers/bot';
export { createBusinessLogger } from './loggers/business';
export { createOrderLogger } from './loggers/order';
export { createSecurityLogger } from './loggers/security';
export { createSystemLogger } from './loggers/system';

// ========== 工具函数 ==========
export { cleanupOldLogs } from './utils/cleanup';
export { createStructuredLogger, getBotLogFiles, readLogFile } from './utils/helpers';
export { createLogOnce, createLogPerformance } from './utils/performance';

// ========== 管理器 ==========
export { LogRotationManager } from './managers/rotation';

// ========== 全局日志记录器实例 ==========
export const orderLogger = createOrderLogger();
export const apiLogger = createApiLogger();
export const systemLogger = createSystemLogger();
export const businessLogger = createBusinessLogger();
export const securityLogger = createSecurityLogger();

// 全局应用日志记录器 - 重定向到系统日志
export const appLogger = systemLogger;

// 向后兼容性导出
export const logger = appLogger;

// 创建绑定了appLogger的结构化日志记录器
import { createStructuredLogger } from './utils/helpers';
import { createLogOnce, createLogPerformance } from './utils/performance';

export const structuredLogger = createStructuredLogger(appLogger);
export const logPerformance = createLogPerformance(appLogger);
export const logOnce = createLogOnce(appLogger);

// ========== 便捷的日志记录函数 ==========
import type { LogLevel, LogMetadata } from './core/types';

export function logApi(level: LogLevel, message: string, meta?: LogMetadata): void {
  apiLogger[level](message, { category: 'API', ...meta });
}

export function logSystem(level: LogLevel, message: string, meta?: LogMetadata): void {
  systemLogger[level](message, { category: 'SYSTEM', ...meta });
}

export function logBusiness(level: LogLevel, message: string, meta?: LogMetadata): void {
  businessLogger[level](message, { category: 'BUSINESS', ...meta });
}

export function logSecurity(level: LogLevel, message: string, meta?: LogMetadata): void {
  securityLogger[level](message, { category: 'SECURITY', ...meta });
}

export function logOrder(level: LogLevel, message: string, meta?: any): void {
  orderLogger[level](message, { category: 'ORDER', ...meta });
}

// ========== 需要从其他地方导入的函数 ==========
// 重新导入便捷函数，避免循环引用
import { createApiLogger } from './loggers/api';
import { createBusinessLogger } from './loggers/business';
import { createOrderLogger } from './loggers/order';
import { createSecurityLogger } from './loggers/security';
import { createSystemLogger } from './loggers/system';

