/**
 * RBAC权限控制中间件
 * 基于角色的访问控制
 */

import { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { MenuService } from '../services/system/menu.js';
import { query } from '../config/database.js';
import { verifyToken } from '../utils/jwt.js';

// Request接口扩展已在auth.ts中定义

/**
 * JWT认证中间件
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '访问令牌缺失'
      });
    }

    // 使用统一的token验证函数
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: '无效的访问令牌'
      });
    }
    
    // 查询用户信息
    const userResult = await query(
      'SELECT id, username, email, role, status FROM admins WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '用户不存在'
      });
    }

    const user = userResult.rows[0];
    
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: '用户已被禁用'
      });
    }

    // 获取用户权限
    const permissions = await MenuService.getUserPermissionCodes(user.id);
    
    // 更新会话的最后活动时间
    try {
      await query(
        'UPDATE admin_sessions SET last_activity = NOW() WHERE session_token = $1 AND is_active = true',
        [token]
      );
    } catch (sessionError) {
      console.error('更新会话活动时间失败:', sessionError);
      // 不阻塞请求，继续执行
    }
    
    req.user = {
      id: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      loginType: 'admin',
      permissions
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: '无效的访问令牌'
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: '访问令牌已过期'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: '认证失败'
    });
  }
};

/**
 * 权限检查中间件工厂函数
 * @param requiredPermission 需要的权限代码
 */
export const requirePermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        });
      }

      // 超级管理员拥有所有权限
      if (req.user.role === 'super_admin') {
        return next();
      }

      // 检查用户是否有所需权限
      if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          error: '权限不足'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: '权限检查失败'
      });
    }
  };
};

/**
 * 角色检查中间件工厂函数
 * @param allowedRoles 允许的角色列表
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: '角色权限不足'
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        error: '角色检查失败'
      });
    }
  };
};

/**
 * 超级管理员权限检查
 */
export const requireSuperAdmin = requireRole(['super_admin']);

/**
 * 管理员权限检查（包括超级管理员和普通管理员）
 */
export const requireAdmin = requireRole(['super_admin', 'admin']);

/**
 * 操作日志记录中间件
 */
export const logOperation = (operation: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 记录操作前的信息
      const startTime = Date.now();
      const originalSend = res.send;
      
      res.send = function(data) {
        // 记录操作日志
        if (req.user) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // 异步记录日志，不阻塞响应
          setImmediate(async () => {
            try {
              await query(
                `INSERT INTO operation_logs (admin_id, username, module, operation, method, url, 
                 ip_address, user_agent, request_params, response_data, status, execution_time, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                  req.user!.id,
                  req.user!.username,
                  operation.split(':')[0] || 'system', // 从operation中提取模块名
                  operation,
                  req.method,
                  req.originalUrl || req.path,
                  req.ip || req.connection.remoteAddress,
                  req.get('User-Agent') || '',
                  JSON.stringify({
                    body: req.body,
                    query: req.query,
                    params: req.params
                  }),
                  typeof data === 'string' ? data.substring(0, 1000) : JSON.stringify(data).substring(0, 1000), // 限制响应数据长度
                  res.statusCode,
                  duration,
                  new Date()
                ]
              );
            } catch (error) {
              console.error('Failed to log operation:', error);
            }
          });
        }
        
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Operation logging error:', error);
      next(); // 继续执行，不因为日志记录失败而中断请求
    }
  };
};