/**
 * 机器人配置管理器
 * 负责配置的获取、更新、验证和变更检测
 */
import { ConfigAdapter } from '../integrated/adapters/ConfigAdapter.js';
import { DatabaseAdapter } from '../integrated/adapters/DatabaseAdapter.js';
import type { BotConfig } from '../integrated/types/bot.types.js';

export interface ConfigChange {
  hasChanges: boolean;
  changes: string[];
  criticalChanges: string[];
}

export class BotConfigManager {
  private databaseAdapter: DatabaseAdapter;
  private configAdapter: ConfigAdapter;
  private currentConfig: BotConfig | null = null;

  constructor() {
    this.databaseAdapter = DatabaseAdapter.getInstance();
    this.configAdapter = new ConfigAdapter();
  }

  /**
   * 设置当前配置
   */
  setCurrentConfig(config: BotConfig): void {
    this.currentConfig = { ...config };
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): BotConfig | null {
    return this.currentConfig ? { ...this.currentConfig } : null;
  }

  /**
   * 获取配置的安全副本（隐藏敏感信息）
   */
  getSafeConfig(): any {
    if (!this.currentConfig) {
      return null;
    }
    return ConfigAdapter.sanitizeConfig(this.currentConfig);
  }

  /**
   * 从数据库加载配置
   */
  async loadConfigFromDatabase(botId: string): Promise<BotConfig> {
    try {
      const dbData = await this.databaseAdapter.getBotConfigById(botId);
      if (!dbData) {
        throw new Error('机器人配置不存在');
      }

      const config = ConfigAdapter.convertDatabaseConfig(dbData.bot, dbData.network);
      
      // 验证配置
      const validation = ConfigAdapter.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      this.currentConfig = config;
      return config;

    } catch (error) {
      console.error('从数据库加载配置失败:', error);
      throw error;
    }
  }

  /**
   * 从 token 加载配置
   */
  async loadConfigFromToken(token: string): Promise<BotConfig> {
    try {
      const dbData = await this.databaseAdapter.getBotConfigByToken(token);
      if (!dbData) {
        throw new Error('机器人配置不存在');
      }

      const config = ConfigAdapter.convertDatabaseConfig(dbData.bot, dbData.network);
      
      // 验证配置
      const validation = ConfigAdapter.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      this.currentConfig = config;
      return config;

    } catch (error) {
      console.error('从 token 加载配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: Partial<BotConfig>): Promise<void> {
    if (!this.currentConfig) {
      throw new Error('当前配置未加载');
    }

    try {
      // 合并配置
      const updatedConfig = { ...this.currentConfig, ...newConfig };
      
      // 验证新配置
      const validation = ConfigAdapter.validateConfig(updatedConfig);
      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      // 更新当前配置
      this.currentConfig = updatedConfig;

      console.log('✅ 配置更新成功');

    } catch (error) {
      console.error('配置更新失败:', error);
      throw error;
    }
  }

  /**
   * 刷新配置（从数据库重新加载）
   */
  async refreshConfig(): Promise<ConfigChange> {
    if (!this.currentConfig || !this.currentConfig.botId) {
      throw new Error('当前配置未加载或缺少 botId');
    }

    try {
      // 从数据库重新加载配置
      const dbData = await this.databaseAdapter.getBotConfigById(this.currentConfig.botId);
      if (!dbData) {
        throw new Error('机器人配置不存在');
      }

      // 转换和验证新配置
      const newConfig = ConfigAdapter.convertDatabaseConfig(dbData.bot, dbData.network);
      const validation = ConfigAdapter.validateConfig(newConfig);
      
      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      // 检查配置变更
      const changes = this.configAdapter.detectConfigChanges(this.currentConfig, newConfig);
      
      if (changes.hasChanges) {
        console.log(`🔄 检测到配置变更: ${changes.changes.join(', ')}`);
        
        if (changes.criticalChanges.length > 0) {
          console.log(`⚠️ 检测到关键配置变更: ${changes.criticalChanges.join(', ')}`);
        }

        // 更新当前配置
        this.currentConfig = newConfig;
      }

      return changes;

    } catch (error) {
      console.error('刷新配置失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config: BotConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    return ConfigAdapter.validateConfig(config);
  }

  /**
   * 检测配置变更
   */
  detectConfigChanges(oldConfig: BotConfig, newConfig: BotConfig): ConfigChange {
    return this.configAdapter.detectConfigChanges(oldConfig, newConfig);
  }

  /**
   * 保存配置到数据库
   */
  async saveConfigToDatabase(): Promise<void> {
    if (!this.currentConfig || !this.currentConfig.botId) {
      throw new Error('当前配置未加载或缺少 botId');
    }

    try {
      // 这里需要实现将配置保存到数据库的逻辑
      // 由于原始代码中没有直接的保存方法，这里先做一个占位符
      console.log('保存配置到数据库...');
      
      // TODO: 实现配置保存逻辑
      
    } catch (error) {
      console.error('保存配置到数据库失败:', error);
      throw error;
    }
  }

  /**
   * 重置配置到默认值
   */
  resetToDefaults(): void {
    this.currentConfig = null;
  }

  /**
   * 获取配置字段
   */
  getConfigField<K extends keyof BotConfig>(field: K): BotConfig[K] | undefined {
    return this.currentConfig?.[field];
  }

  /**
   * 设置配置字段
   */
  setConfigField<K extends keyof BotConfig>(field: K, value: BotConfig[K]): void {
    if (!this.currentConfig) {
      throw new Error('当前配置未加载');
    }
    this.currentConfig[field] = value;
  }

  /**
   * 检查配置是否已加载
   */
  isConfigLoaded(): boolean {
    return this.currentConfig !== null;
  }

  /**
   * 获取配置摘要信息
   */
  getConfigSummary(): any {
    if (!this.currentConfig) {
      return { loaded: false };
    }

    return {
      loaded: true,
      botId: this.currentConfig.botId,
      name: this.currentConfig.name,
      username: this.currentConfig.username,
      workMode: this.currentConfig.polling ? 'polling' : 'webhook',
      networkId: this.currentConfig.networkId,
      hasWebhook: !!this.currentConfig.webhookUrl,
      lastUpdated: new Date().toISOString()
    };
  }
}
