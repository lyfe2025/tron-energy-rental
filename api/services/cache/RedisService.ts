import { redisOperations } from '../../config/redis';

export class RedisService {
  async get(key: string): Promise<string | null> {
    try {
      return await redisOperations.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    try {
      await redisOperations.set(key, value, expireInSeconds);
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await redisOperations.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await redisOperations.exists(key);
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }
}


