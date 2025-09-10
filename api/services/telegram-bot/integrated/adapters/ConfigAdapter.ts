/**
 * 配置适配器
 * 负责配置的加载、转换和管理
 */
import type { TronNetworkConfig } from '../../../config/ConfigService.js';
import type { BotConfig } from '../types/bot.types.js';

export class ConfigAdapter {
  private configCache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 转换数据库配置为内部配置格式
   */
  static convertDatabaseConfig(
    dbConfig: any,
    networkConfig?: TronNetworkConfig
  ): BotConfig {
    return {
      token: dbConfig.bot_token,
      polling: dbConfig.work_mode === 'polling',
      webhook: dbConfig.work_mode === 'webhook',
      webhookUrl: dbConfig.webhook_url || undefined,
      webhookSecret: dbConfig.webhook_secret || undefined,
      botId: dbConfig.id?.toString() || 'unknown',
      name: dbConfig.name,
      username: dbConfig.bot_username,
      description: dbConfig.description,
      isActive: dbConfig.is_active,
      networkId: dbConfig.network_id,
      
      // 解析JSON配置
      keyboardConfig: this.parseJsonConfig(dbConfig.keyboard_config),
      priceConfig: this.parseJsonConfig(dbConfig.price_config),
      settings: this.parseJsonConfig(dbConfig.settings) || {},
      
      // 网络配置
      networkConfig: networkConfig ? {
        id: parseInt(networkConfig.id),
        name: networkConfig.name,
        apiUrl: networkConfig.rpcUrl,
        apiKey: networkConfig.apiKey || '',
        isTestnet: networkConfig.networkType === 'testnet',
        isActive: networkConfig.isActive
      } : undefined,
      
      // 默认配置
      maxConnections: dbConfig.max_connections || 40,
      welcomeMessage: dbConfig.welcome_message || '欢迎使用TRON能量租赁服务！',
      helpMessage: dbConfig.help_message || '如需帮助，请联系客服。',
      
      // 时间戳
      createdAt: dbConfig.created_at,
      updatedAt: dbConfig.updated_at
    };
  }

  /**
   * 解析JSON配置字段
   */
  private static parseJsonConfig(jsonString: string | object | null): any {
    if (!jsonString) return null;
    
    if (typeof jsonString === 'object') {
      return jsonString;
    }
    
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('解析JSON配置失败:', error);
      return null;
    }
  }

  /**
   * 验证配置完整性
   */
  static validateConfig(config: Partial<BotConfig>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必需字段验证
    if (!config.token) {
      errors.push('机器人Token不能为空');
    }

    if (!config.botId) {
      errors.push('机器人ID不能为空');
    }

    if (!config.name) {
      errors.push('机器人名称不能为空');
    }

    if (!config.username) {
      errors.push('机器人用户名不能为空');
    }

    // 工作模式验证
    if (config.webhook && !config.webhookUrl) {
      errors.push('Webhook模式需要提供webhookUrl');
    }

    if (config.webhook && config.webhookUrl) {
      try {
        const url = new URL(config.webhookUrl);
        if (url.protocol !== 'https:') {
          errors.push('Webhook URL必须使用HTTPS协议');
        }
      } catch (error) {
        errors.push('Webhook URL格式不正确');
      }
    }

    // 网络配置验证
    if (config.networkConfig) {
      if (!config.networkConfig.apiUrl) {
        errors.push('网络配置缺少API URL');
      }
      
      if (!config.networkConfig.apiKey) {
        warnings.push('网络配置缺少API Key，某些功能可能不可用');
      }
      
      if (!config.networkConfig.isActive) {
        warnings.push('网络配置未激活');
      }
    }

    // 配置大小验证
    if (config.keyboardConfig) {
      const configSize = JSON.stringify(config.keyboardConfig).length;
      if (configSize > 64000) { // 64KB限制
        warnings.push('键盘配置过大，可能影响性能');
      }
    }

    if (config.priceConfig) {
      const configSize = JSON.stringify(config.priceConfig).length;
      if (configSize > 64000) { // 64KB限制
        warnings.push('价格配置过大，可能影响性能');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 合并配置
   */
  static mergeConfigs(
    baseConfig: Partial<BotConfig>,
    overrideConfig: Partial<BotConfig>
  ): BotConfig {
    const merged = { ...baseConfig };

    Object.keys(overrideConfig).forEach(key => {
      const typedKey = key as keyof BotConfig;
      const overrideValue = overrideConfig[typedKey];
      
      if (overrideValue !== undefined && overrideValue !== null) {
        if (typeof overrideValue === 'object' && !Array.isArray(overrideValue)) {
          // 深度合并对象
          (merged as any)[typedKey] = {
            ...((merged as any)[typedKey] || {}),
            ...overrideValue
          };
        } else {
          (merged as any)[typedKey] = overrideValue;
        }
      }
    });

    return merged as BotConfig;
  }

  /**
   * 获取默认配置
   */
  static getDefaultConfig(): Partial<BotConfig> {
    return {
      polling: true,
      webhook: false,
      maxConnections: 40,
      isActive: true,
      welcomeMessage: '欢迎使用TRON能量租赁服务！',
      helpMessage: '如需帮助，请联系客服。',
      settings: {
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        enableLogging: true,
        enableMetrics: true
      }
    };
  }

  /**
   * 缓存配置
   */
  cacheConfig(key: string, config: any): void {
    this.configCache.set(key, config);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * 获取缓存的配置
   */
  getCachedConfig(key: string): any | null {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.configCache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    
    return this.configCache.get(key) || null;
  }

  /**
   * 清除缓存
   */
  clearCache(key?: string): void {
    if (key) {
      this.configCache.delete(key);
      this.cacheExpiry.delete(key);
    } else {
      this.configCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * 生成配置哈希（用于变更检测）
   */
  static generateConfigHash(config: Partial<BotConfig>): string {
    const configString = JSON.stringify(config, Object.keys(config).sort());
    // 简单哈希函数
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }

  /**
   * 检测配置变更
   */
  detectConfigChanges(
    oldConfig: Partial<BotConfig>,
    newConfig: Partial<BotConfig>
  ): {
    hasChanges: boolean;
    changes: string[];
    criticalChanges: string[];
  } {
    const changes: string[] = [];
    const criticalChanges: string[] = [];
    const criticalFields = ['token', 'polling', 'webhook', 'webhookUrl', 'isActive'];

    Object.keys(newConfig).forEach(key => {
      const typedKey = key as keyof BotConfig;
      const oldValue = oldConfig[typedKey];
      const newValue = newConfig[typedKey];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push(key);
        
        if (criticalFields.includes(key)) {
          criticalChanges.push(key);
        }
      }
    });

    return {
      hasChanges: changes.length > 0,
      changes,
      criticalChanges
    };
  }

  /**
   * 清理配置（移除敏感信息）
   */
  static sanitizeConfig(config: BotConfig): Partial<BotConfig> {
    const sanitized = { ...config };
    
    // 隐藏敏感信息
    if (sanitized.token) {
      const tokenParts = sanitized.token.split(':');
      if (tokenParts.length === 2) {
        sanitized.token = `${tokenParts[0]}:****`;
      } else {
        sanitized.token = '****';
      }
    }

    if (sanitized.webhookSecret) {
      sanitized.webhookSecret = '****';
    }

    if (sanitized.networkConfig?.apiKey) {
      sanitized.networkConfig = {
        ...sanitized.networkConfig,
        apiKey: '****'
      };
    }

    return sanitized;
  }

  /**
   * 导出配置为JSON
   */
  static exportConfig(config: BotConfig, includeSensitive = false): string {
    const exportConfig = includeSensitive ? config : this.sanitizeConfig(config);
    return JSON.stringify(exportConfig, null, 2);
  }

  /**
   * 从JSON导入配置
   */
  static importConfig(jsonString: string): {
    success: boolean;
    config?: Partial<BotConfig>;
    errors: string[];
  } {
    try {
      const config = JSON.parse(jsonString);
      const validation = this.validateConfig(config);
      
      return {
        success: validation.isValid,
        config: validation.isValid ? config : undefined,
        errors: validation.errors
      };
    } catch (error) {
      return {
        success: false,
        errors: [`JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`]
      };
    }
  }
}
