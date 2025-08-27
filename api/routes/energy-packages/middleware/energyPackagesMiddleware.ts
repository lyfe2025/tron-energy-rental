/**
 * 能量包中间件
 * 
 * 提供能量包相关的中间件功能
 * 包括请求验证、权限检查、日志记录和响应缓存等
 */

import type { NextFunction, Request, Response } from 'express';
import { EnergyPackagesValidation } from '../controllers/energyPackagesValidation.js';

/**
 * 验证能量包ID参数
 */
export const validatePackageId = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  const validation = EnergyPackagesValidation.validateId(id);
  
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      message: validation.errors.join(', ')
    });
    return;
  }

  next();
};

/**
 * 验证分页参数
 */
export const validatePaginationParams = (req: Request, res: Response, next: NextFunction): void => {
  const { page, limit } = req.query;
  const validation = EnergyPackagesValidation.validatePaginationParams(page, limit);
  
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      message: validation.errors.join(', ')
    });
    return;
  }

  next();
};

/**
 * 验证搜索参数
 */
export const validateSearchParams = (req: Request, res: Response, next: NextFunction): void => {
  const { search, min_energy, max_energy, min_price, max_price } = req.query;
  
  // 验证搜索关键词
  if (search) {
    const searchValidation = EnergyPackagesValidation.validateSearchParams(search as string);
    if (!searchValidation.valid) {
      res.status(400).json({
        success: false,
        message: searchValidation.errors.join(', ')
      });
      return;
    }
  }

  // 验证能量范围
  const energyValidation = EnergyPackagesValidation.validateEnergyRange(min_energy, max_energy);
  if (!energyValidation.valid) {
    res.status(400).json({
      success: false,
      message: energyValidation.errors.join(', ')
    });
    return;
  }

  // 验证价格范围
  const priceValidation = EnergyPackagesValidation.validatePriceRange(min_price, max_price);
  if (!priceValidation.valid) {
    res.status(400).json({
      success: false,
      message: priceValidation.errors.join(', ')
    });
    return;
  }

  next();
};

/**
 * 验证创建能量包请求体
 */
export const validateCreateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const validation = EnergyPackagesValidation.validateCreateRequest(req.body);
  
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      message: validation.errors.join(', ')
    });
    return;
  }

  next();
};

/**
 * 验证更新能量包请求体
 */
export const validateUpdateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const validation = EnergyPackagesValidation.validateUpdateRequest(req.body);
  
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      message: validation.errors.join(', ')
    });
    return;
  }

  next();
};

/**
 * 验证状态更新请求体
 */
export const validateStatusRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { is_active } = req.body;
  const validation = EnergyPackagesValidation.validateStatus(is_active);
  
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      message: validation.errors.join(', ')
    });
    return;
  }

  next();
};

/**
 * 验证批量价格更新请求体
 */
export const validateBatchPriceRequest = (req: Request, res: Response, next: NextFunction): void => {
  const validation = EnergyPackagesValidation.validateBatchPriceUpdateRequest(req.body);
  
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      message: validation.errors.join(', ')
    });
    return;
  }

  next();
};

/**
 * 记录能量包操作日志
 */
export const logPackageOperation = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    console.log(`[能量包] ${operation} 操作开始:`, {
      packageId: id,
      userId,
      userRole,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 拦截响应以记录结果
    const originalSend = res.send;
    res.send = function(body: any) {
      const duration = Date.now() - startTime;
      const responseData = typeof body === 'string' ? JSON.parse(body) : body;
      
      console.log(`[能量包] ${operation} 操作完成:`, {
        packageId: id,
        userId,
        success: responseData.success,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });

      return originalSend.call(this, body);
    };

    next();
  };
};

/**
 * 设置缓存头
 */
export const setCacheHeaders = (maxAge: number = 300) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 列表页面可以缓存
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
    } else {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    next();
  };
};

/**
 * 管理员权限验证中间件
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
    return;
  }

  next();
};

/**
 * 速率限制中间件
 */
export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    
    const userRequests = requests.get(identifier);
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }

    if (userRequests.count >= maxRequests) {
      res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试'
      });
      return;
    }

    userRequests.count++;
    next();
  };
};
