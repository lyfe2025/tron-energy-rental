/**
 * API请求日志中间件
 * 统一记录API请求响应日志，减少日志噪音
 */
import { NextFunction, Request, Response } from 'express';
import { logPerformance, structuredLogger } from '../utils/logger.js';

// 需要跳过日志记录的路径
const SKIP_PATHS = [
  '/api/health',
  '/favicon.ico',
  '/api/monitoring/ping'
];

// 敏感信息字段，需要脱敏
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'authorization'];

// 脱敏函数
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      (sanitized as any)[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as any)[key] = sanitizeObject(value);
    } else {
      (sanitized as any)[key] = value;
    }
  }
  
  return sanitized;
}

// 获取客户端IP
function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         'unknown';
}

// 判断是否应该记录请求体
function shouldLogBody(method: string, contentType?: string): boolean {
  if (method === 'GET' || method === 'HEAD') {
    return false;
  }
  
  if (!contentType) {
    return false;
  }
  
  // 只记录JSON和表单数据
  return contentType.includes('application/json') || 
         contentType.includes('application/x-www-form-urlencoded');
}

// 判断是否为成功状态码
function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 400;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, originalUrl, headers, body, query, params } = req;
  
  // 跳过指定路径
  if (SKIP_PATHS.some(path => originalUrl.startsWith(path))) {
    return next();
  }
  
  const clientIP = getClientIP(req);
  const userAgent = headers['user-agent'] || 'unknown';
  const requestId = headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 记录请求开始（仅在debug模式下）
  if (process.env.LOG_LEVEL === 'debug') {
    structuredLogger.api.request(method, originalUrl, {
      requestId,
      module: 'api',
      context: {
        clientIP,
        userAgent,
        query: Object.keys(query).length > 0 ? sanitizeObject(query) : undefined,
        params: Object.keys(params).length > 0 ? sanitizeObject(params) : undefined,
        body: shouldLogBody(method, headers['content-type']) ? sanitizeObject(body) : undefined
      }
    });
  }
  
  // 监听响应结束
  const originalSend = res.send;
  let responseBody: any;
  
  res.send = function(data: any) {
    responseBody = data;
    return originalSend.call(this, data);
  };
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    // 根据状态码和响应时间确定日志级别
    let logLevel: 'info' | 'warn' | 'error' = 'info';
    
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400 || duration > 3000) {
      logLevel = 'warn';
    }
    
    // 记录响应
    const logMessage = `${method} ${originalUrl} - ${statusCode}`;
    const logMeta = {
      requestId,
      module: 'api',
      duration,
      context: {
        clientIP,
        userAgent,
        responseSize: res.get('content-length') || 'unknown'
      }
    };
    
    if (logLevel === 'error') {
      structuredLogger.api.error(method, originalUrl, new Error(`HTTP ${statusCode}`), logMeta);
    } else {
      structuredLogger.api.response(method, originalUrl, statusCode, duration, logMeta);
    }
    
    // 性能监控（超过1秒的请求）
    if (duration > 1000) {
      logPerformance(`API ${method} ${originalUrl}`, startTime, {
        requestId,
        context: { statusCode }
      });
    }
  });
  
  next();
}

// API错误日志中间件
export function apiErrorLogger(error: Error, req: Request, res: Response, next: NextFunction): void {
  const { method, originalUrl } = req;
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  structuredLogger.api.error(method, originalUrl, error, {
    requestId,
    module: 'api',
    context: {
      clientIP: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown'
    }
  });
  
  next(error);
}

// 数据库查询日志装饰器
export function logDatabaseQuery(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const startTime = Date.now();
    
    try {
      const result = await method.apply(this, args);
      
      // 只在debug模式下记录成功的查询
      if (process.env.LOG_LEVEL === 'debug') {
        const duration = Date.now() - startTime;
        structuredLogger.database.query(
          `${target.constructor.name}.${propertyName}`,
          duration,
          { module: 'database' }
        );
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      structuredLogger.database.error(
        `${target.constructor.name}.${propertyName}`,
        error as Error,
        { module: 'database', duration }
      );
      throw error;
    }
  };
}
