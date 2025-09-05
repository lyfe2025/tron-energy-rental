/**
 * 配置缓存和通知服务
 * 使用 Redis 缓存配置数据，实现配置变更时的自动通知
 */
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { query } from '../config/database.js';

// 配置缓存键前缀
const CACHE_KEYS = {
  BOT_CONFIG: 'bot:config:',
  NETWORK_CONFIG: 'network:config:',
  POOL_CONFIG: 'pool:config:',
  SYSTEM_CONFIG: 'system:config:',
  BOT_NETWORK: 'bot:network:',
  POOL_NETWORK: 'pool:network:'
};

// 缓存过期时间（秒）
const CACHE_TTL = {
  BOT_CONFIG: 3600,      // 1小时
  NETWORK_CONFIG: 7200,  // 2小时
  POOL_CONFIG: 1800,     // 30分钟
  SYSTEM_CONFIG: 86400   // 24小时
};

// 通知频道
const NOTIFICATION_CHANNELS = {
  BOT_CONFIG_CHANGED: 'bot:config:changed',
  NETWORK_CONFIG_CHANGED: 'network:config:changed',
  POOL_CONFIG_CHANGED: 'pool:config:changed',
  SYSTEM_CONFIG_CHANGED: 'system:config:changed'
};

class ConfigCacheService extends EventEmitter {
  private redis: Redis;
  private subscriber: Redis;
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
      // 主Redis连接（用于缓存操作）
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // 订阅者连接（用于监听通知）
      this.subscriber = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        lazyConnect: true
      });

      // 连接Redis
      await this.redis.connect();
      await this.subscriber.connect();

      this.isConnected = true;
      console.log('Redis连接成功');

      // 设置事件监听
      this.setupEventListeners();
      this.setupSubscriptions();

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
   * 设置配置变更订阅
   */
  private setupSubscriptions(): void {
    // 订阅所有配置变更通知
    Object.values(NOTIFICATION_CHANNELS).forEach(channel => {
      this.subscriber.subscribe(channel);
    });

    // 处理配置变更消息
    this.subscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        this.handleConfigChange(channel, data);
      } catch (error) {
        console.error('处理配置变更消息错误:', error);
      }
    });
  }

  /**
   * 处理配置变更
   */
  private handleConfigChange(channel: string, data: any): void {
    console.log(`配置变更通知 [${channel}]:`, data);
    
    // 触发本地事件
    this.emit('configChanged', {
      channel,
      type: data.type,
      entityId: data.entityId,
      changes: data.changes,
      timestamp: data.timestamp
    });

    // 根据变更类型清除相关缓存
    this.invalidateRelatedCache(channel, data);
  }

  /**
   * 清除相关缓存
   */
  private async invalidateRelatedCache(channel: string, data: any): Promise<void> {
    try {
      switch (channel) {
        case NOTIFICATION_CHANNELS.BOT_CONFIG_CHANGED:
          await this.clearBotCache(data.entityId);
          break;
        case NOTIFICATION_CHANNELS.NETWORK_CONFIG_CHANGED:
          await this.clearNetworkCache(data.entityId);
          break;
        case NOTIFICATION_CHANNELS.POOL_CONFIG_CHANGED:
          await this.clearPoolCache(data.entityId);
          break;
        case NOTIFICATION_CHANNELS.SYSTEM_CONFIG_CHANGED:
          await this.clearSystemCache();
          break;
      }
    } catch (error) {
      console.error('清除缓存错误:', error);
    }
  }

  /**
   * 获取机器人配置（带缓存）
   */
  async getBotConfig(botId: string): Promise<any> {
    const cacheKey = `${CACHE_KEYS.BOT_CONFIG}${botId}`;
    
    try {
      // 尝试从缓存获取
      if (this.isConnected) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // 从数据库获取
      const result = await query(
        `SELECT 
          id, name, token, username, status, welcome_message, help_message,
          allowed_updates, network_config, webhook_config, message_templates,
          rate_limits, security_settings, health_status, last_health_check,
          created_at, updated_at
         FROM telegram_bots 
         WHERE id = $1`,
        [botId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const config = result.rows[0];

      // 缓存配置
      if (this.isConnected) {
        await this.redis.setex(cacheKey, CACHE_TTL.BOT_CONFIG, JSON.stringify(config));
      }

      return config;
    } catch (error) {
      console.error('获取机器人配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取网络配置（带缓存）
   */
  async getNetworkConfig(networkId: string): Promise<any> {
    const cacheKey = `${CACHE_KEYS.NETWORK_CONFIG}${networkId}`;
    
    try {
      // 尝试从缓存获取
      if (this.isConnected) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // 从数据库获取
      const result = await query(
        `SELECT 
          id, name, type, rpc_url, chain_id, api_key, contract_addresses,
          rate_limits, timeout_settings, retry_settings, health_check_config,
          is_active, health_status, last_health_check, created_at, updated_at
         FROM tron_networks 
         WHERE id = $1`,
        [networkId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const config = result.rows[0];

      // 缓存配置
      if (this.isConnected) {
        await this.redis.setex(cacheKey, CACHE_TTL.NETWORK_CONFIG, JSON.stringify(config));
      }

      return config;
    } catch (error) {
      console.error('获取网络配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取能量池配置（带缓存）
   */
  async getPoolConfig(poolId: string): Promise<any> {
    const cacheKey = `${CACHE_KEYS.POOL_CONFIG}${poolId}`;
    
    try {
      // 尝试从缓存获取
      if (this.isConnected) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // 从数据库获取
      const result = await query(
        `SELECT 
          ep.id, ep.name, ep.tron_address, ep.account_name, ep.account_alias,
          ep.account_group, ep.network_id, ep.config, ep.api_settings,
          ep.monitoring_settings, ep.security_settings, ep.auto_sync_enabled,
          ep.sync_interval_minutes, ep.health_status, ep.last_health_check,
          tn.name as network_name, tn.type as network_type
         FROM energy_pools ep
         LEFT JOIN tron_networks tn ON ep.network_id = tn.id
         WHERE ep.id = $1`,
        [poolId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const config = result.rows[0];

      // 缓存配置
      if (this.isConnected) {
        await this.redis.setex(cacheKey, CACHE_TTL.POOL_CONFIG, JSON.stringify(config));
      }

      return config;
    } catch (error) {
      console.error('获取能量池配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取机器人网络关联（带缓存）
   */
  async getBotNetworks(botId: string): Promise<any[]> {
    const cacheKey = `${CACHE_KEYS.BOT_NETWORK}${botId}`;
    
    try {
      // 尝试从缓存获取
      if (this.isConnected) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // 从数据库获取
      const result = await query(
        `SELECT 
          bnc.bot_id, bnc.network_id, bnc.is_primary, bnc.config,
          tn.name as network_name, tn.type as network_type, tn.rpc_url
         FROM bot_network_configs bnc
         JOIN tron_networks tn ON bnc.network_id = tn.id
         WHERE bnc.bot_id = $1 AND tn.is_active = true
         ORDER BY bnc.is_primary DESC, tn.name`,
        [botId]
      );

      const networks = result.rows;

      // 缓存配置
      if (this.isConnected) {
        await this.redis.setex(cacheKey, CACHE_TTL.BOT_CONFIG, JSON.stringify(networks));
      }

      return networks;
    } catch (error) {
      console.error('获取机器人网络关联错误:', error);
      throw error;
    }
  }

  /**
   * 发布配置变更通知
   */
  async publishConfigChange(type: string, entityId: string, changes: any): Promise<void> {
    if (!this.isConnected) {
      console.warn('Redis未连接，无法发布配置变更通知');
      return;
    }

    try {
      let channel: string;
      
      switch (type) {
        case 'bot':
          channel = NOTIFICATION_CHANNELS.BOT_CONFIG_CHANGED;
          break;
        case 'network':
          channel = NOTIFICATION_CHANNELS.NETWORK_CONFIG_CHANGED;
          break;
        case 'pool':
          channel = NOTIFICATION_CHANNELS.POOL_CONFIG_CHANGED;
          break;
        case 'system':
          channel = NOTIFICATION_CHANNELS.SYSTEM_CONFIG_CHANGED;
          break;
        default:
          console.warn('未知的配置变更类型:', type);
          return;
      }

      const message = {
        type,
        entityId,
        changes,
        timestamp: new Date().toISOString()
      };

      await this.redis.publish(channel, JSON.stringify(message));
      console.log(`配置变更通知已发布 [${channel}]:`, entityId);
      
    } catch (error) {
      console.error('发布配置变更通知错误:', error);
    }
  }

  /**
   * 清除机器人缓存
   */
  async clearBotCache(botId: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = [
        `${CACHE_KEYS.BOT_CONFIG}${botId}`,
        `${CACHE_KEYS.BOT_NETWORK}${botId}`
      ];
      
      await this.redis.del(...keys);
      console.log(`机器人缓存已清除: ${botId}`);
    } catch (error) {
      console.error('清除机器人缓存错误:', error);
    }
  }

  /**
   * 清除网络缓存
   */
  async clearNetworkCache(networkId: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = [`${CACHE_KEYS.NETWORK_CONFIG}${networkId}`];
      
      // 清除所有相关的机器人网络缓存
      const botNetworkKeys = await this.redis.keys(`${CACHE_KEYS.BOT_NETWORK}*`);
      keys.push(...botNetworkKeys);
      
      // 清除所有相关的能量池网络缓存
      const poolNetworkKeys = await this.redis.keys(`${CACHE_KEYS.POOL_NETWORK}*`);
      keys.push(...poolNetworkKeys);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      console.log(`网络缓存已清除: ${networkId}`);
    } catch (error) {
      console.error('清除网络缓存错误:', error);
    }
  }

  /**
   * 清除能量池缓存
   */
  async clearPoolCache(poolId: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = [
        `${CACHE_KEYS.POOL_CONFIG}${poolId}`,
        `${CACHE_KEYS.POOL_NETWORK}${poolId}`
      ];
      
      await this.redis.del(...keys);
      console.log(`能量池缓存已清除: ${poolId}`);
    } catch (error) {
      console.error('清除能量池缓存错误:', error);
    }
  }

  /**
   * 清除系统缓存
   */
  async clearSystemCache(): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = await this.redis.keys(`${CACHE_KEYS.SYSTEM_CONFIG}*`);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      console.log('系统缓存已清除');
    } catch (error) {
      console.error('清除系统缓存错误:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<any> {
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
          bot_configs: botConfigKeys.length,
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

// 创建单例实例
const configCacheService = new ConfigCacheService();

export default configCacheService;
export { ConfigCacheService, CACHE_KEYS, NOTIFICATION_CHANNELS };