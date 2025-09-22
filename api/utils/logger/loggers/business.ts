/**
 * 业务日志记录器
 */
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ensureDirectory } from '../core/config';
import { structuredFormat } from '../core/formatters';
import { LOG_LEVELS } from '../core/types';

// 💼 创建业务日志记录器
export function createBusinessLogger(): winston.Logger {
  const logDir = path.join(process.cwd(), 'logs', 'business');
  
  ensureDirectory(logDir);
  
  return winston.createLogger({
    levels: LOG_LEVELS,
    format: structuredFormat,
    transports: [
      // 支付相关日志
      new DailyRotateFile({
        filename: path.join(logDir, 'payments', 'payments-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '30m',
        maxFiles: '60d',
        level: 'info',
      }),
      // 交易监控日志
      new DailyRotateFile({
        filename: path.join(logDir, 'transactions', 'transactions-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '30d',
        level: 'info',
      }),
      // 能量池相关日志
      new DailyRotateFile({
        filename: path.join(logDir, 'energy', 'energy-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
      }),
    ]
  });
}
