/**
 * 能量池配置缓存服务
 */
import { query } from '../../config/database.js';
import { CacheManager } from './CacheManager.js';
import { CACHE_KEYS, CACHE_TTL } from './types.js';

export class PoolConfigCache extends CacheManager {
  /**
   * 获取能量池配置（带缓存）
   */
  async getPoolConfig(poolId: string): Promise<any> {
    const cacheKey = `${CACHE_KEYS.POOL_CONFIG}${poolId}`;
    
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
          ep.id, ep.name, ep.tron_address, ep.account_name, ep.account_alias,
          ep.account_group, ep.network_id, ep.config, ep.api_settings,
          ep.monitoring_settings, ep.security_settings, ep.auto_sync_enabled,
          ep.sync_interval_minutes, ep.health_status, ep.last_health_check,
          tn.name as network_name, tn.type as network_type
         FROM energy_pools ep
         LEFT JOIN tron_networks tn ON ep.network_id = tn.id
         WHERE ep.id = $1`,
        [poolId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const config = result.rows[0];

      // 缓存配置
      if (this.connected) {
        await this.setCache(cacheKey, config, CACHE_TTL.POOL_CONFIG);
      }

      return config;
    } catch (error) {
      console.error('获取能量池配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取能量池网络关联（带缓存）
   */
  async getPoolNetworks(poolId: string): Promise<any[]> {
    const cacheKey = `${CACHE_KEYS.POOL_NETWORK}${poolId}`;
    
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
          ep.id as pool_id,
          ep.network_id,
          tn.name as network_name,
          tn.network_type as network_type,
          tn.rpc_url,
          tn.is_active as network_active,
          tn.health_status
         FROM energy_pools ep
         JOIN tron_networks tn ON ep.network_id = tn.id
         WHERE ep.id = $1 AND tn.is_active = true
         ORDER BY tn.name`,
        [poolId]
      );

      const networks = result.rows;

      // 缓存配置
      if (this.connected) {
        await this.setCache(cacheKey, networks, CACHE_TTL.POOL_CONFIG);
      }

      return networks;
    } catch (error) {
      console.error('获取能量池网络关联错误:', error);
      throw error;
    }
  }

  /**
   * 获取活跃能量池配置
   */
  async getActivePools(): Promise<any[]> {
    const cacheKey = `${CACHE_KEYS.POOL_CONFIG}active_all`;
    
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
          ep.id, ep.name, ep.tron_address, ep.account_name, ep.account_alias,
          ep.account_group, ep.health_status, ep.last_health_check,
          ep.total_energy, ep.available_energy, ep.reserved_energy,
          tn.name as network_name, tn.network_type
         FROM energy_pools ep
         LEFT JOIN tron_networks tn ON ep.network_id = tn.id
         WHERE ep.is_active = true
         ORDER BY ep.account_group, ep.name`
      );

      const pools = result.rows;

      // 缓存配置（较短的TTL，因为能量状态变化较快）
      if (this.connected) {
        await this.setCache(cacheKey, pools, 300); // 5分钟
      }

      return pools;
    } catch (error) {
      console.error('获取活跃能量池配置错误:', error);
      throw error;
    }
  }

  /**
   * 获取指定组的能量池
   */
  async getPoolsByGroup(groupName: string): Promise<any[]> {
    const cacheKey = `${CACHE_KEYS.POOL_CONFIG}group_${groupName}`;
    
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
          ep.id, ep.name, ep.tron_address, ep.account_name, ep.account_alias,
          ep.health_status, ep.total_energy, ep.available_energy, ep.reserved_energy,
          tn.name as network_name, tn.network_type
         FROM energy_pools ep
         LEFT JOIN tron_networks tn ON ep.network_id = tn.id
         WHERE ep.account_group = $1 AND ep.is_active = true
         ORDER BY ep.name`,
        [groupName]
      );

      const pools = result.rows;

      // 缓存配置
      if (this.connected) {
        await this.setCache(cacheKey, pools, CACHE_TTL.POOL_CONFIG);
      }

      return pools;
    } catch (error) {
      console.error('获取指定组能量池错误:', error);
      throw error;
    }
  }

  /**
   * 清除能量池缓存
   */
  async clearPoolCache(poolId: string): Promise<void> {
    if (!this.connected) return;

    try {
      const keys = [
        `${CACHE_KEYS.POOL_CONFIG}${poolId}`,
        `${CACHE_KEYS.POOL_NETWORK}${poolId}`
      ];
      
      // 清除活跃池缓存
      const activeKeys = await this.getKeys(`${CACHE_KEYS.POOL_CONFIG}active_*`);
      keys.push(...activeKeys);
      
      // 清除组缓存
      const groupKeys = await this.getKeys(`${CACHE_KEYS.POOL_CONFIG}group_*`);
      keys.push(...groupKeys);
      
      if (keys.length > 0) {
        await this.deleteCache(...keys);
      }
      
      console.log(`能量池缓存已清除: ${poolId}`);
    } catch (error) {
      console.error('清除能量池缓存错误:', error);
    }
  }

  /**
   * 清除所有能量池相关缓存
   */
  async clearAllPoolCaches(): Promise<void> {
    if (!this.connected) return;

    try {
      const poolConfigKeys = await this.getKeys(`${CACHE_KEYS.POOL_CONFIG}*`);
      const poolNetworkKeys = await this.getKeys(`${CACHE_KEYS.POOL_NETWORK}*`);
      
      const allKeys = [...poolConfigKeys, ...poolNetworkKeys];
      
      if (allKeys.length > 0) {
        await this.deleteCache(...allKeys);
      }
      
      console.log('所有能量池缓存已清除');
    } catch (error) {
      console.error('清除所有能量池缓存错误:', error);
    }
  }
}
