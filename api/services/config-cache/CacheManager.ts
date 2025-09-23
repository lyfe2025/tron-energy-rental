/**
 * 缓存管理器 - 基础Redis连接和操作
 */
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import type { CacheConfig, CacheStats } from './types.ts';
import { CACHE_KEYS } from './types.ts';

export class CacheManager extends EventEmitter {
  protected redis: Redis;
  protected subscriber: Redis;
  private isConnected: boolean = false;

  constructor() {
    super();
    this.initializeRedis();
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedis(): Promise<void> {
    try {
      const config: CacheConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        lazyConnect: true
      };

      // 主Redis连接（用于缓存操作）
      this.redis = new Redis(config);

      // 订阅者连接（用于监听通知）
      this.subscriber = new Redis(config);

      // 连接Redis
      await this.redis.connect();
      await this.subscriber.connect();

      this.isConnected = true;
      console.log('Redis连接成功');

      // 设置事件监听
      this.setupEventListeners();

    } catch (error) {
      console.error('Redis连接失败:', error);
      this.isConnected = false;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.redis.on('error', (error) => {
      console.error('Redis错误:', error);
      this.isConnected = false;
    });

    this.redis.on('connect', () => {
      console.log('Redis重新连接成功');
      this.isConnected = true;
    });

    this.subscriber.on('error', (error) => {
      console.error('Redis订阅者错误:', error);
    });
  }

  /**
   * 获取连接状态
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 获取Redis实例
   */
  get redisClient(): Redis {
    return this.redis;
  }

  /**
   * 获取订阅者实例
   */
  get subscriberClient(): Redis {
    return this.subscriber;
  }

  /**
   * 设置缓存
   */
  async setCache(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, stringValue);
      } else {
        await this.redis.set(key, stringValue);
      }
    } catch (error) {
      console.error('设置缓存错误:', error);
    }
  }

  /**
   * 获取缓存
   */
  async getCache(key: string): Promise<any> {
    if (!this.isConnected) return null;

    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('获取缓存错误:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async deleteCache(...keys: string[]): Promise<void> {
    if (!this.isConnected || keys.length === 0) return;

    try {
      await this.redis.del(...keys);
    } catch (error) {
      console.error('删除缓存错误:', error);
    }
  }

  /**
   * 获取匹配的键
   */
  async getKeys(pattern: string): Promise<string[]> {
    if (!this.isConnected) return [];

    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error('获取键错误:', error);
      return [];
    }
  }

  /**
   * 发布消息
   */
  async publish(channel: string, message: any): Promise<void> {
    if (!this.isConnected) {
      console.warn('Redis未连接，无法发布消息');
      return;
    }

    try {
      await this.redis.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error('发布消息错误:', error);
    }
  }

  /**
   * 订阅频道
   */
  async subscribe(channel: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.subscriber.subscribe(channel);
    } catch (error) {
      console.error('订阅频道错误:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<CacheStats> {
    if (!this.isConnected) {
      return {
        connected: false,
        message: 'Redis未连接'
      };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // 统计各类型缓存键数量
      const botConfigKeys = await this.redis.keys(`${CACHE_KEYS.BOT_CONFIG}*`);
      const networkConfigKeys = await this.redis.keys(`${CACHE_KEYS.NETWORK_CONFIG}*`);
      const poolConfigKeys = await this.redis.keys(`${CACHE_KEYS.POOL_CONFIG}*`);
      const systemConfigKeys = await this.redis.keys(`${CACHE_KEYS.SYSTEM_CONFIG}*`);
      
      return {
        connected: true,
        memory_info: info,
        keyspace_info: keyspace,
        cache_counts: {
          telegram_bots: botConfigKeys.length,
          network_configs: networkConfigKeys.length,
          pool_configs: poolConfigKeys.length,
          system_configs: systemConfigKeys.length,
          total: botConfigKeys.length + networkConfigKeys.length + poolConfigKeys.length + systemConfigKeys.length
        }
      };
    } catch (error) {
      console.error('获取缓存统计错误:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      this.isConnected = false;
      console.log('Redis连接已关闭');
    } catch (error) {
      console.error('关闭Redis连接错误:', error);
    }
  }
}
