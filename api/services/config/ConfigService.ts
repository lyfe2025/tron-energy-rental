/**
 * 配置服务（安全分离版本）
 * 主入口类，委托调用各个子服务模块
 * 保持原有API接口完全不变，确保外部调用兼容性
 */

import { EventEmitter } from 'events';

// 导入类型定义
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
  workMode?: 'polling' | 'webhook';
  webhookUrl?: string;
  webhookSecret?: string;
  maxConnections?: number;
  isActive: boolean;
  networkId?: string;
  networkConfig: any;
  webhookConfig: any;
  messageTemplates: any;
  rateLimits: any;
  securitySettings: any;
  config: any;
  healthStatus: string;
  description?: string;
  welcomeMessage?: string;
  helpMessage?: string;
  customCommands?: any;
  keyboardConfig?: any;
  priceConfig?: any;
  menuButtonEnabled?: boolean;
  menuButtonText?: string;
  menuType?: string;
  menuCommands?: any;
  webAppUrl?: string;
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

// 导入分离后的子服务模块
import { BotNetworkConfigService } from './modules/BotNetworkConfigService.ts';
import { ConfigCacheService } from './modules/ConfigCacheService.ts';
import { TelegramBotConfigService } from './modules/TelegramBotConfigService.ts';
import { TronNetworkConfigService } from './modules/TronNetworkConfigService.ts';

/**
 * 配置服务类（安全分离版本）
 */
export class ConfigService extends EventEmitter {
  private static instance: ConfigService;
  private cacheService: ConfigCacheService;
  private tronNetworkService: TronNetworkConfigService;
  private telegramBotService: TelegramBotConfigService;
  private botNetworkService: BotNetworkConfigService;

  private constructor() {
    super();
    
    // 初始化子服务
    this.cacheService = new ConfigCacheService();
    this.tronNetworkService = new TronNetworkConfigService(this.cacheService);
    this.telegramBotService = new TelegramBotConfigService(this.cacheService);
    this.botNetworkService = new BotNetworkConfigService(this.cacheService);
    
    // 传递事件
    this.cacheService.on('cache:refreshed', (data) => {
      this.emit('cache:refreshed', data);
    });
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
   * 获取所有TRON网络配置
   * 委托给 TronNetworkConfigService
   */
  async getTronNetworks(activeOnly: boolean = false): Promise<TronNetworkConfig[]> {
    return this.tronNetworkService.getTronNetworks(activeOnly);
  }

  /**
   * 获取默认TRON网络配置
   * 委托给 TronNetworkConfigService
   */
  async getDefaultTronNetwork(): Promise<TronNetworkConfig | null> {
    return this.tronNetworkService.getDefaultTronNetwork();
  }

  /**
   * 根据ID获取TRON网络配置
   * 委托给 TronNetworkConfigService
   */
  async getTronNetworkById(id: string): Promise<TronNetworkConfig | null> {
    return this.tronNetworkService.getTronNetworkById(id);
  }

  /**
   * 获取所有Telegram机器人配置
   * 委托给 TelegramBotConfigService
   */
  async getTelegramBots(activeOnly: boolean = false): Promise<TelegramBotConfig[]> {
    return this.telegramBotService.getTelegramBots(activeOnly);
  }

  /**
   * 根据ID获取Telegram机器人配置
   * 委托给 TelegramBotConfigService
   */
  async getTelegramBotById(id: string): Promise<TelegramBotConfig | null> {
    return this.telegramBotService.getTelegramBotById(id);
  }

  /**
   * 获取机器人网络配置
   * 委托给 BotNetworkConfigService
   */
  async getBotNetworkConfigs(botId?: string, networkId?: string): Promise<BotNetworkConfig[]> {
    return this.botNetworkService.getBotNetworkConfigs(botId, networkId);
  }

  /**
   * 获取活跃的机器人配置（包含网络信息）
   * 委托给 TelegramBotConfigService
   */
  async getActiveBotConfigs(): Promise<Array<TelegramBotConfig & { networks: TronNetworkConfig[] }>> {
    return this.telegramBotService.getActiveBotConfigs();
  }

  /**
   * 刷新缓存
   * 委托给 ConfigCacheService
   */
  async refreshCache(type?: string): Promise<void> {
    return this.cacheService.refreshCache(type);
  }

  /**
   * 配置变更监听（向后兼容）
   */
  onConfigChange(callback: (event: any) => void): void {
    this.on('cache:refreshed', callback);
  }

  // === 向后兼容的方法，直接暴露缓存服务的加密解密功能 ===
  
  /**
   * 解密敏感信息（向后兼容）
   */
  decrypt(encryptedData: string): string {
    return this.cacheService.decrypt(encryptedData);
  }

  /**
   * 加密敏感信息（向后兼容）
   */
  encrypt(data: string): string {
    return this.cacheService.encrypt(data);
  }

  /**
   * 获取缓存键（向后兼容）
   */
  getCacheKey(type: string, id?: string): string {
    return this.cacheService.getCacheKey(type, id);
  }

  /**
   * 设置缓存（向后兼容）
   */
  setCache(key: string, data: any): void {
    return this.cacheService.setCache(key, data);
  }

  /**
   * 获取缓存（向后兼容）
   */
  getCache(key: string): any {
    return this.cacheService.getCache(key);
  }

  /**
   * 清除缓存（向后兼容）
   */
  clearCache(pattern?: string): void {
    return this.cacheService.clearCache(pattern);
  }
}

// 导出单例实例以保持向后兼容
export const configService = ConfigService.getInstance();