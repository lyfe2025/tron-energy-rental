/**
 * API相关日志记录器
 */
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ensureDirectory } from '../core/config';
import { structuredFormat } from '../core/formatters';
import { getLogDir } from '../core/project-root';
import { LOG_LEVELS } from '../core/types';

// 🌐 创建API相关日志记录器
export function createApiLogger(): winston.Logger {
  const logDir = getLogDir('api');
  
  ensureDirectory(logDir);
  
  return winston.createLogger({
    levels: LOG_LEVELS,
    format: structuredFormat,
    transports: [
      // API访问日志
      new DailyRotateFile({
        filename: path.join(logDir, 'access', 'api-access-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '14d',
        level: 'info',
      }),
      // API错误日志
      new DailyRotateFile({
        filename: path.join(logDir, 'errors', 'api-errors-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
      }),
      // 认证相关日志
      new DailyRotateFile({
        filename: path.join(logDir, 'auth', 'api-auth-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '30d',
        level: 'warn',
      }),
    ]
  });
}
