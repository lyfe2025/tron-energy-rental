/**
 * 配置缓存服务 - 模块化版本
 * 入口文件，提供向后兼容性
 */

// 导出新的分离版本
export { BotConfigCache } from './config-cache/BotConfigCache.ts';
export { CacheManager } from './config-cache/CacheManager.ts';
export { ConfigCacheService } from './config-cache/ConfigCacheService.ts';
export { NetworkConfigCache } from './config-cache/NetworkConfigCache.ts';
export { NotificationService } from './config-cache/NotificationService.ts';
export { PoolConfigCache } from './config-cache/PoolConfigCache.ts';
export { SystemConfigCache } from './config-cache/SystemConfigCache.ts';

// 导出类型和常量
export * from './config-cache/types.ts';

// 创建单例实例（向后兼容）
import { ConfigCacheService } from './config-cache/ConfigCacheService.ts';
const configCacheService = new ConfigCacheService();

export default configCacheService;
