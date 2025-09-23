/**
 * 网络配置缓存服务
 */
import { query } from '../../config/database.ts';
import { CacheManager } from './CacheManager.ts';
import { CACHE_KEYS, CACHE_TTL } from './types.ts';

export class NetworkConfigCache extends CacheManager {
  /**
   * 获取网络配置（带缓存）
   */
  async getNetworkConfig(networkId: string): Promise<any> {
    const cacheKey = `${CACHE_KEYS.NETWORK_CONFIG}${networkId}`;
    
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
          id, name, type, rpc_url, chain_id, api_key, contract_addresses,
          rate_limits, timeout_settings, retry_settings, health_check_config,
          is_active, health_status, last_health_check, created_at, updated_at
         FROM tron_networks 
         WHERE id = $1`,
        [networkId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const config = result.rows[0];

      // 缓存配置
      if (this.connected) {
        await this.setCache(cacheKey, config, CACHE_TTL.NETWORK_CONFIG);
      }

      return config;
    } catch (error) {
      console.error('获取网络配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取所有活跃网络配置（带缓存）
   */
  async getActiveNetworks(): Promise<any[]> {
    const cacheKey = `${CACHE_KEYS.NETWORK_CONFIG}active_all`;
    
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
          id, name, network_type as type, rpc_url, chain_id, api_key,
          is_active, is_default, priority, timeout_ms, retry_count,
          rate_limit_per_second, health_status, last_health_check,
          created_at, updated_at
         FROM tron_networks 
         WHERE is_active = true
         ORDER BY priority ASC, name ASC`
      );

      const networks = result.rows;

      // 缓存配置（较短的TTL，因为网络状态可能变化较快）
      if (this.connected) {
        await this.setCache(cacheKey, networks, 600); // 10分钟
      }

      return networks;
    } catch (error) {
      console.error('获取活跃网络配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取默认网络配置
   */
  async getDefaultNetwork(type?: string): Promise<any> {
    const cacheKey = `${CACHE_KEYS.NETWORK_CONFIG}default_${type || 'all'}`;
    
    try {
      // 尝试从缓存获取
      if (this.connected) {
        const cached = await this.getCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // 构建查询条件
      let query_sql = `
        SELECT 
          id, name, network_type as type, rpc_url, chain_id, api_key,
          is_active, is_default, priority, timeout_ms, retry_count,
          rate_limit_per_second, health_status, config
         FROM tron_networks 
         WHERE is_active = true AND is_default = true
      `;
      
      const queryParams = [];
      if (type) {
        query_sql += ' AND network_type = $1';
        queryParams.push(type);
      }
      
      query_sql += ' ORDER BY priority ASC LIMIT 1';

      const result = await query(query_sql, queryParams);

      const network = result.rows.length > 0 ? result.rows[0] : null;

      // 缓存配置
      if (this.connected) {
        await this.setCache(cacheKey, network, CACHE_TTL.NETWORK_CONFIG);
      }

      return network;
    } catch (error) {
      console.error('获取默认网络配置错误:', error);
      throw error;
    }
  }

  /**
   * 清除网络缓存
   */
  async clearNetworkCache(networkId: string): Promise<void> {
    if (!this.connected) return;

    try {
      const keys = [`${CACHE_KEYS.NETWORK_CONFIG}${networkId}`];
      
      // 清除所有相关的机器人网络缓存
      const botNetworkKeys = await this.getKeys(`${CACHE_KEYS.BOT_NETWORK}*`);
      keys.push(...botNetworkKeys);
      
      // 清除所有相关的能量池网络缓存
      const poolNetworkKeys = await this.getKeys(`${CACHE_KEYS.POOL_NETWORK}*`);
      keys.push(...poolNetworkKeys);
      
      // 清除活跃网络缓存
      const activeKeys = await this.getKeys(`${CACHE_KEYS.NETWORK_CONFIG}active_*`);
      keys.push(...activeKeys);
      
      // 清除默认网络缓存
      const defaultKeys = await this.getKeys(`${CACHE_KEYS.NETWORK_CONFIG}default_*`);
      keys.push(...defaultKeys);
      
      if (keys.length > 0) {
        await this.deleteCache(...keys);
      }
      
      console.log(`网络缓存已清除: ${networkId}`);
    } catch (error) {
      console.error('清除网络缓存错误:', error);
    }
  }

  /**
   * 清除所有网络相关缓存
   */
  async clearAllNetworkCaches(): Promise<void> {
    if (!this.connected) return;

    try {
      const networkKeys = await this.getKeys(`${CACHE_KEYS.NETWORK_CONFIG}*`);
      const botNetworkKeys = await this.getKeys(`${CACHE_KEYS.BOT_NETWORK}*`);
      const poolNetworkKeys = await this.getKeys(`${CACHE_KEYS.POOL_NETWORK}*`);
      
      const allKeys = [...networkKeys, ...botNetworkKeys, ...poolNetworkKeys];
      
      if (allKeys.length > 0) {
        await this.deleteCache(...allKeys);
      }
      
      console.log('所有网络缓存已清除');
    } catch (error) {
      console.error('清除所有网络缓存错误:', error);
    }
  }
}
