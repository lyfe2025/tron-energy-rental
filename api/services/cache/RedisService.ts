import { redisOperations } from '../../config/redis';

export class RedisService {
  async get(key: string): Promise<string | null> {
    try {
      return await redisOperations.get(key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        console.warn(`Redis连接不可用，跳过获取缓存 ${key}:`, errorMessage);
      } else {
        console.error(`Redis GET error for key ${key}:`, error);
      }
      return null;
    }
  }

  async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    try {
      await redisOperations.set(key, value, expireInSeconds);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        console.warn(`Redis连接不可用，跳过设置缓存 ${key}:`, errorMessage);
      } else {
        console.error(`Redis SET error for key ${key}:`, error);
      }
    }
  }

  async setNX(key: string, value: string, expireInSeconds?: number): Promise<boolean> {
    try {
      return await redisOperations.setNX(key, value, expireInSeconds);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        console.warn(`Redis连接不可用，跳过SETNX操作 ${key}:`, errorMessage);
      } else {
        console.error(`Redis SETNX error for key ${key}:`, error);
      }
      return false;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await redisOperations.del(key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        console.warn(`Redis连接不可用，跳过删除缓存 ${key}:`, errorMessage);
      } else {
        console.error(`Redis DEL error for key ${key}:`, error);
      }
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await redisOperations.exists(key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        console.warn(`Redis连接不可用，跳过存在性检查 ${key}:`, errorMessage);
      } else {
        console.error(`Redis EXISTS error for key ${key}:`, error);
      }
      return false;
    }
  }
}


