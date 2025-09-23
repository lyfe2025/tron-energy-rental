/**
 * 机器人网络配置服务类
 * 从 ConfigService.ts 中安全分离的机器人网络关联配置管理
 * 负责机器人和TRON网络关联配置的查询和管理
 */

import { query } from '../../../database/index.ts';
import type { BotNetworkConfig } from '../ConfigService.ts';
import { ConfigCacheService } from './ConfigCacheService.ts';

export class BotNetworkConfigService {
  private cacheService: ConfigCacheService;

  constructor(cacheService: ConfigCacheService) {
    this.cacheService = cacheService;
  }

  /**
   * 获取机器人网络配置
   */
  async getBotNetworkConfigs(botId?: string, networkId?: string): Promise<BotNetworkConfig[]> {
    const cacheKey = this.cacheService.getCacheKey('telegram_bots_network_configs', `${botId || 'all'}_${networkId || 'all'}`);
    const cached = this.cacheService.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    let queryStr = 'SELECT id, network_configurations FROM telegram_bots WHERE is_active = true';
    const params: any[] = [];
    
    if (botId) {
      params.push(botId);
      queryStr += ` AND id = $${params.length}`;
    }
    
    const result = await query(queryStr, params);
      const configs: BotNetworkConfig[] = [];
      
      result.rows.forEach(row => {
        const networkConfigs = row.network_configurations || [];
        networkConfigs.forEach((config: any) => {
          if (!networkId || config.networkId === networkId) {
            configs.push({
              id: config.id || `${row.id}_${config.networkId}`,
              botId: row.id,
              networkId: config.networkId,
              isActive: config.isActive !== false,
              isPrimary: config.isPrimary || false,
              priority: config.priority || 0,
              config: config.config || {},
              apiSettings: config.apiSettings || {},
              contractAddresses: config.contractAddresses || {},
              gasSettings: config.gasSettings || {},
              monitoringSettings: config.monitoringSettings || {},
              syncStatus: config.syncStatus || {}
            });
          }
        });
      });
      
      // 按优先级和创建时间排序
      configs.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return 0;
      });

      this.cacheService.setCache(cacheKey, configs);
      return configs;
  }
}