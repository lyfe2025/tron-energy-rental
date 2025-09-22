/**
 * 性能监控日志工具
 */
import type { LogLevel, LogMetadata } from '../core/types';
import { LOG_CATEGORIES } from '../core/types';

// 性能监控日志 - 需要在index.ts中绑定appLogger
export function createLogPerformance(appLogger: any) {
  return function logPerformance(
    operation: string, 
    startTime: number, 
    meta?: LogMetadata
  ): void {
    const duration = Date.now() - startTime;
    const level: LogLevel = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
    
    appLogger[level](`Performance: ${operation} completed in ${duration}ms`, {
      category: LOG_CATEGORIES.SYSTEM,
      action: 'performance',
      duration,
      ...meta
    });
  };
}

// 防重复日志（避免同样的错误频繁记录） - 需要在index.ts中绑定appLogger
const logCache = new Map<string, number>();

export function createLogOnce(appLogger: any) {
  return function logOnce(
    key: string, 
    level: LogLevel, 
    message: string, 
    meta?: LogMetadata
  ): void {
    const now = Date.now();
    const lastLogged = logCache.get(key);
    
    // 如果同样的日志在5分钟内已经记录过，则跳过
    if (lastLogged && now - lastLogged < 5 * 60 * 1000) {
      return;
    }
    
    logCache.set(key, now);
    appLogger[level](message, meta);
  };
}
