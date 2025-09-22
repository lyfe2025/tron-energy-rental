import { createClient, type RedisClientType } from 'redis';
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
const redisClient: RedisClientType = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
    reconnectStrategy: (retries) => {
      console.log(`Redis reconnect attempt ${retries}`);
      if (retries >= 10) {
        console.error('Redis重连达到最大次数限制，停止重连');
        return false;
      }
      // 指数退避，最大10秒
      return Math.min(Math.pow(2, retries) * 100, 10000);
    }
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

redisClient.on('reconnecting', () => {
  console.log('Redis Client Reconnecting...');
});

redisClient.on('end', () => {
  console.log('Redis Client Connection Ended');
});

// 检查Redis连接状态
export const isRedisConnected = (): boolean => {
  return redisClient.isOpen;
};

// 连接Redis
export const connectRedis = async (): Promise<boolean> => {
  try {
    // 如果已经连接，直接返回成功
    if (redisClient.isOpen) {
      console.log('Redis already connected');
      return true;
    }
    
    await redisClient.connect();
    console.log('Redis connection successful');
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
};

// 确保Redis连接的辅助函数
const ensureRedisConnection = async (): Promise<boolean> => {
  if (redisClient.isOpen) {
    return true;
  }
  
  console.log('Redis连接已断开，尝试重连...');
  return await connectRedis();
};

// Redis操作辅助函数
export const redisOperations = {
  // 设置键值对
  set: async (key: string, value: string, expireInSeconds?: number): Promise<void> => {
    if (!(await ensureRedisConnection())) {
      throw new Error('Redis connection unavailable');
    }
    if (expireInSeconds) {
      await redisClient.setEx(key, expireInSeconds, value);
    } else {
      await redisClient.set(key, value);
    }
  },

  // 获取值
  get: async (key: string): Promise<string | null> => {
    if (!(await ensureRedisConnection())) {
      throw new Error('Redis connection unavailable');
    }
    return await redisClient.get(key);
  },

  // 删除键
  del: async (key: string): Promise<number> => {
    if (!(await ensureRedisConnection())) {
      throw new Error('Redis connection unavailable');
    }
    return await redisClient.del(key);
  },

  // 检查键是否存在
  exists: async (key: string): Promise<boolean> => {
    if (!(await ensureRedisConnection())) {
      throw new Error('Redis connection unavailable');
    }
    const result = await redisClient.exists(key);
    return Boolean(result);
  },

  // 设置过期时间
  expire: async (key: string, seconds: number): Promise<boolean> => {
    if (!(await ensureRedisConnection())) {
      throw new Error('Redis connection unavailable');
    }
    const result = await redisClient.expire(key, seconds);
    return Boolean(result);
  },

  // 获取剩余过期时间
  ttl: async (key: string): Promise<number> => {
    if (!(await ensureRedisConnection())) {
      throw new Error('Redis connection unavailable');
    }
    return await redisClient.ttl(key);
  },

  // 哈希操作
  hSet: async (key: string, field: string, value: string): Promise<number> => {
    if (!(await ensureRedisConnection())) {
      throw new Error('Redis connection unavailable');
    }
    return await redisClient.hSet(key, field, value);
  },

  hGet: async (key: string, field: string): Promise<string | undefined> => {
    if (!(await ensureRedisConnection())) {
      throw new Error('Redis connection unavailable');
    }
    return await redisClient.hGet(key, field);
  },

  hGetAll: async (key: string): Promise<Record<string, string>> => {
    if (!(await ensureRedisConnection())) {
      throw new Error('Redis connection unavailable');
    }
    return await redisClient.hGetAll(key);
  },

  hDel: async (key: string, field: string): Promise<number> => {
    if (!(await ensureRedisConnection())) {
      throw new Error('Redis connection unavailable');
    }
    return await redisClient.hDel(key, field);
  },
};

export default redisClient;