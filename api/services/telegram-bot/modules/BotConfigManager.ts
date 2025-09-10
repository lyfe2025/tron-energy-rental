/**
 * 机器人配置管理模块
 * 负责配置的加载、重载和变更监听
 */
import { configService, type TelegramBotConfig, type TronNetworkConfig } from '../../config/ConfigService.js';

export class BotConfigManager {
  private botConfig: TelegramBotConfig | null = null;
  private networks: TronNetworkConfig[] = [];

  constructor(botConfig: TelegramBotConfig | null, networks: TronNetworkConfig[]) {
    this.botConfig = botConfig;
    this.networks = networks;
  }

  /**
   * 设置配置变更监听器
   */
  setupConfigChangeListener(reloadCallback: () => Promise<void>): void {
    configService.onConfigChange(async (event) => {
      if (event.type === 'telegram_bots') {
        console.log('检测到机器人配置变更，重新加载配置...');
        await reloadCallback();
      }
    });
  }

  /**
   * 重新加载配置
   */
  async reloadConfiguration(stopCallback: () => Promise<void>): Promise<void> {
    try {
      if (!this.botConfig) {
        return;
      }

      // 重新获取机器人配置
      const updatedBot = await configService.getTelegramBotById(this.botConfig.id);
      if (!updatedBot) {
        console.error('无法找到机器人配置，停止服务');
        await stopCallback();
        return;
      }

      // 获取网络配置
      const botNetworkConfigs = await configService.getBotNetworkConfigs(updatedBot.id);
      const networkIds = botNetworkConfigs.map(config => config.networkId);
      const networks = [];
      
      for (const networkId of networkIds) {
        const network = await configService.getTronNetworkById(networkId);
        if (network) {
          networks.push(network);
        }
      }

      // 更新配置
      this.botConfig = updatedBot;
      this.networks = networks;

      console.log('✅ 机器人配置已重新加载');
      
    } catch (error) {
      console.error('重新加载配置失败:', error);
    }
  }

  /**
   * 获取当前机器人配置
   */
  getBotConfig(): TelegramBotConfig | null {
    return this.botConfig;
  }

  /**
   * 获取当前网络配置
   */
  getNetworks(): TronNetworkConfig[] {
    return this.networks;
  }

  /**
   * 获取默认网络配置
   */
  getDefaultNetwork(): TronNetworkConfig | null {
    return this.networks.find(network => network.isDefault) || null;
  }

  /**
   * 根据网络类型获取网络配置
   */
  getNetworkByType(networkType: string): TronNetworkConfig | null {
    return this.networks.find(network => network.networkType === networkType) || null;
  }

  /**
   * 更新配置
   */
  updateConfig(botConfig: TelegramBotConfig, networks: TronNetworkConfig[]): void {
    this.botConfig = botConfig;
    this.networks = networks;
  }

  /**
   * 刷新配置（如果需要）
   */
  async refreshConfigIfNeeded(): Promise<void> {
    // 检查配置是否需要刷新的逻辑
    // 这里可以添加时间戳检查、版本检查等
    console.log('检查配置是否需要刷新...');
    // 如果需要刷新，可以调用 reloadConfiguration
  }
}
