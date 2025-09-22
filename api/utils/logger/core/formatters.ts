/**
 * Logger 格式化器
 */
import winston from 'winston';

// 结构化日志格式化器
export const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, category, module, action, ...meta }) => {
    const logEntry: any = {
      timestamp,
      level,
      message,
      ...(category && { category }),
      ...(module && { module }),
      ...(action && { action }),
      ...(Object.keys(meta).length > 0 && { meta })
    };
    
    // 安全的JSON序列化，避免循环引用问题
    const seen = new WeakSet();
    try {
      return JSON.stringify(logEntry, (key, value) => {
        if (value instanceof Error) {
          // 对Error对象进行特殊处理
          return {
            name: value.name,
            message: value.message,
            stack: value.stack
          };
        }
        // 检测循环引用
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      });
    } catch (error) {
      // 如果仍然失败，返回基本信息
      return JSON.stringify({
        timestamp,
        level,
        message,
        meta: '[JSON Serialization Error]'
      });
    }
  })
);

// 控制台格式化器（开发环境）
export const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, category, module, action }) => {
    const categoryPrefix = category ? `[${category}]` : '';
    const modulePrefix = module ? `[${module}]` : '';
    const actionPrefix = action ? `[${action}]` : '';
    return `${timestamp} ${level}: ${categoryPrefix}${modulePrefix}${actionPrefix} ${message}`;
  })
);

// 订单日志专用格式化器
export const orderFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, orderId, orderNumber, txId, amount, status, networkName, ...meta }) => {
    const logEntry: any = {
      timestamp,
      level,
      message,
      ...(orderId && { orderId }),
      ...(orderNumber && { orderNumber }),
      ...(txId && { txId }),
      ...(amount && { amount }),
      ...(status && { status }),
      ...(networkName && { networkName }),
      ...(Object.keys(meta).length > 0 && { meta })
    };
    
    // 安全的JSON序列化
    const seen = new WeakSet();
    try {
      return JSON.stringify(logEntry, (key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack
          };
        }
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      });
    } catch (error) {
      return JSON.stringify({
        timestamp,
        level,
        message,
        meta: '[JSON Serialization Error]'
      });
    }
  })
);
