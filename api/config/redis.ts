import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
};

// 创建Redis客户端
const redisClient = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
  },
  password: redisConfig.password,
  database: redisConfig.db,
});

// Redis连接事件处理
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

redisClient.on('ready', () => {
  console.log('Redis Client Ready');
});

// 连接Redis
export const connectRedis = async (): Promise<boolean> => {
  try {
    await redisClient.connect();
    console.log('Redis connection successful');
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
};

// Redis操作辅助函数
export const redisOperations = {
  // 设置键值对
  set: async (key: string, value: string, expireInSeconds?: number): Promise<void> => {
    if (expireInSeconds) {
      await redisClient.setEx(key, expireInSeconds, value);
    } else {
      await redisClient.set(key, value);
    }
  },

  // 获取值
  get: async (key: string): Promise<string | null> => {
    return await redisClient.get(key);
  },

  // 删除键
  del: async (key: string): Promise<number> => {
    return await redisClient.del(key);
  },

  // 检查键是否存在
  exists: async (key: string): Promise<boolean> => {
    const result = await redisClient.exists(key);
    return result === 1;
  },

  // 设置过期时间
  expire: async (key: string, seconds: number): Promise<boolean> => {
    const result = await redisClient.expire(key, seconds);
    return result === 1;
  },

  // 获取剩余过期时间
  ttl: async (key: string): Promise<number> => {
    return await redisClient.ttl(key);
  },

  // 哈希操作
  hSet: async (key: string, field: string, value: string): Promise<number> => {
    return await redisClient.hSet(key, field, value);
  },

  hGet: async (key: string, field: string): Promise<string | undefined> => {
    return await redisClient.hGet(key, field);
  },

  hGetAll: async (key: string): Promise<Record<string, string>> => {
    return await redisClient.hGetAll(key);
  },

  hDel: async (key: string, field: string): Promise<number> => {
    return await redisClient.hDel(key, field);
  },
};

export default redisClient;