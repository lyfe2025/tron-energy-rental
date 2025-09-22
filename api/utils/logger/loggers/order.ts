/**
 * 订单处理专用的日志记录器
 */
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ensureDirectory } from '../core/config';
import { orderFormat } from '../core/formatters';
import { LOG_LEVELS } from '../core/types';

// 📦 创建订单处理专用的日志记录器
export function createOrderLogger(): winston.Logger {
  const logDir = path.join(process.cwd(), 'logs', 'business', 'orders');
  
  // 确保日志目录存在
  ensureDirectory(logDir);
  
  return winston.createLogger({
    levels: LOG_LEVELS,
    format: orderFormat,
    transports: [
      // 订单处理日志 - 按日期轮转
      new DailyRotateFile({
        filename: path.join(logDir, 'order-processing-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d', // 订单日志保留30天
        level: 'info',
      }),
      // 订单错误日志 - 单独存储
      new DailyRotateFile({
        filename: path.join(logDir, 'order-errors-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '60d', // 错误日志保留60天
        level: 'error',
      }),
      // 控制台输出（开发环境）
      ...(process.env.NODE_ENV === 'development' ? [
        new winston.transports.Console({
          level: 'info',
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, orderId, orderNumber, txId }) => {
              const orderInfo = orderId ? `[${orderNumber || orderId}]` : 
                               (txId && typeof txId === 'string') ? `[${txId.substring(0, 8)}...]` : '';
              return `${timestamp} ${level}: 📦 ${orderInfo} ${message}`;
            })
          )
        })
      ] : [])
    ]
  });
}
