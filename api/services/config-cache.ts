/**
 * 配置缓存服务 - 模块化版本
 * 入口文件，提供向后兼容性
 */

// 导出新的分离版本
export { BotConfigCache } from './config-cache/BotConfigCache.js';
export { CacheManager } from './config-cache/CacheManager.js';
export { ConfigCacheService } from './config-cache/ConfigCacheService.js';
export { NetworkConfigCache } from './config-cache/NetworkConfigCache.js';
export { NotificationService } from './config-cache/NotificationService.js';
export { PoolConfigCache } from './config-cache/PoolConfigCache.js';
export { SystemConfigCache } from './config-cache/SystemConfigCache.js';

// 导出类型和常量
export * from './config-cache/types.js';

// 创建单例实例（向后兼容）
import { ConfigCacheService } from './config-cache/ConfigCacheService.js';
const configCacheService = new ConfigCacheService();

export default configCacheService;
