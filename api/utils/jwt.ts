/**
 * JWT工具函数
 * 处理JWT token的生成、验证和解析
 */
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN: StringValue = (process.env.JWT_EXPIRES_IN || '24h') as StringValue;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  loginType: string;
}

/**
 * 生成JWT token
 * @param payload 用户信息载荷
 * @returns JWT token字符串
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'tron-energy-rental',
    audience: 'tron-energy-rental-users'
  });
};

/**
 * 验证JWT token
 * @param token JWT token字符串
 * @returns 解析后的用户信息或null
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'tron-energy-rental',
      audience: 'tron-energy-rental-users'
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT验证失败:', error);
    return null;
  }
};

/**
 * 从请求头中提取token
 * @param authHeader Authorization头部值
 * @returns token字符串或null
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }
  
  // 支持 "Bearer token" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 直接返回token
  return authHeader;
};

/**
 * 刷新token（生成新的token）
 * @param oldToken 旧的token
 * @returns 新的token或null
 */
export const refreshToken = (oldToken: string): string | null => {
  const payload = verifyToken(oldToken);
  if (!payload) {
    return null;
  }
  
  // 生成新token（移除过期时间等JWT内置字段）
  const newPayload: JWTPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    loginType: payload.loginType
  };
  
  return generateToken(newPayload);
};