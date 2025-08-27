/**
 * 机器人价格配置中间件
 */
import type { NextFunction, Request, Response } from 'express';
import { query } from '../../../config/database.js';

/**
 * 验证机器人存在
 */
export const validateActiveBot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const botId = req.params.botId || req.body.bot_id;
    
    if (!botId) {
      res.status(400).json({
        success: false,
        message: '缺少机器人ID'
      });
      return;
    }

    const botResult = await query(
      'SELECT id, bot_name, status FROM bots WHERE id = $1',
      [botId]
    );

    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }

    req.bot = botResult.rows[0];
    next();

  } catch (error) {
    console.error('验证机器人中间件错误:', error);
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
      'SELECT * FROM price_configs WHERE id = $1 AND bot_id IS NOT NULL',
      [id]
    );

    if (configResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人价格配置不存在'
      });
      return;
    }

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
      
      console.log(`[机器人价格配置] ${operation}操作`, {
        userId,
        userRole,
        ip,
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

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      res.status(400).json({
        success: false,
        message: '价格必须是非负数'
      });
      return;
    }

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
 * 扩展Request接口以支持自定义属性
 */
declare global {
  namespace Express {
    interface Request {
      bot?: any;
      priceConfig?: any;
    }
  }
}
