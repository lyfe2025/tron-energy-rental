/**
 * 认证中间件
 * 验证JWT token并保护API端点
 */
import { type NextFunction, type Request, type Response } from 'express';
import { extractTokenFromHeader, verifyToken } from '../utils/jwt.js';

// JWT载荷接口定义
interface JWTPayload {
  id: string;
  userId: number;
  username: string;
  email: string;
  role: string;
  loginType: string;
  telegram_id?: number;
  permissions?: string[];
  department_id?: number;
  position_id?: number;
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
 * 验证请求中的JWT token并获取用户权限信息
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    res.status(401).json({
      success: false,
      message: '访问被拒绝，需要提供认证token'
    });
    return;
  }
  
  console.log('🔍 [Auth] 开始验证token，长度:', token.length);
  const payload = verifyToken(token);
  if (!payload) {
    console.error('❌ [Auth] Token验证失败');
    res.status(403).json({
      success: false,
      error: '无效的访问令牌'
    });
    return;
  }
  console.log('✅ [Auth] Token验证成功，用户ID:', payload.id);
  
  try {
    // 获取用户完整信息和权限
    const userInfo = await getUserWithPermissions(payload.id);
    if (!userInfo) {
      res.status(403).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
      return;
    }
    
    // 检查会话状态 - 验证用户是否被强制下线
    const sessionValid = await checkSessionStatus(payload.id);
    if (!sessionValid) {
      res.status(403).json({
        success: false,
        message: '会话已失效，请重新登录'
      });
      return;
    }
    
    // 将用户信息和权限添加到请求对象中
    req.user = {
      ...payload,
      username: userInfo.username,
      permissions: userInfo.permissions,
      department_id: userInfo.department_id,
      position_id: userInfo.position_id
    };
    
    next();
  } catch (error) {
    console.error('获取用户权限信息失败:', error);
    res.status(500).json({
      success: false,
      message: '认证失败'
    });
  }
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
 * 允许管理员和超级管理员访问
 */
export const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * 代理权限中间件
 * 允许代理和管理员访问
 */
export const requireAgent = requireRole(['agent', 'admin']);

/**
 * 可选认证中间件
 * 如果提供了token则验证，但不强制要求
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      try {
        const userInfo = await getUserWithPermissions(payload.id);
        if (userInfo) {
          req.user = {
            ...payload,
            username: userInfo.username,
            permissions: userInfo.permissions,
            department_id: userInfo.department_id,
            position_id: userInfo.position_id
          };
        }
      } catch (error) {
        console.error('获取用户权限信息失败:', error);
        // 可选认证失败时不阻止请求继续
      }
    }
  }
  
  next();
};

/**
 * 检查用户会话状态
 * 验证用户是否被强制下线
 */
async function checkSessionStatus(userId: string): Promise<boolean> {
  const { query } = await import('../config/database.js');
  
  try {
    // 查询用户的活跃会话
    const result = await query(
      'SELECT COUNT(*) as active_sessions FROM admin_sessions WHERE admin_id = $1 AND is_active = true',
      [userId]
    );
    
    // 如果没有活跃会话，说明用户被强制下线
    const activeSessionCount = parseInt(result.rows[0]?.active_sessions || '0');
    return activeSessionCount > 0;
  } catch (error) {
    console.error('检查会话状态失败:', error);
    // 出错时允许通过，避免影响正常用户
    return true;
  }
}

/**
 * 获取用户完整信息和权限
 */
async function getUserWithPermissions(userId: string) {
  const { query } = await import('../config/database.js');
  
  const sql = `
    SELECT 
      a.id,
      a.username,
      a.email,
      a.status,
      a.department_id,
      a.position_id,
      COALESCE(
        json_agg(
          DISTINCT m.permission
        ) FILTER (WHERE m.permission IS NOT NULL),
        '[]'::json
      ) as permissions
    FROM admins a
    LEFT JOIN admin_roles ar ON a.id = ar.admin_id
    LEFT JOIN role_permissions rp ON ar.role_id = rp.role_id
    LEFT JOIN menus m ON rp.menu_id = m.id
    WHERE a.id = $1 AND a.status = 'active'
    GROUP BY a.id, a.username, a.email, a.status, a.department_id, a.position_id
  `;
  
  const result = await query(sql, [userId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const user = result.rows[0];
  return {
    ...user,
    permissions: Array.isArray(user.permissions) ? user.permissions : []
  };
}