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
  // 预检查token格式
  if (!token || typeof token !== 'string') {
    console.warn('JWT验证失败: token为空或类型错误');
    return null;
  }
  
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    console.warn('JWT验证失败: token为空字符串');
    return null;
  }
  
  // 基本格式检查：JWT应该包含两个点分隔符
  const parts = trimmedToken.split('.');
  if (parts.length !== 3) {
    console.warn('JWT验证失败: token格式不正确，应包含3个部分');
    return null;
  }
  
  try {
    const decoded = jwt.verify(trimmedToken, JWT_SECRET, {
      issuer: 'tron-energy-rental',
      audience: 'tron-energy-rental-users'
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('JWT验证失败:', error.message);
    } else {
      console.error('JWT验证失败:', error);
    }
    return null;
  }
};

/**
 * 从请求头中提取token
 * @param authHeader Authorization头部值
 * @returns token字符串或null
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  
  // 去除首尾空格
  const trimmedHeader = authHeader.trim();
  
  if (!trimmedHeader) {
    return null;
  }
  
  // 支持 "Bearer token" 格式
  if (trimmedHeader.startsWith('Bearer ')) {
    const token = trimmedHeader.substring(7).trim();
    // 检查token是否为空或只包含空格
    return token || null;
  }
  
  // 直接返回token（去除空格）
  return trimmedHeader || null;
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