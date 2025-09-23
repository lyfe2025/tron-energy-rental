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
            winston.format.printf(({ timestamp, level, message, orderId, orderNumber, txId, errorReason, validationFailure, txInfoAnalysis, validationDetails, ...meta }) => {
              const orderInfo = orderId ? `[${orderNumber || orderId}]` : 
                               (txId && typeof txId === 'string') ? `[${txId.substring(0, 8)}...]` : '';
              
              let logMessage = `${timestamp} ${level}: 📦 ${orderInfo} ${message}`;
              
              // 如果有错误原因，显示详细信息
              if (errorReason) {
                logMessage += `\n  🔍 错误原因: ${errorReason}`;
              }
              
              // 如果有验证失败信息，显示详细信息
              if (validationFailure && typeof validationFailure === 'object') {
                const failure = validationFailure as any;
                logMessage += `\n  ❌ 验证失败: ${failure.reason || 'Unknown'}`;
              }
              
              // 如果有交易信息分析，显示关键信息
              if (txInfoAnalysis && typeof txInfoAnalysis === 'object') {
                const analysis = txInfoAnalysis as any;
                logMessage += `\n  📊 交易分析: txInfo存在=${analysis.txInfoExists}, 类型=${analysis.txInfoType}`;
                if (analysis.txInfoKeys && Array.isArray(analysis.txInfoKeys) && analysis.txInfoKeys.length > 0) {
                  logMessage += `, 字段=[${analysis.txInfoKeys.slice(0, 5).join(', ')}${analysis.txInfoKeys.length > 5 ? '...' : ''}]`;
                }
              }
              
              // 如果有验证详细信息，显示关键信息
              if (validationDetails && typeof validationDetails === 'object') {
                const details = validationDetails as any;
                logMessage += `\n  🔧 验证详情: 网络=${details.networkName}, TronWeb可用=${details.tronWebInstanceAvailable}`;
                if (details.validationMethod) {
                  logMessage += `, 验证方法=${details.validationMethod}`;
                }
              }
              
              // 显示其他重要的元数据
              const importantKeys = ['processStep', 'step', 'networkName', 'orderNumber'];
              const importantMeta = Object.entries(meta).filter(([key]) => importantKeys.includes(key));
              if (importantMeta.length > 0) {
                const metaStr = importantMeta.map(([key, value]) => `${key}=${value}`).join(', ');
                logMessage += `\n  ℹ️  其他信息: ${metaStr}`;
              }
              
              return logMessage;
            })
          )
        })
      ] : [])
    ]
  });
}
