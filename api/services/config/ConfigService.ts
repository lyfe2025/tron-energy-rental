/**
 * 配置服务 - 从数据库读取和管理配置
 * 支持缓存、热更新和配置变更通知
 */
import pool from '../../config/database.js';
import crypto from 'crypto';
import { EventEmitter } from 'events';

// 配置类型定义
export interface TronNetworkConfig {
  id: string;
  name: string;
  networkType: 'mainnet' | 'testnet';
  rpcUrl: string;
  apiKey?: string;
  chainId: number;
  explorerUrl: string;
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  config: any;
  healthCheckUrl: string;
  description?: string;
}

export interface TelegramBotConfig {
  id: string;
  botName: string;
  botToken: string;
  botUsername: string;
  webhookUrl?: string;
  isActive: boolean;
  networkConfig: any;
  webhookConfig: any;
  messageTemplates: any;
  rateLimits: any;
  securitySettings: any;
  config: any;
  healthStatus: string;
  description?: string;
  networks?: TronNetworkConfig[];
}

export interface BotNetworkConfig {
  id: string;
  botId: string;
  networkId: string;
  isActive: boolean;
  isPrimary: boolean;
  priority: number;
  config: any;
  apiSettings: any;
  contractAddresses: any;
  gasSettings: any;
  monitoringSettings: any;
  syncStatus: string;
}

/**
 * 配置服务类
 */
export class ConfigService extends EventEmitter {
  private static instance: ConfigService;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
  private readonly ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production';
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';

  private constructor() {
    super();
  }

  /**
   * 获取配置服务单例
   */
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * 解密敏感信息
   */
  private decrypt(encryptedData: string): string {
    try {
      const data = JSON.parse(encryptedData);
      const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, this.ENCRYPTION_KEY, data.iv);
      decipher.setAuthTag(data.authTag);
      let decrypted = decipher.update(data.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('解密失败:', error);
      return encryptedData; // 如果解密失败，返回原始数据
    }
  }

  /**
   * 加密敏感信息
   */
  private encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, this.ENCRYPTION_KEY, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      return JSON.stringify({
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      });
    } catch (error) {
      console.error('加密失败:', error);
      return data; // 如果加密失败，返回原始数据
    }
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(type: string, id?: string): string {
    return id ? `${type}:${id}` : type;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * 获取缓存
   */
  private getCache(key: string): any {
    if (this.isCacheValid(key)) {
      return this.cache.get(key);
    }
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    return null;
  }

  /**
   * 清除缓存
   */
  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * 获取所有TRON网络配置
   */
  async getTronNetworks(activeOnly: boolean = false): Promise<TronNetworkConfig[]> {
    const cacheKey = this.getCacheKey('tron_networks', activeOnly ? 'active' : 'all');
    const cached = this.getCache(cacheKey);
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
        apiKey: row.api_key ? this.decrypt(row.api_key) : undefined,
        chainId: row.chain_id,
        explorerUrl: row.explorer_url,
        isActive: row.is_active,
        isDefault: row.is_default,
        priority: row.priority,
        config: row.config,
        healthCheckUrl: row.health_check_url,
        description: row.description
      }));

      this.setCache(cacheKey, networks);
      return networks;
    } finally {
      client.release();
    }
  }

  /**
   * 获取默认TRON网络配置
   */
  async getDefaultTronNetwork(): Promise<TronNetworkConfig | null> {
    const cacheKey = this.getCacheKey('tron_networks', 'default');
    const cached = this.getCache(cacheKey);
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
        apiKey: row.api_key ? this.decrypt(row.api_key) : undefined,
        chainId: row.chain_id,
        explorerUrl: row.explorer_url,
        isActive: row.is_active,
        isDefault: row.is_default,
        priority: row.priority,
        config: row.config,
        healthCheckUrl: row.health_check_url,
        description: row.description
      };

      this.setCache(cacheKey, network);
      return network;
    } finally {
      client.release();
    }
  }

  /**
   * 根据ID获取TRON网络配置
   */
  async getTronNetworkById(id: string): Promise<TronNetworkConfig | null> {
    const cacheKey = this.getCacheKey('tron_network', id);
    const cached = this.getCache(cacheKey);
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
        apiKey: row.api_key ? this.decrypt(row.api_key) : undefined,
        chainId: row.chain_id,
        explorerUrl: row.explorer_url,
        isActive: row.is_active,
        isDefault: row.is_default,
        priority: row.priority,
        config: row.config,
        healthCheckUrl: row.health_check_url,
        description: row.description
      };

      this.setCache(cacheKey, network);
      return network;
    } finally {
      client.release();
    }
  }

  /**
   * 获取所有Telegram机器人配置
   */
  async getTelegramBots(activeOnly: boolean = false): Promise<TelegramBotConfig[]> {
    const cacheKey = this.getCacheKey('telegram_bots', activeOnly ? 'active' : 'all');
    const cached = this.getCache(cacheKey);
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
        botToken: this.decrypt(row.bot_token),
        botUsername: row.bot_username,
        webhookUrl: row.webhook_url,
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

      this.setCache(cacheKey, bots);
      return bots;
    } finally {
      client.release();
    }
  }

  /**
   * 根据ID获取Telegram机器人配置
   */
  async getTelegramBotById(id: string): Promise<TelegramBotConfig | null> {
    const cacheKey = this.getCacheKey('telegram_bot', id);
    const cached = this.getCache(cacheKey);
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
        botToken: this.decrypt(row.bot_token),
        botUsername: row.bot_username,
        webhookUrl: row.webhook_url,
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

      this.setCache(cacheKey, bot);
      return bot;
    } finally {
      client.release();
    }
  }

  /**
   * 获取机器人网络配置
   */
  async getBotNetworkConfigs(botId?: string, networkId?: string): Promise<BotNetworkConfig[]> {
    const cacheKey = this.getCacheKey('telegram_bots_network_configs', `${botId || 'all'}_${networkId || 'all'}`);
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const client = await pool.connect();
    try {
      let query = 'SELECT id, network_configurations FROM telegram_bots WHERE is_active = true';
      const params: any[] = [];
      
      if (botId) {
        params.push(botId);
        query += ` AND id = $${params.length}`;
      }
      
      const result = await client.query(query, params);
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

      this.setCache(cacheKey, configs);
      return configs;
    } finally {
      client.release();
    }
  }

  /**
   * 获取活跃的机器人配置（包含网络信息）
   */
  async getActiveBotConfigs(): Promise<Array<TelegramBotConfig & { networks: TronNetworkConfig[] }>> {
    const cacheKey = this.getCacheKey('active_telegram_bots');
    const cached = this.getCache(cacheKey);
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
          apiKey: network.api_key ? this.decrypt(network.api_key) : undefined,
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
          botToken: this.decrypt(row.bot_token),
          botUsername: row.bot_username,
          webhookUrl: row.webhook_url,
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

      this.setCache(cacheKey, configs);
      return configs;
    } finally {
      client.release();
    }
  }

  /**
   * 刷新配置缓存
   */
  async refreshCache(type?: string): Promise<void> {
    this.clearCache(type);
    this.emit('cache_refreshed', { type, timestamp: Date.now() });
  }

  /**
   * 监听配置变更
   */
  onConfigChange(callback: (event: any) => void): void {
    this.on('config_changed', callback);
  }

  /**
   * 触发配置变更事件
   */
  emitConfigChange(type: string, id: string, action: 'created' | 'updated' | 'deleted'): void {
    this.clearCache(type);
    this.emit('config_changed', { type, id, action, timestamp: Date.now() });
  }
}

// 导出单例实例
export const configService = ConfigService.getInstance();