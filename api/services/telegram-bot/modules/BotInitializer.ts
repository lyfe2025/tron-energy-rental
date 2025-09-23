/**
 * 机器人初始化模块
 * 负责机器人的初始化和配置加载
 */
import TelegramBot from 'node-telegram-bot-api';
import { createBotLogger } from '../../../utils/logger.ts';
import { configService, type TelegramBotConfig, type TronNetworkConfig } from '../../config/ConfigService.ts';
import type { BotConfig } from '../types/bot.types.ts';

export class BotInitializer {
  private botConfig: TelegramBotConfig | null = null;
  private networks: TronNetworkConfig[] = [];
  private botId: string | null = null;
  private fileLogger: any = null;
  private isInitialized: boolean = false;

  /**
   * 从数据库初始化机器人配置
   */
  async initializeFromDatabase(config: BotConfig): Promise<{
    bot: TelegramBot;
    botConfig: TelegramBotConfig | null;
    networks: TronNetworkConfig[];
    botId: string | null;
    fileLogger: any;
    isInitialized: boolean;
  }> {
    try {
      // 获取活跃的机器人配置
      const activeBots = await configService.getActiveBotConfigs();
      
      if (activeBots.length === 0) {
        console.warn('未找到活跃的机器人配置，使用环境变量配置');
        const envResult = await this.initializeFromEnv(config);
        return {
          ...envResult,
          botConfig: this.botConfig,
          networks: this.networks,
          botId: this.botId,
          fileLogger: this.fileLogger,
          isInitialized: this.isInitialized
        };
      }

      // 使用第一个活跃的机器人配置
      this.botConfig = activeBots[0];
      this.botId = this.botConfig.id;
      this.networks = this.botConfig.networks;
      
      // 创建文件日志记录器
      this.fileLogger = createBotLogger(this.botId);

      // 更新配置
      config.token = this.botConfig.botToken;
      
      // 根据工作模式配置机器人
      const workMode = this.botConfig.workMode || 'polling';
      
      let bot: TelegramBot;
      if (workMode === 'webhook') {
        config.polling = false;
        config.webhook = true;
        // Webhook模式下不启用轮询
        bot = new TelegramBot(config.token, { 
          polling: false,
          webHook: false  // 暂不自动设置webhook，由管理员手动配置
        });
      } else {
        config.polling = true;
        config.webhook = false;
        // Polling模式
        bot = new TelegramBot(config.token, { 
          polling: config.polling 
        });
      }

      this.isInitialized = true;
      console.log(`✅ 机器人已从数据库配置初始化: ${this.botConfig.botName}`);
      
      return {
        bot,
        botConfig: this.botConfig,
        networks: this.networks,
        botId: this.botId,
        fileLogger: this.fileLogger,
        isInitialized: this.isInitialized
      };
      
    } catch (error) {
      console.error('从数据库初始化机器人配置失败:', error);
      console.log('回退到环境变量配置...');
      try {
        const envResult = await this.initializeFromEnv(config);
        return {
          ...envResult,
          botConfig: this.botConfig,
          networks: this.networks,
          botId: this.botId,
          fileLogger: this.fileLogger,
          isInitialized: this.isInitialized
        };
      } catch (envError) {
        console.error('环境变量配置也失败:', envError);
        console.warn('⚠️ 机器人服务完全不可用，但应用将继续运行');
        this.isInitialized = true; // 标记为已初始化，避免无限等待
        
        // 返回一个空的bot实例，避免错误
        const dummyBot = new TelegramBot('dummy-token', { polling: false });
        return {
          bot: dummyBot,
          botConfig: this.botConfig,
          networks: this.networks,
          botId: this.botId,
          fileLogger: this.fileLogger,
          isInitialized: this.isInitialized
        };
      }
    }
  }

  /**
   * 从环境变量初始化（回退方案）
   */
  private async initializeFromEnv(config: BotConfig): Promise<{ bot: TelegramBot }> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('⚠️ 未找到TELEGRAM_BOT_TOKEN环境变量，机器人服务将不可用');
      this.isInitialized = true; // 标记为已初始化，避免无限等待
      const dummyBot = new TelegramBot('dummy-token', { polling: false });
      return { bot: dummyBot };
    }

    config.token = token;

    // 初始化机器人实例
    const bot = new TelegramBot(token, { 
      polling: config.polling 
    });

    this.isInitialized = true;
    console.log('✅ 机器人已从环境变量配置初始化');
    
    return { bot };
  }

  /**
   * 等待初始化完成
   */
  async waitForInitialization(): Promise<void> {
    while (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Getter方法
  getBotConfig(): TelegramBotConfig | null {
    return this.botConfig;
  }

  getNetworks(): TronNetworkConfig[] {
    return this.networks;
  }

  getBotId(): string | null {
    return this.botId;
  }

  getFileLogger(): any {
    return this.fileLogger;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}
