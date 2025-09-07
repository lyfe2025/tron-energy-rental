/**
 * TRON网络配置服务类
 * 从 ConfigService.ts 中安全分离的TRON网络配置管理
 * 负责TRON网络配置的查询和管理
 */

import pool from '../../../config/database.js';
import type { TronNetworkConfig } from '../ConfigService.js';
import { ConfigCacheService } from './ConfigCacheService.js';

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

    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM tron_networks 
        ${activeOnly ? 'WHERE is_active = true' : ''}
        ORDER BY priority DESC, created_at ASC
      `;
      
      const result = await client.query(query);
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
    } finally {
      client.release();
    }
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

    const client = await pool.connect();
    try {
      const result = await client.query(
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
    } finally {
      client.release();
    }
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

    const client = await pool.connect();
    try {
      const result = await client.query(
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
    } finally {
      client.release();
    }
  }
}
