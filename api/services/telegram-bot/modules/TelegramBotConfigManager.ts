/**
 * Telegram机器人配置管理模块
 * 负责配置的监听、更新和获取
 */
import { configService, type TelegramBotConfig, type TronNetworkConfig } from '../../config/ConfigService.js';

export class TelegramBotConfigManager {
  private botConfig: TelegramBotConfig | null = null;
  private networks: TronNetworkConfig[] = [];

  constructor(
    private context: {
      stop: () => Promise<void>;
    }
  ) {}

  /**
   * 设置机器人配置
   */
  setBotConfig(config: TelegramBotConfig | null): void {
    this.botConfig = config;
  }

  /**
   * 设置网络配置
   */
  setNetworks(networks: TronNetworkConfig[]): void {
    this.networks = networks;
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
   * 设置配置变更监听器
   */
  setupConfigChangeListener(onReload: () => Promise<void>): void {
    configService.onConfigChange(async (event) => {
      if (event.type === 'telegram_bots') {
        console.log('检测到机器人配置变更，重新加载配置...');
        await onReload();
      }
    });
  }

  /**
   * 重新加载配置
   */
  async reloadConfiguration(): Promise<void> {
    try {
      if (!this.botConfig) {
        return;
      }

      // 重新获取机器人配置
      const updatedBot = await configService.getTelegramBotById(this.botConfig.id);
      if (!updatedBot) {
        console.error('无法找到机器人配置，停止服务');
        await this.context.stop();
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
}
