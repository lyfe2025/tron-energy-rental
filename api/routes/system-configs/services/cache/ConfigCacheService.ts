/**
 * 系统配置缓存服务
 * 
 * 负责系统配置的缓存操作，包括缓存清理等功能
 * 提供统一的缓存管理接口
 */

import configCacheService from '../../../../services/config-cache.ts';

export class ConfigCacheService {
  /**
   * 清除系统配置缓存
   */
  async clearSystemCache(): Promise<void> {
    try {
      await configCacheService.clearSystemCache();
      console.log('✅ 系统配置缓存已清除');
    } catch (cacheError) {
      console.error('❌ 清除系统配置缓存失败:', cacheError);
      // 缓存清理失败不应该影响主要业务逻辑
      throw cacheError;
    }
  }

  /**
   * 安全清除系统配置缓存（不抛出异常）
   */
  async safeClearSystemCache(): Promise<boolean> {
    try {
      await configCacheService.clearSystemCache();
      console.log('✅ 系统配置缓存已清除');
      return true;
    } catch (cacheError) {
      console.error('❌ 清除系统配置缓存失败:', cacheError);
      // 缓存清理失败不应该影响主要业务逻辑
      return false;
    }
  }
}
