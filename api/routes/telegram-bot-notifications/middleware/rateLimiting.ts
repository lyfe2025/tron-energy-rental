/**
 * Telegram机器人通知频率限制中间件
 * 提供API调用频率限制功能
 */

import { type NextFunction, type Request, type Response } from 'express';

// 存储API调用记录的内存缓存
interface RateLimitRecord {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * 清理过期的频率限制记录
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000; // 1小时

  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.windowStart > oneHour) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * 手动通知频率限制中间件
 * 限制每个用户每小时最多发送5次手动通知
 */
export function rateLimitManualNotifications(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({
      success: false,
      message: '用户未认证'
    });
    return;
  }

  const key = `manual_notification:${userId}`;
  const now = Date.now();
  const windowSize = 60 * 60 * 1000; // 1小时窗口
  const maxRequests = 5; // 每小时最多5次

  let record = rateLimitStore.get(key);

  // 如果没有记录或者窗口已过期，创建新记录
  if (!record || now - record.windowStart > windowSize) {
    record = {
      count: 1,
      windowStart: now
    };
    rateLimitStore.set(key, record);
    next();
    return;
  }

  // 检查是否超过限制
  if (record.count >= maxRequests) {
    const timeUntilReset = windowSize - (now - record.windowStart);
    const minutesUntilReset = Math.ceil(timeUntilReset / (60 * 1000));

    res.status(429).json({
      success: false,
      message: `发送频率过高，请等待 ${minutesUntilReset} 分钟后重试`,
      retry_after: minutesUntilReset
    });
    return;
  }

  // 增加计数
  record.count++;
  rateLimitStore.set(key, record);

  next();
}

/**
 * 模板操作频率限制中间件
 * 限制每个用户每分钟最多进行10次模板操作
 */
export function rateLimitTemplateOperations(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({
      success: false,
      message: '用户未认证'
    });
    return;
  }

  const key = `template_operation:${userId}`;
  const now = Date.now();
  const windowSize = 60 * 1000; // 1分钟窗口
  const maxRequests = 10; // 每分钟最多10次

  let record = rateLimitStore.get(key);

  // 如果没有记录或者窗口已过期，创建新记录
  if (!record || now - record.windowStart > windowSize) {
    record = {
      count: 1,
      windowStart: now
    };
    rateLimitStore.set(key, record);
    next();
    return;
  }

  // 检查是否超过限制
  if (record.count >= maxRequests) {
    const timeUntilReset = windowSize - (now - record.windowStart);
    const secondsUntilReset = Math.ceil(timeUntilReset / 1000);

    res.status(429).json({
      success: false,
      message: `操作频率过高，请等待 ${secondsUntilReset} 秒后重试`,
      retry_after: secondsUntilReset
    });
    return;
  }

  // 增加计数
  record.count++;
  rateLimitStore.set(key, record);

  next();
}

/**
 * 通用API频率限制中间件
 * 限制每个IP每分钟最多进行30次API调用
 */
export function rateLimitApiCalls(req: Request, res: Response, next: NextFunction): void {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `api_call:${clientIp}`;
  const now = Date.now();
  const windowSize = 60 * 1000; // 1分钟窗口
  const maxRequests = 30; // 每分钟最多30次

  let record = rateLimitStore.get(key);

  // 如果没有记录或者窗口已过期，创建新记录
  if (!record || now - record.windowStart > windowSize) {
    record = {
      count: 1,
      windowStart: now
    };
    rateLimitStore.set(key, record);
    next();
    return;
  }

  // 检查是否超过限制
  if (record.count >= maxRequests) {
    const timeUntilReset = windowSize - (now - record.windowStart);
    const secondsUntilReset = Math.ceil(timeUntilReset / 1000);

    res.status(429).json({
      success: false,
      message: `API调用频率过高，请等待 ${secondsUntilReset} 秒后重试`,
      retry_after: secondsUntilReset
    });
    return;
  }

  // 增加计数
  record.count++;
  rateLimitStore.set(key, record);

  next();
}

// 定期清理过期记录
setInterval(cleanupExpiredRecords, 5 * 60 * 1000); // 每5分钟清理一次
