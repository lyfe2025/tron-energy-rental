/**
 * 机器人专用日志记录器
 */
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ensureLogDirectory } from '../core/config';
import { consoleFormat, structuredFormat } from '../core/formatters';
import { LOG_LEVELS } from '../core/types';

// 创建机器人专用的文件日志记录器
export function createBotLogger(botId: string): winston.Logger {
  const logDir = ensureLogDirectory(botId);
  
  return winston.createLogger({
    levels: LOG_LEVELS,
    format: structuredFormat,
    transports: [
      // 运行日志 - 按日期轮转
      new DailyRotateFile({
        filename: path.join(logDir, 'runtime-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '7d', // 机器人日志保留7天
        level: 'info', // 只记录info及以上级别
        format: structuredFormat
      }),
      
      // 错误日志 - 单独文件
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '30d', // 错误日志保留更久
        level: 'error',
        format: structuredFormat
      }),
      
      // 开发环境下输出到控制台
      ...(process.env.NODE_ENV === 'development' ? [
        new winston.transports.Console({
          level: 'debug',
          format: consoleFormat
        })
      ] : [])
    ]
  });
}
