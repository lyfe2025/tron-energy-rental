/**
 * Express类型扩展
 * 扩展Request接口以支持认证中间件
 */

// JWT载荷接口定义
interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  loginType: string;
  telegram_id?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export {};