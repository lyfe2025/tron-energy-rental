/**
 * 机器人配置缓存服务
 */
import { query } from '../../config/database.js';
import { CacheManager } from './CacheManager.js';
import { CACHE_KEYS, CACHE_TTL } from './types.js';

export class BotConfigCache extends CacheManager {
  /**
   * 获取机器人配置（带缓存）
   */
  async getBotConfig(botId: string): Promise<any> {
    const cacheKey = `${CACHE_KEYS.BOT_CONFIG}${botId}`;
    
    try {
      // 尝试从缓存获取
      if (this.connected) {
        const cached = await this.getCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // 从数据库获取
      const result = await query(
        `SELECT 
          id, bot_token as token, bot_name as name, bot_username as username, 
          is_active as status, webhook_url, network_configurations as network_config,
          created_by, created_at, updated_at
         FROM telegram_bots 
         WHERE id = $1`,
        [botId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const config = result.rows[0];

      // 缓存配置
      if (this.connected) {
        await this.setCache(cacheKey, config, CACHE_TTL.BOT_CONFIG);
      }

      return config;
    } catch (error) {
      console.error('获取机器人配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取机器人网络关联（带缓存）
   */
  async getBotNetworks(botId: string): Promise<any[]> {
    const cacheKey = `${CACHE_KEYS.BOT_NETWORK}${botId}`;
    
    try {
      // 尝试从缓存获取
      if (this.connected) {
        const cached = await this.getCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // 从数据库获取
      const result = await query(
        `SELECT 
          tb.id as bot_id,
          (nc->>'network_id')::uuid as network_id,
          (nc->>'is_primary')::boolean as is_primary,
          nc as config,
          tn.name as network_name,
          tn.type as network_type,
          tn.rpc_url
         FROM telegram_bots tb
         CROSS JOIN LATERAL jsonb_array_elements(tb.network_configurations) AS nc
         JOIN tron_networks tn ON (nc->>'network_id')::uuid = tn.id
         WHERE tb.id = $1 
           AND tn.is_active = true
           AND (nc->>'is_active')::boolean = true
         ORDER BY (nc->>'is_primary')::boolean DESC, tn.name`,
        [botId]
      );

      const networks = result.rows;

      // 缓存配置
      if (this.connected) {
        await this.setCache(cacheKey, networks, CACHE_TTL.BOT_CONFIG);
      }

      return networks;
    } catch (error) {
      console.error('获取机器人网络关联错误:', error);
      throw error;
    }
  }

  /**
   * 清除机器人缓存
   */
  async clearBotCache(botId: string): Promise<void> {
    if (!this.connected) return;

    try {
      const keys = [
        `${CACHE_KEYS.BOT_CONFIG}${botId}`,
        `${CACHE_KEYS.BOT_NETWORK}${botId}`
      ];
      
      await this.deleteCache(...keys);
      console.log(`机器人缓存已清除: ${botId}`);
    } catch (error) {
      console.error('清除机器人缓存错误:', error);
    }
  }

  /**
   * 清除所有机器人相关缓存
   */
  async clearAllBotCaches(): Promise<void> {
    if (!this.connected) return;

    try {
      const botConfigKeys = await this.getKeys(`${CACHE_KEYS.BOT_CONFIG}*`);
      const botNetworkKeys = await this.getKeys(`${CACHE_KEYS.BOT_NETWORK}*`);
      
      const allKeys = [...botConfigKeys, ...botNetworkKeys];
      
      if (allKeys.length > 0) {
        await this.deleteCache(...allKeys);
      }
      
      console.log('所有机器人缓存已清除');
    } catch (error) {
      console.error('清除所有机器人缓存错误:', error);
    }
  }
}
