/**
 * 配置缓存服务类
 * 从 ConfigService.ts 中安全分离的缓存管理和基础工具方法
 * 负责缓存管理、加密解密等基础功能
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export class ConfigCacheService extends EventEmitter {
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
  private readonly ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production';
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';

  constructor() {
    super();
  }

  /**
   * 解密敏感信息
   */
  decrypt(encryptedData: string): string {
    try {
      const data = JSON.parse(encryptedData);
      const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, this.ENCRYPTION_KEY, data.iv);
      decipher.setAuthTag(data.authTag);
      let decrypted = decipher.update(data.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('解密失败:', error);
      return encryptedData; // 如果解密失败，返回原始数据
    }
  }

  /**
   * 加密敏感信息
   */
  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, this.ENCRYPTION_KEY, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      return JSON.stringify({
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      });
    } catch (error) {
      console.error('加密失败:', error);
      return data; // 如果加密失败，返回原始数据
    }
  }

  /**
   * 获取缓存键
   */
  getCacheKey(type: string, id?: string): string {
    return id ? `${type}:${id}` : type;
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * 设置缓存
   */
  setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * 获取缓存
   */
  getCache(key: string): any {
    if (this.isCacheValid(key)) {
      return this.cache.get(key);
    }
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    return null;
  }

  /**
   * 清除缓存
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * 刷新缓存
   */
  async refreshCache(type?: string): Promise<void> {
    this.clearCache(type);
    this.emit('cache:refreshed', { type });
  }
}
