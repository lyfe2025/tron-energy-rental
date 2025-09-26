/**
 * 系统日志记录器
 */
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ensureDirectory } from '../core/config';
import { structuredFormat } from '../core/formatters';
import { getLogDir } from '../core/project-root';
import { LOG_LEVELS } from '../core/types';

// 🖥️ 创建系统日志记录器
export function createSystemLogger(): winston.Logger {
  const logDir = getLogDir('system');
  
  ensureDirectory(logDir);
  
  return winston.createLogger({
    levels: LOG_LEVELS,
    format: structuredFormat,
    transports: [
      // 应用启动配置日志
      new DailyRotateFile({
        filename: path.join(logDir, 'app', 'app-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
      }),
      // 数据库相关日志
      new DailyRotateFile({
        filename: path.join(logDir, 'database', 'database-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '30m',
        maxFiles: '7d',
        level: 'debug',
      }),
      // 缓存相关日志
      new DailyRotateFile({
        filename: path.join(logDir, 'cache', 'cache-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '7d',
        level: 'info',
      }),
      // 定时任务日志
      new DailyRotateFile({
        filename: path.join(logDir, 'scheduler', 'scheduler-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '14d',
        level: 'info',
      }),
    ]
  });
}
