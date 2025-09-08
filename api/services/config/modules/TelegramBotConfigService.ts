/**
 * Telegram机器人配置服务类
 * 从 ConfigService.ts 中安全分离的Telegram机器人配置管理
 * 负责Telegram机器人配置的查询和管理
 */

import pool from '../../../config/database.js';
import type { TelegramBotConfig, TronNetworkConfig } from '../ConfigService.js';
import { ConfigCacheService } from './ConfigCacheService.js';

export class TelegramBotConfigService {
  private cacheService: ConfigCacheService;

  constructor(cacheService: ConfigCacheService) {
    this.cacheService = cacheService;
  }

  /**
   * 获取所有Telegram机器人配置
   */
  async getTelegramBots(activeOnly: boolean = false): Promise<TelegramBotConfig[]> {
    const cacheKey = this.cacheService.getCacheKey('telegram_bots', activeOnly ? 'active' : 'all');
    const cached = this.cacheService.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM telegram_bots 
        ${activeOnly ? 'WHERE is_active = true' : ''}
        ORDER BY created_at ASC
      `;
      
      const result = await client.query(query);
      const bots = result.rows.map(row => ({
        id: row.id,
        botName: row.bot_name,
        botToken: this.cacheService.decrypt(row.bot_token),
        botUsername: row.bot_username,
        workMode: row.work_mode || 'polling',
        webhookUrl: row.webhook_url,
        webhookSecret: row.webhook_secret,
        maxConnections: row.max_connections || 40,
        isActive: row.is_active,
        networkConfig: row.network_config,
        webhookConfig: row.webhook_config,
        messageTemplates: row.message_templates,
        rateLimits: row.rate_limits,
        securitySettings: row.security_settings,
        config: row.config,
        healthStatus: row.health_status,
        description: row.description
      }));

      this.cacheService.setCache(cacheKey, bots);
      return bots;
    } finally {
      client.release();
    }
  }

  /**
   * 根据ID获取Telegram机器人配置
   */
  async getTelegramBotById(id: string): Promise<TelegramBotConfig | null> {
    const cacheKey = this.cacheService.getCacheKey('telegram_bot', id);
    const cached = this.cacheService.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM telegram_bots WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const bot = {
        id: row.id,
        botName: row.bot_name,
        botToken: this.cacheService.decrypt(row.bot_token),
        botUsername: row.bot_username,
        workMode: row.work_mode || 'polling',
        webhookUrl: row.webhook_url,
        webhookSecret: row.webhook_secret,
        maxConnections: row.max_connections || 40,
        isActive: row.is_active,
        networkConfig: row.network_config,
        webhookConfig: row.webhook_config,
        messageTemplates: row.message_templates,
        rateLimits: row.rate_limits,
        securitySettings: row.security_settings,
        config: row.config,
        healthStatus: row.health_status,
        description: row.description
      };

      this.cacheService.setCache(cacheKey, bot);
      return bot;
    } finally {
      client.release();
    }
  }

  /**
   * 获取活跃的机器人配置（包含网络信息）
   */
  async getActiveBotConfigs(): Promise<Array<TelegramBotConfig & { networks: TronNetworkConfig[] }>> {
    const cacheKey = this.cacheService.getCacheKey('active_telegram_bots');
    const cached = this.cacheService.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const client = await pool.connect();
    try {
      // 获取活跃的机器人配置
      const botQuery = 'SELECT * FROM telegram_bots WHERE is_active = true ORDER BY created_at ASC';
      const botResult = await client.query(botQuery);
      
      // 获取所有网络配置
      const networkQuery = 'SELECT * FROM tron_networks WHERE is_active = true';
      const networkResult = await client.query(networkQuery);
      const networksMap = new Map();
      networkResult.rows.forEach(network => {
        networksMap.set(network.id, {
          id: network.id,
          name: network.name,
          networkType: network.network_type,
          rpcUrl: network.rpc_url,
          apiKey: network.api_key ? this.cacheService.decrypt(network.api_key) : undefined,
          chainId: network.chain_id,
          explorerUrl: network.block_explorer_url,
          isActive: network.is_active,
          isDefault: network.is_default,
          priority: network.priority,
          config: network.config,
          healthCheckUrl: network.health_check_url,
          description: network.description
        });
      });
      
      const configs = botResult.rows.map(row => {
        // 从network_configurations字段获取网络配置
        const networkConfigs = row.network_configurations || [];
        const networks = networkConfigs
          .filter((config: any) => config.isActive !== false && networksMap.has(config.networkId))
          .map((config: any) => {
            const baseNetwork = networksMap.get(config.networkId);
            return {
              ...baseNetwork,
              // 合并机器人特定的网络配置
              botNetworkConfig: {
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
              }
            };
          })
          .sort((a: any, b: any) => {
            const aPriority = a.botNetworkConfig?.priority || 0;
            const bPriority = b.botNetworkConfig?.priority || 0;
            return bPriority - aPriority;
          });

        return {
          id: row.id,
          botName: row.bot_name,
          botToken: this.cacheService.decrypt(row.bot_token),
          botUsername: row.bot_username,
          workMode: row.work_mode || 'polling',
          webhookUrl: row.webhook_url,
          webhookSecret: row.webhook_secret,
          maxConnections: row.max_connections || 40,
          isActive: row.is_active,
          networkConfig: row.network_config,
          webhookConfig: row.webhook_config,
          messageTemplates: row.message_templates,
          rateLimits: row.rate_limits,
          securitySettings: row.security_settings,
          config: row.config,
          healthStatus: row.health_status,
          description: row.description,
          networks
        };
      });

      this.cacheService.setCache(cacheKey, configs);
      return configs;
    } finally {
      client.release();
    }
  }
}
