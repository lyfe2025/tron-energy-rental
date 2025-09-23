/**
 * 配置缓存服务 - 模块化版本
 * 入口文件，提供向后兼容性
 */

// 导出新的分离版本
export { ConfigCacheService } from './ConfigCacheService.ts';
export { BotConfigCache } from './BotConfigCache.ts';
export { NetworkConfigCache } from './NetworkConfigCache.ts';
export { PoolConfigCache } from './PoolConfigCache.ts';
export { SystemConfigCache } from './SystemConfigCache.ts';
export { NotificationService } from './NotificationService.ts';
export { CacheManager } from './CacheManager.ts';

// 导出类型和常量
export * from './types.ts';

// 创建单例实例（向后兼容）
import { ConfigCacheService } from './ConfigCacheService.ts';
const configCacheService = new ConfigCacheService();

export default configCacheService;
