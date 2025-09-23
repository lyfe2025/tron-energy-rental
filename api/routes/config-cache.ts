/**
 * 配置缓存管理API路由
 * 提供缓存状态查询、手动清除缓存、配置预热等功能
 * 
 * 注意：此文件已经过模块化重构，原始内容已备份到 config-cache.ts.backup
 * 实际的业务逻辑现在分布在 config-cache/ 目录下的不同控制器中：
 * - controllers/CacheStatusController.ts - 缓存状态查询
 * - controllers/CacheClearController.ts - 缓存清除操作
 * - controllers/CacheWarmupController.ts - 缓存预热和通知
 * - controllers/ConfigHistoryController.ts - 配置变更历史
 */

// 直接导入并重新导出分离后的模块化路由
export { default } from './config-cache/index.ts';
