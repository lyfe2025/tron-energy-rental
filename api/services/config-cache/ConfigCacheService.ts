/**
 * 主配置缓存服务 - 整合所有缓存功能
 */
import { EventEmitter } from 'events';
import { BotConfigCache } from './BotConfigCache.js';
import { NetworkConfigCache } from './NetworkConfigCache.js';
import { PoolConfigCache } from './PoolConfigCache.js';
import { SystemConfigCache } from './SystemConfigCache.js';
import { NotificationService } from './NotificationService.js';
import type { CacheStats } from './types.js';

export class ConfigCacheService extends EventEmitter {
  private botCache: BotConfigCache;
  private networkCache: NetworkConfigCache;
  private poolCache: PoolConfigCache;
  private systemCache: SystemConfigCache;
  private notificationService: NotificationService;

  constructor() {
    super();
    this.initializeServices();
  }

  /**
   * 初始化所有缓存服务
   */
  private initializeServices(): void {
    this.botCache = new BotConfigCache();
    this.networkCache = new NetworkConfigCache();
    this.poolCache = new PoolConfigCache();
    this.systemCache = new SystemConfigCache();
    this.notificationService = new NotificationService();

    // 转发通知服务的事件
    this.notificationService.on('configChanged', (data) => {
      this.emit('configChanged', data);
    });

    console.log('配置缓存服务已初始化');
  }

  // ==================== 机器人配置相关 ====================
  
  /**
   * 获取机器人配置
   */
  async getBotConfig(botId: string): Promise<any> {
    return this.botCache.getBotConfig(botId);
  }

  /**
   * 获取机器人网络关联
   */
  async getBotNetworks(botId: string): Promise<any[]> {
    return this.botCache.getBotNetworks(botId);
  }

  /**
   * 清除机器人缓存
   */
  async clearBotCache(botId: string): Promise<void> {
    return this.botCache.clearBotCache(botId);
  }

  // ==================== 网络配置相关 ====================
  
  /**
   * 获取网络配置
   */
  async getNetworkConfig(networkId: string): Promise<any> {
    return this.networkCache.getNetworkConfig(networkId);
  }

  /**
   * 获取活跃网络配置
   */
  async getActiveNetworks(): Promise<any[]> {
    return this.networkCache.getActiveNetworks();
  }

  /**
   * 获取默认网络配置
   */
  async getDefaultNetwork(type?: string): Promise<any> {
    return this.networkCache.getDefaultNetwork(type);
  }

  /**
   * 清除网络缓存
   */
  async clearNetworkCache(networkId: string): Promise<void> {
    return this.networkCache.clearNetworkCache(networkId);
  }

  // ==================== 能量池配置相关 ====================
  
  /**
   * 获取能量池配置
   */
  async getPoolConfig(poolId: string): Promise<any> {
    return this.poolCache.getPoolConfig(poolId);
  }

  /**
   * 获取能量池网络关联
   */
  async getPoolNetworks(poolId: string): Promise<any[]> {
    return this.poolCache.getPoolNetworks(poolId);
  }

  /**
   * 获取活跃能量池
   */
  async getActivePools(): Promise<any[]> {
    return this.poolCache.getActivePools();
  }

  /**
   * 获取指定组的能量池
   */
  async getPoolsByGroup(groupName: string): Promise<any[]> {
    return this.poolCache.getPoolsByGroup(groupName);
  }

  /**
   * 清除能量池缓存
   */
  async clearPoolCache(poolId: string): Promise<void> {
    return this.poolCache.clearPoolCache(poolId);
  }

  // ==================== 系统配置相关 ====================
  
  /**
   * 获取系统配置
   */
  async getSystemConfig(configKey: string): Promise<any> {
    return this.systemCache.getSystemConfig(configKey);
  }

  /**
   * 获取配置值
   */
  async getConfigValue(configKey: string, defaultValue?: any): Promise<any> {
    return this.systemCache.getConfigValue(configKey, defaultValue);
  }

  /**
   * 获取分类下的所有配置
   */
  async getConfigsByCategory(category: string): Promise<any[]> {
    return this.systemCache.getConfigsByCategory(category);
  }

  /**
   * 获取所有系统配置
   */
  async getAllConfigs(): Promise<any[]> {
    return this.systemCache.getAllConfigs();
  }

  /**
   * 批量获取配置值
   */
  async getMultipleConfigValues(configKeys: string[]): Promise<{ [key: string]: any }> {
    return this.systemCache.getMultipleConfigValues(configKeys);
  }

  /**
   * 清除系统缓存
   */
  async clearSystemCache(): Promise<void> {
    return this.systemCache.clearSystemCache();
  }

  // ==================== 通知相关 ====================
  
  /**
   * 发布配置变更通知
   */
  async publishConfigChange(type: string, entityId: string, changes: any): Promise<void> {
    return this.notificationService.publishConfigChange(type, entityId, changes);
  }

  /**
   * 批量发布配置变更通知
   */
  async publishMultipleConfigChanges(notifications: Array<{ type: string; entityId: string; changes: any }>): Promise<void> {
    return this.notificationService.publishMultipleConfigChanges(notifications);
  }

  // ==================== 统计和管理 ====================
  
  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<CacheStats> {
    return this.botCache.getCacheStats();
  }

  /**
   * 清除所有缓存
   */
  async clearAllCaches(): Promise<void> {
    try {
      await Promise.all([
        this.botCache.clearAllBotCaches(),
        this.networkCache.clearAllNetworkCaches(),
        this.poolCache.clearAllPoolCaches(),
        this.systemCache.clearSystemCache()
      ]);
      
      console.log('所有缓存已清除');
    } catch (error) {
      console.error('清除所有缓存错误:', error);
    }
  }

  /**
   * 获取连接状态
   */
  get connected(): boolean {
    return this.botCache.connected;
  }

  /**
   * 关闭所有连接
   */
  async close(): Promise<void> {
    try {
      await Promise.all([
        this.botCache.close(),
        this.networkCache.close(),
        this.poolCache.close(),
        this.systemCache.close(),
        this.notificationService.close()
      ]);
      
      console.log('配置缓存服务已关闭');
    } catch (error) {
      console.error('关闭配置缓存服务错误:', error);
    }
  }

  // ==================== 向后兼容方法 ====================
  
  /**
   * 处理配置变更（向后兼容）
   */
  async handleConfigChange(channel: string, data: any): Promise<void> {
    // 这个方法保持为空，因为现在由NotificationService自动处理
    console.log('配置变更已自动处理:', { channel, data });
  }

  /**
   * 清除相关缓存（向后兼容）
   */
  async invalidateRelatedCache(channel: string, data: any): Promise<void> {
    // 这个方法保持为空，因为现在由NotificationService自动处理
    console.log('相关缓存已自动清除:', { channel, data });
  }
}
