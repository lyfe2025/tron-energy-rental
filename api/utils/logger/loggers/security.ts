/**
 * 安全日志记录器
 */
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ensureDirectory } from '../core/config';
import { structuredFormat } from '../core/formatters';
import { getLogDir } from '../core/project-root';
import { LOG_LEVELS } from '../core/types';

// 🔒 创建安全日志记录器
export function createSecurityLogger(): winston.Logger {
  const logDir = getLogDir('security');
  
  ensureDirectory(logDir);
  
  return winston.createLogger({
    levels: LOG_LEVELS,
    format: structuredFormat,
    transports: [
      // 认证失败日志
      new DailyRotateFile({
        filename: path.join(logDir, 'auth', 'auth-failures-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '90d', // 安全日志保留更久
        level: 'warn',
      }),
      // 审计日志
      new DailyRotateFile({
        filename: path.join(logDir, 'audit', 'audit-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '365d', // 审计日志保留1年
        level: 'info',
      }),
    ]
  });
}
