/**
 * TRON网络配置服务类
 * 从 ConfigService.ts 中安全分离的TRON网络配置管理
 * 负责TRON网络配置的查询和管理
 */

import { query } from '../../../database/index.ts';
import type { TronNetworkConfig } from '../ConfigService.ts';
import { ConfigCacheService } from './ConfigCacheService.ts';

export class TronNetworkConfigService {
  private cacheService: ConfigCacheService;

  constructor(cacheService: ConfigCacheService) {
    this.cacheService = cacheService;
  }

  /**
   * 获取所有TRON网络配置
   */
  async getTronNetworks(activeOnly: boolean = false): Promise<TronNetworkConfig[]> {
    const cacheKey = this.cacheService.getCacheKey('tron_networks', activeOnly ? 'active' : 'all');
    const cached = this.cacheService.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const queryStr = `
      SELECT * FROM tron_networks 
      ${activeOnly ? 'WHERE is_active = true' : ''}
      ORDER BY priority DESC, created_at ASC
    `;
    
    const result = await query(queryStr);
      const networks = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        networkType: row.network_type,
        rpcUrl: row.rpc_url,
        apiKey: row.api_key ? this.cacheService.decrypt(row.api_key) : undefined,
        chainId: row.chain_id,
        explorerUrl: row.explorer_url,
        isActive: row.is_active,
        isDefault: row.is_default,
        priority: row.priority,
        config: row.config,
        healthCheckUrl: row.health_check_url,
        description: row.description
      }));

      this.cacheService.setCache(cacheKey, networks);
      return networks;
  }

  /**
   * 获取默认TRON网络配置
   */
  async getDefaultTronNetwork(): Promise<TronNetworkConfig | null> {
    const cacheKey = this.cacheService.getCacheKey('tron_networks', 'default');
    const cached = this.cacheService.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await query(
      'SELECT * FROM tron_networks WHERE is_default = true AND is_active = true LIMIT 1'
    );
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const network = {
        id: row.id,
        name: row.name,
        networkType: row.network_type,
        rpcUrl: row.rpc_url,
        apiKey: row.api_key ? this.cacheService.decrypt(row.api_key) : undefined,
        chainId: row.chain_id,
        explorerUrl: row.explorer_url,
        isActive: row.is_active,
        isDefault: row.is_default,
        priority: row.priority,
        config: row.config,
        healthCheckUrl: row.health_check_url,
        description: row.description
      };

      this.cacheService.setCache(cacheKey, network);
      return network;
  }

  /**
   * 根据ID获取TRON网络配置
   */
  async getTronNetworkById(id: string): Promise<TronNetworkConfig | null> {
    const cacheKey = this.cacheService.getCacheKey('tron_network', id);
    const cached = this.cacheService.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await query(
      'SELECT * FROM tron_networks WHERE id = $1',
      [id]
    );
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const network = {
        id: row.id,
        name: row.name,
        networkType: row.network_type,
        rpcUrl: row.rpc_url,
        apiKey: row.api_key ? this.cacheService.decrypt(row.api_key) : undefined,
        chainId: row.chain_id,
        explorerUrl: row.explorer_url,
        isActive: row.is_active,
        isDefault: row.is_default,
        priority: row.priority,
        config: row.config,
        healthCheckUrl: row.health_check_url,
        description: row.description
      };

      this.cacheService.setCache(cacheKey, network);
      return network;
  }
}