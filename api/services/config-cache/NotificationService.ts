/**
 * 配置变更通知服务
 */
import { CacheManager } from './CacheManager.ts';
import { NOTIFICATION_CHANNELS, type ConfigChangeData } from './types.ts';

export class NotificationService extends CacheManager {
  constructor() {
    super();
    this.setupSubscriptions();
  }

  /**
   * 设置配置变更订阅
   */
  private setupSubscriptions(): void {
    // 等待连接建立后再订阅
    this.on('ready', () => {
      this.subscribeToConfigChanges();
    });

    // 如果已经连接，立即订阅
    if (this.connected) {
      this.subscribeToConfigChanges();
    }
  }

  /**
   * 订阅配置变更通知
   */
  private async subscribeToConfigChanges(): Promise<void> {
    try {
      // 订阅所有配置变更通知
      for (const channel of Object.values(NOTIFICATION_CHANNELS)) {
        await this.subscribe(channel);
      }

      // 处理配置变更消息
      this.subscriberClient.on('message', (channel, message) => {
        try {
          const data = JSON.parse(message);
          this.handleConfigChange(channel, data);
        } catch (error) {
          console.error('处理配置变更消息错误:', error);
        }
      });

      console.log('配置变更订阅已设置');
    } catch (error) {
      console.error('设置配置变更订阅错误:', error);
    }
  }

  /**
   * 处理配置变更
   */
  private handleConfigChange(channel: string, data: ConfigChangeData): void {
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
  private async invalidateRelatedCache(channel: string, data: ConfigChangeData): Promise<void> {
    try {
      switch (channel) {
        case NOTIFICATION_CHANNELS.BOT_CONFIG_CHANGED:
          await this.clearBotRelatedCache(data.entityId);
          break;
        case NOTIFICATION_CHANNELS.NETWORK_CONFIG_CHANGED:
          await this.clearNetworkRelatedCache(data.entityId);
          break;
        case NOTIFICATION_CHANNELS.POOL_CONFIG_CHANGED:
          await this.clearPoolRelatedCache(data.entityId);
          break;
        case NOTIFICATION_CHANNELS.SYSTEM_CONFIG_CHANGED:
          await this.clearSystemRelatedCache(data.entityId);
          break;
      }
    } catch (error) {
      console.error('清除缓存错误:', error);
    }
  }

  /**
   * 清除机器人相关缓存
   */
  private async clearBotRelatedCache(botId: string): Promise<void> {
    const botConfigKeys = await this.getKeys(`*bot:config:${botId}`);
    const botNetworkKeys = await this.getKeys(`*bot:network:${botId}`);
    
    const allKeys = [...botConfigKeys, ...botNetworkKeys];
    
    if (allKeys.length > 0) {
      await this.deleteCache(...allKeys);
    }
  }

  /**
   * 清除网络相关缓存
   */
  private async clearNetworkRelatedCache(networkId: string): Promise<void> {
    const networkConfigKeys = await this.getKeys(`*network:config:${networkId}`);
    const botNetworkKeys = await this.getKeys(`*bot:network:*`);
    const poolNetworkKeys = await this.getKeys(`*pool:network:*`);
    const activeNetworkKeys = await this.getKeys(`*network:config:active_*`);
    const defaultNetworkKeys = await this.getKeys(`*network:config:default_*`);
    
    const allKeys = [...networkConfigKeys, ...botNetworkKeys, ...poolNetworkKeys, ...activeNetworkKeys, ...defaultNetworkKeys];
    
    if (allKeys.length > 0) {
      await this.deleteCache(...allKeys);
    }
  }

  /**
   * 清除能量池相关缓存
   */
  private async clearPoolRelatedCache(poolId: string): Promise<void> {
    const poolConfigKeys = await this.getKeys(`*pool:config:${poolId}`);
    const poolNetworkKeys = await this.getKeys(`*pool:network:${poolId}`);
    const activePoolKeys = await this.getKeys(`*pool:config:active_*`);
    const groupPoolKeys = await this.getKeys(`*pool:config:group_*`);
    
    const allKeys = [...poolConfigKeys, ...poolNetworkKeys, ...activePoolKeys, ...groupPoolKeys];
    
    if (allKeys.length > 0) {
      await this.deleteCache(...allKeys);
    }
  }

  /**
   * 清除系统相关缓存
   */
  private async clearSystemRelatedCache(configKey?: string): Promise<void> {
    if (configKey) {
      // 清除特定配置的缓存
      const specificKeys = await this.getKeys(`*system:config:${configKey}`);
      const allKeys = await this.getKeys(`*system:config:all`);
      const categoryKeys = await this.getKeys(`*system:config:category_*`);
      
      const keys = [...specificKeys, ...allKeys, ...categoryKeys];
      
      if (keys.length > 0) {
        await this.deleteCache(...keys);
      }
    } else {
      // 清除所有系统配置缓存
      const systemKeys = await this.getKeys(`*system:config:*`);
      
      if (systemKeys.length > 0) {
        await this.deleteCache(...systemKeys);
      }
    }
  }

  /**
   * 发布配置变更通知
   */
  async publishConfigChange(type: string, entityId: string, changes: any): Promise<void> {
    if (!this.connected) {
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

      const message: ConfigChangeData = {
        type,
        entityId,
        changes,
        timestamp: new Date().toISOString()
      };

      await this.publish(channel, message);
      console.log(`配置变更通知已发布 [${channel}]:`, entityId);
      
    } catch (error) {
      console.error('发布配置变更通知错误:', error);
    }
  }

  /**
   * 批量发布配置变更通知
   */
  async publishMultipleConfigChanges(notifications: Array<{ type: string; entityId: string; changes: any }>): Promise<void> {
    if (!this.connected) {
      console.warn('Redis未连接，无法发布配置变更通知');
      return;
    }

    try {
      const promises = notifications.map(notification => 
        this.publishConfigChange(notification.type, notification.entityId, notification.changes)
      );

      await Promise.all(promises);
      console.log(`批量发布了 ${notifications.length} 个配置变更通知`);
    } catch (error) {
      console.error('批量发布配置变更通知错误:', error);
    }
  }
}
