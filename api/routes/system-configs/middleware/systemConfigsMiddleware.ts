/**
 * 系统配置中间件
 * 
 * 提供系统配置相关的中间件功能
 * 包括请求验证、权限检查、日志记录和响应缓存等
 */

import type { NextFunction, Request, Response } from 'express';
import { SystemConfigsValidation } from '../controllers/systemConfigsValidation.js';

/**
 * 验证配置键参数
 */
export const validateConfigKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.params;

    if (!key) {
      res.status(400).json({
        success: false,
        message: '配置键参数缺失'
      });
      return;
    }

    const validation = SystemConfigsValidation.validateConfigKey(key);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.error
      });
      return;
    }

    next();
  } catch (error) {
    console.error('验证配置键失败:', error);
    res.status(500).json({
      success: false,
      message: '验证配置键失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 验证配置是否存在
 */
export const validateConfigExists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.params;

    const exists = await SystemConfigsValidation.checkConfigExists(key);
    if (!exists) {
      res.status(404).json({
        success: false,
        message: '配置不存在'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('检查配置是否存在失败:', error);
    res.status(500).json({
      success: false,
      message: '检查配置状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 验证配置是否可编辑
 */
export const validateConfigEditable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.params;

    const editableCheck = await SystemConfigsValidation.checkConfigEditable(key);
    if (!editableCheck.exists) {
      res.status(404).json({
        success: false,
        message: '配置不存在'
      });
      return;
    }

    if (!editableCheck.editable) {
      res.status(403).json({
        success: false,
        message: '该配置不允许编辑'
      });
      return;
    }

    // 将配置信息传递给下一个中间件
    req.configInfo = editableCheck.config;
    next();
  } catch (error) {
    console.error('检查配置是否可编辑失败:', error);
    res.status(500).json({
      success: false,
      message: '检查配置权限失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 验证配置访问权限
 */
export const validateConfigAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.params;
    const userRole = req.user?.role;

    const accessCheck = await SystemConfigsValidation.checkConfigAccess(key, userRole);
    if (!accessCheck.canAccess) {
      res.status(404).json({
        success: false,
        message: '配置不存在或无权访问'
      });
      return;
    }

    // 将配置信息传递给下一个中间件
    req.configInfo = accessCheck.config;
    next();
  } catch (error) {
    console.error('检查配置访问权限失败:', error);
    res.status(500).json({
      success: false,
      message: '检查访问权限失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 验证分页参数
 */
export const validatePaginationParams = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { page, limit } = req.query;

    const validation = SystemConfigsValidation.validatePaginationParams(page, limit);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
      return;
    }

    next();
  } catch (error) {
    console.error('验证分页参数失败:', error);
    res.status(500).json({
      success: false,
      message: '验证分页参数失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 验证搜索参数
 */
export const validateSearchParams = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { search, category } = req.query;

    // 验证搜索关键词
    if (search) {
      const searchValidation = SystemConfigsValidation.validateSearchQuery(search as string);
      if (!searchValidation.valid) {
        res.status(400).json({
          success: false,
          message: searchValidation.error
        });
        return;
      }
    }

    // 验证分类参数
    if (category) {
      const categoryValidation = SystemConfigsValidation.validateCategory(category as string);
      if (!categoryValidation.valid) {
        res.status(400).json({
          success: false,
          message: categoryValidation.error
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('验证搜索参数失败:', error);
    res.status(500).json({
      success: false,
      message: '验证搜索参数失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 验证创建配置请求体
 */
export const validateCreateRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validation = SystemConfigsValidation.validateCreateRequest(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
      return;
    }

    next();
  } catch (error) {
    console.error('验证创建请求失败:', error);
    res.status(500).json({
      success: false,
      message: '验证请求数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 验证更新配置请求体
 */
export const validateUpdateRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validation = SystemConfigsValidation.validateUpdateRequest(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
      return;
    }

    next();
  } catch (error) {
    console.error('验证更新请求失败:', error);
    res.status(500).json({
      success: false,
      message: '验证请求数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 验证批量更新请求体
 */
export const validateBatchUpdateRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validation = SystemConfigsValidation.validateBatchUpdateRequest(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
      return;
    }

    next();
  } catch (error) {
    console.error('验证批量更新请求失败:', error);
    res.status(500).json({
      success: false,
      message: '验证请求数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 记录配置操作日志
 */
export const logConfigOperation = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const { key } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // 记录请求开始
    console.log(`[系统配置] ${operation} 操作开始:`, {
      configKey: key,
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
      
      console.log(`[系统配置] ${operation} 操作完成:`, {
        configKey: key,
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
    // 管理员请求不缓存，因为他们可能看到更多数据
    if (req.user?.role === 'admin') {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      // 公共配置可以缓存
      res.set('Cache-Control', `public, max-age=${maxAge}`);
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
 * 速率限制中间件（基础实现）
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

/**
 * 扩展 Express Request 接口以包含配置信息
 */
declare global {
  namespace Express {
    interface Request {
      configInfo?: any;
    }
  }
}
