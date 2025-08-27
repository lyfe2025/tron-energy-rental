/**
 * 统计分析中间件
 */
import type { NextFunction, Request, Response } from 'express';

/**
 * 验证管理员权限
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('验证管理员权限错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 验证统计参数
 */
export const validateStatsParams = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { period, group_by } = req.query;

    // 验证时间周期
    if (period && !['7', '30', '90', '365'].includes(period as string)) {
      res.status(400).json({
        success: false,
        message: '无效的时间周期，支持：7, 30, 90, 365'
      });
      return;
    }

    // 验证分组方式
    if (group_by && !['day', 'week', 'month'].includes(group_by as string)) {
      res.status(400).json({
        success: false,
        message: '无效的分组方式，支持：day, week, month'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('验证统计参数错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 记录访问日志
 */
export const logAccess = (endpoint: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const ip = req.ip || req.connection.remoteAddress;
      
      console.log(`[统计访问] ${endpoint}`, {
        userId,
        userRole,
        ip,
        query: req.query,
        timestamp: new Date().toISOString()
      });

      next();
    } catch (error) {
      console.error('记录访问日志错误:', error);
      next(); // 日志记录失败不应影响主要功能
    }
  };
};

/**
 * 缓存控制
 */
export const setCacheHeaders = (maxAge = 300) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 设置缓存头，统计数据可以缓存5分钟
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
};
