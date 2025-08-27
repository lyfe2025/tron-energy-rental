/**
 * 认证中间件
 * 验证JWT token并保护API端点
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';

// JWT载荷接口定义
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  loginType: string;
}

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * JWT认证中间件
 * 验证请求中的JWT token
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    res.status(401).json({
      success: false,
      message: '访问被拒绝，需要提供认证token'
    });
    return;
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({
      success: false,
      message: 'Token无效或已过期'
    });
    return;
  }
  
  // 将用户信息添加到请求对象中
  req.user = payload;
  next();
};

/**
 * 角色权限中间件
 * 检查用户是否具有指定角色
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '用户未认证'
      });
      return;
    }
    
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: '权限不足，需要以下角色之一: ' + allowedRoles.join(', ')
      });
      return;
    }
    
    next();
  };
};

/**
 * 管理员权限中间件
 * 只允许管理员访问
 */
export const requireAdmin = requireRole('admin');

/**
 * 代理权限中间件
 * 允许代理和管理员访问
 */
export const requireAgent = requireRole(['agent', 'admin']);

/**
 * 可选认证中间件
 * 如果提供了token则验证，但不强制要求
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  
  next();
};