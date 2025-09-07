/**
 * 配置缓存服务 - 模块化版本
 * 入口文件，提供向后兼容性
 */

// 导出新的分离版本
export { ConfigCacheService } from './ConfigCacheService.js';
export { BotConfigCache } from './BotConfigCache.js';
export { NetworkConfigCache } from './NetworkConfigCache.js';
export { PoolConfigCache } from './PoolConfigCache.js';
export { SystemConfigCache } from './SystemConfigCache.js';
export { NotificationService } from './NotificationService.js';
export { CacheManager } from './CacheManager.js';

// 导出类型和常量
export * from './types.js';

// 创建单例实例（向后兼容）
import { ConfigCacheService } from './ConfigCacheService.js';
const configCacheService = new ConfigCacheService();

export default configCacheService;
