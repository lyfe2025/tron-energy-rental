/**
 * 代理商价格配置中间件
 * 提供路由级别的中间件功能
 */
import type { NextFunction, Request, Response } from 'express';
import { query } from '../../../config/database.js';

/**
 * 验证代理商存在且活跃
 */
export const validateActiveAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agentId = req.params.agentId || req.body.agent_id;
    
    if (!agentId) {
      res.status(400).json({
        success: false,
        message: '缺少代理商ID'
      });
      return;
    }

    const agentResult = await query(
      'SELECT id, agent_name, status, level FROM agents WHERE id = $1',
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商不存在'
      });
      return;
    }

    const agent = agentResult.rows[0];
    if (agent.status !== 'active') {
      res.status(400).json({
        success: false,
        message: '代理商状态不活跃'
      });
      return;
    }

    // 将代理商信息添加到请求对象中
    req.agent = agent;
    next();

  } catch (error) {
    console.error('验证代理商中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 验证能量包存在且活跃
 */
export const validateActivePackage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const packageId = req.params.packageId || req.body.package_id;
    
    if (!packageId) {
      res.status(400).json({
        success: false,
        message: '缺少能量包ID'
      });
      return;
    }

    const packageResult = await query(
      'SELECT id, name, is_active FROM energy_packages WHERE id = $1',
      [packageId]
    );

    if (packageResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量包不存在'
      });
      return;
    }

    const energyPackage = packageResult.rows[0];
    
    // 将能量包信息添加到请求对象中
    req.energyPackage = energyPackage;
    next();

  } catch (error) {
    console.error('验证能量包中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 验证价格配置存在
 */
export const validateConfigExists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: '缺少配置ID'
      });
      return;
    }

    const configResult = await query(
      'SELECT * FROM price_configs WHERE id = $1 AND agent_id IS NOT NULL',
      [id]
    );

    if (configResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商价格配置不存在'
      });
      return;
    }

    // 将配置信息添加到请求对象中
    req.priceConfig = configResult.rows[0];
    next();

  } catch (error) {
    console.error('验证价格配置中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 验证批量操作权限
 */
export const validateBatchOperation = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { configs } = req.body;
    
    if (!Array.isArray(configs)) {
      res.status(400).json({
        success: false,
        message: '配置数据必须是数组'
      });
      return;
    }

    if (configs.length === 0) {
      res.status(400).json({
        success: false,
        message: '配置数据不能为空'
      });
      return;
    }

    if (configs.length > 100) {
      res.status(400).json({
        success: false,
        message: '批量操作最多支持100个配置'
      });
      return;
    }

    next();

  } catch (error) {
    console.error('验证批量操作中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 记录操作日志
 */
export const logOperation = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      console.log(`[代理商价格配置] ${operation}操作`, {
        userId,
        userRole,
        ip,
        userAgent,
        params: req.params,
        query: req.query,
        timestamp: new Date().toISOString()
      });

      next();

    } catch (error) {
      console.error('记录操作日志中间件错误:', error);
      next(); // 日志记录失败不应影响主要功能
    }
  };
};

/**
 * 验证价格数据格式
 */
export const validatePriceData = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { price, discount_percentage, min_price, max_price, quantity_discounts } = req.body;

    // 验证价格
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      res.status(400).json({
        success: false,
        message: '价格必须是非负数'
      });
      return;
    }

    // 验证折扣百分比
    if (discount_percentage !== undefined && 
        (typeof discount_percentage !== 'number' || 
         discount_percentage < 0 || 
         discount_percentage > 100)) {
      res.status(400).json({
        success: false,
        message: '折扣百分比必须在0-100之间'
      });
      return;
    }

    // 验证价格范围
    if (min_price !== undefined && (typeof min_price !== 'number' || min_price < 0)) {
      res.status(400).json({
        success: false,
        message: '最小价格必须是非负数'
      });
      return;
    }

    if (max_price !== undefined && (typeof max_price !== 'number' || max_price < 0)) {
      res.status(400).json({
        success: false,
        message: '最大价格必须是非负数'
      });
      return;
    }

    if (min_price !== undefined && max_price !== undefined && min_price > max_price) {
      res.status(400).json({
        success: false,
        message: '最小价格不能大于最大价格'
      });
      return;
    }

    // 验证数量折扣
    if (quantity_discounts !== undefined && !Array.isArray(quantity_discounts)) {
      res.status(400).json({
        success: false,
        message: '数量折扣必须是数组格式'
      });
      return;
    }

    next();

  } catch (error) {
    console.error('验证价格数据中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 限制请求频率
 */
export const rateLimit = (maxRequests = 60, windowMs = 60000) => {
  const requests = new Map();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // 清理过期记录
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter((time: number) => time > windowStart);
      requests.set(key, userRequests);
    }

    // 检查请求数量
    const userRequests = requests.get(key) || [];
    if (userRequests.length >= maxRequests) {
      res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试'
      });
      return;
    }

    // 记录本次请求
    userRequests.push(now);
    requests.set(key, userRequests);

    next();
  };
};

/**
 * 扩展Request接口以支持自定义属性
 */
declare global {
  namespace Express {
    interface Request {
      agent?: any;
      energyPackage?: any;
      priceConfig?: any;
    }
  }
}
