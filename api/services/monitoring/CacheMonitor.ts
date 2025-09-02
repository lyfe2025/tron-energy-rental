/**
 * 缓存监控模块
 * 负责Redis缓存的监控和管理
 */
import { logger } from '../../utils/logger.js';
import type { CacheInfo } from './types/monitoring.types.js';

// 动态导入Redis客户端
let redisClient: any = null;

async function getRedisClient() {
  if (!redisClient) {
    try {
      const { createClient } = await import('redis');
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      redisClient.on('error', (error: Error) => {
        logger.error('Redis客户端错误:', error);
      });
      
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
    } catch (error) {
      logger.error('创建Redis客户端失败:', error);
      throw error;
    }
  }
  return redisClient;
}

export class CacheMonitor {
  /**
   * 测试缓存连接
   */
  async testCacheConnection(): Promise<CacheInfo> {
    try {
      const client = await getRedisClient();
      
      // 测试连接
      const pingResult = await client.ping();
      
      if (pingResult !== 'PONG') {
        throw new Error('Redis连接测试失败');
      }

      // 获取键数量
      const keyCount = await client.dbSize();
      
      // 获取内存信息
      const memoryInfo = await client.info('memory');
      const memoryLines = memoryInfo.split('\r\n');
      
      let usedMemory = 0;
      let peakMemory = 0;
      
      memoryLines.forEach((line: string) => {
        if (line.startsWith('used_memory:')) {
          usedMemory = parseInt(line.split(':')[1]);
        } else if (line.startsWith('used_memory_peak:')) {
          peakMemory = parseInt(line.split(':')[1]);
        }
      });

      // 获取详细统计信息
      const stats = await client.info('stats');

      return {
        connected: true,
        keyCount,
        memory: {
          used: usedMemory,
          peak: peakMemory
        },
        stats: this.parseRedisInfo(stats)
      };
    } catch (error) {
      logger.error('测试缓存连接失败:', error);
      return {
        connected: false
      };
    }
  }

  /**
   * 清理缓存
   */
  async clearCache() {
    try {
      const client = await getRedisClient();
      
      // 获取清理前的键数量
      const beforeCount = await client.dbSize();
      
      // 清空数据库
      await client.flushDb();
      
      // 获取清理后的键数量
      const afterCount = await client.dbSize();
      
      logger.info(`缓存清理完成，删除了 ${beforeCount} 个键`);
      
      return {
        message: '缓存清理完成',
        deletedKeys: beforeCount,
        remainingKeys: afterCount
      };
    } catch (error) {
      logger.error('清理缓存失败:', error);
      throw error;
    }
  }

  /**
   * 删除指定的缓存键
   */
  async deleteCacheKey(key: string) {
    try {
      const client = await getRedisClient();
      
      // 检查键是否存在
      const exists = await client.exists(key);
      
      if (!exists) {
        throw new Error(`缓存键 ${key} 不存在`);
      }
      
      // 删除键
      const result = await client.del(key);
      
      logger.info(`删除缓存键: ${key}`);
      
      return {
        message: `缓存键 ${key} 删除成功`,
        deleted: result === 1
      };
    } catch (error) {
      logger.error(`删除缓存键失败 ${key}:`, error);
      throw error;
    }
  }

  /**
   * 获取缓存键列表
   */
  async getCacheKeys(pattern: string = '*', limit: number = 100) {
    try {
      const client = await getRedisClient();
      
      // 使用SCAN命令获取键列表（避免KEYS命令阻塞）
      const keys: string[] = [];
      let cursor = 0;
      
      do {
        const result = await client.scan(cursor, {
          MATCH: pattern,
          COUNT: limit
        });
        
        cursor = result.cursor;
        keys.push(...result.keys);
        
      } while (cursor !== 0 && keys.length < limit);
      
      // 限制返回的键数量
      const limitedKeys = keys.slice(0, limit);
      
      // 获取每个键的详细信息
      const keyDetails = await Promise.all(
        limitedKeys.map(async (key) => {
          try {
            const [type, ttl, memory] = await Promise.all([
              client.type(key),
              client.ttl(key),
              client.memoryUsage(key).catch(() => null) // 某些Redis版本可能不支持
            ]);
            
            return {
              key,
              type,
              ttl: ttl === -1 ? 'never' : ttl,
              memory: memory || 'unknown'
            };
          } catch (error) {
            return {
              key,
              type: 'unknown',
              ttl: 'unknown',
              memory: 'unknown'
            };
          }
        })
      );
      
      return {
        keys: keyDetails,
        total: keys.length,
        hasMore: keys.length >= limit
      };
    } catch (error) {
      logger.error('获取缓存键列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取缓存性能统计
   */
  async getCacheStats() {
    try {
      const client = await getRedisClient();
      
      // 获取服务器信息
      const [serverInfo, memoryInfo, statsInfo, replicationInfo] = await Promise.all([
        client.info('server'),
        client.info('memory'),
        client.info('stats'),
        client.info('replication')
      ]);
      
      return {
        server: this.parseRedisInfo(serverInfo),
        memory: this.parseRedisInfo(memoryInfo),
        stats: this.parseRedisInfo(statsInfo),
        replication: this.parseRedisInfo(replicationInfo)
      };
    } catch (error) {
      logger.error('获取缓存统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取缓存键的详细信息
   */
  async getCacheKeyInfo(key: string) {
    try {
      const client = await getRedisClient();
      
      // 检查键是否存在
      const exists = await client.exists(key);
      
      if (!exists) {
        throw new Error(`缓存键 ${key} 不存在`);
      }
      
      // 获取键的详细信息
      const [type, ttl, memory, size] = await Promise.all([
        client.type(key),
        client.ttl(key),
        client.memoryUsage(key).catch(() => null),
        this.getKeySize(client, key)
      ]);
      
      // 根据类型获取值的预览
      let valuePreview = null;
      try {
        switch (type) {
          case 'string':
            const strValue = await client.get(key);
            valuePreview = strValue?.substring(0, 100) + (strValue?.length > 100 ? '...' : '');
            break;
          case 'list':
            const listLength = await client.lLen(key);
            const listSample = await client.lRange(key, 0, 2);
            valuePreview = { length: listLength, sample: listSample };
            break;
          case 'set':
            const setSize = await client.sCard(key);
            const setSample = await client.sMembers(key).then(members => members.slice(0, 3));
            valuePreview = { size: setSize, sample: setSample };
            break;
          case 'hash':
            const hashSize = await client.hLen(key);
            const hashSample = await client.hGetAll(key);
            const hashKeys = Object.keys(hashSample).slice(0, 3);
            const hashPreview: any = {};
            hashKeys.forEach(k => hashPreview[k] = hashSample[k]);
            valuePreview = { size: hashSize, sample: hashPreview };
            break;
          case 'zset':
            const zsetSize = await client.zCard(key);
            const zsetSample = await client.zRange(key, 0, 2, { REV: true, WITHSCORES: true });
            valuePreview = { size: zsetSize, sample: zsetSample };
            break;
        }
      } catch (error) {
        valuePreview = 'Error retrieving value preview';
      }
      
      return {
        key,
        type,
        ttl: ttl === -1 ? 'never' : ttl,
        memory: memory || 'unknown',
        size,
        valuePreview
      };
    } catch (error) {
      logger.error(`获取缓存键信息失败 ${key}:`, error);
      throw error;
    }
  }

  /**
   * 设置缓存键的过期时间
   */
  async setCacheExpiry(key: string, seconds: number) {
    try {
      const client = await getRedisClient();
      
      // 检查键是否存在
      const exists = await client.exists(key);
      
      if (!exists) {
        throw new Error(`缓存键 ${key} 不存在`);
      }
      
      // 设置过期时间
      const result = await client.expire(key, seconds);
      
      logger.info(`设置缓存键 ${key} 的过期时间为 ${seconds} 秒`);
      
      return {
        message: `缓存键 ${key} 的过期时间设置成功`,
        success: result === 1,
        expirySeconds: seconds
      };
    } catch (error) {
      logger.error(`设置缓存键过期时间失败 ${key}:`, error);
      throw error;
    }
  }

  /**
   * 解析Redis INFO命令的输出
   */
  private parseRedisInfo(infoString: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = infoString.split('\r\n');
    
    lines.forEach(line => {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        
        // 尝试转换为数字
        const numValue = Number(value);
        result[key] = isNaN(numValue) ? value : numValue;
      }
    });
    
    return result;
  }

  /**
   * 获取键的大小（元素数量）
   */
  private async getKeySize(client: any, key: string): Promise<number> {
    try {
      const type = await client.type(key);
      
      switch (type) {
        case 'string':
          const strValue = await client.get(key);
          return strValue?.length || 0;
        case 'list':
          return await client.lLen(key);
        case 'set':
          return await client.sCard(key);
        case 'hash':
          return await client.hLen(key);
        case 'zset':
          return await client.zCard(key);
        default:
          return 0;
      }
    } catch (error) {
      return 0;
    }
  }
}
