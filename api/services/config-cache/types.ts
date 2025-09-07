/**
 * 配置缓存相关类型定义
 */

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}

export interface ConfigChangeData {
  type: string;
  entityId: string;
  changes: any;
  timestamp: string;
}

export interface CacheStats {
  connected: boolean;
  memory_info?: string;
  keyspace_info?: string;
  cache_counts?: {
    telegram_bots: number;
    network_configs: number;
    pool_configs: number;
    system_configs: number;
    total: number;
  };
  message?: string;
  error?: string;
}

// 配置缓存键前缀
export const CACHE_KEYS = {
  BOT_CONFIG: 'bot:config:',
  NETWORK_CONFIG: 'network:config:',
  POOL_CONFIG: 'pool:config:',
  SYSTEM_CONFIG: 'system:config:',
  BOT_NETWORK: 'bot:network:',
  POOL_NETWORK: 'pool:network:'
} as const;

// 缓存过期时间（秒）
export const CACHE_TTL = {
  BOT_CONFIG: 3600,      // 1小时
  NETWORK_CONFIG: 7200,  // 2小时
  POOL_CONFIG: 1800,     // 30分钟
  SYSTEM_CONFIG: 86400   // 24小时
} as const;

// 通知频道
export const NOTIFICATION_CHANNELS = {
  BOT_CONFIG_CHANGED: 'bot:config:changed',
  NETWORK_CONFIG_CHANGED: 'network:config:changed',
  POOL_CONFIG_CHANGED: 'pool:config:changed',
  SYSTEM_CONFIG_CHANGED: 'system:config:changed'
} as const;
