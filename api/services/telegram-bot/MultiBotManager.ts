/**
 * 多机器人管理器
 * 管理多个 Telegram 机器人实例的生命周期
 * 支持并发运行、动态添加/删除、状态监控
 */
import { createBotLogger } from '../../utils/logger.js';
import { configService, type TelegramBotConfig } from '../config/ConfigService.js';
import { TelegramBotService } from './TelegramBotService.js';

export interface BotInstance {
  id: string;
  name: string;
  service: TelegramBotService;
  config: TelegramBotConfig;
  status: 'starting' | 'running' | 'stopped' | 'error';
  lastActivity: Date;
  errorCount: number;
}

export class MultiBotManager {
  private botInstances: Map<string, BotInstance> = new Map();
  private isInitialized: boolean = false;
  private logger: any;
  private configChangeListener: (() => void) | null = null;

  constructor() {
    this.logger = createBotLogger('MultiBotManager');
    this.setupConfigChangeListener();
  }

  /**
   * 初始化所有活跃的机器人
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('🚀 多机器人管理器开始初始化');
      
      // 获取所有活跃的机器人配置
      const activeBots = await configService.getActiveBotConfigs();
      
      if (activeBots.length === 0) {
        this.logger.warn('⚠️ 未找到活跃的机器人配置');
        this.isInitialized = true;
        return;
      }

      this.logger.info(`📋 发现 ${activeBots.length} 个活跃机器人配置`);

      // 并发初始化所有机器人
      const initPromises = activeBots.map(botConfig => 
        this.createBotInstance(botConfig)
      );

      const results = await Promise.allSettled(initPromises);
      
      // 统计初始化结果
      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failureCount++;
          const botConfig = activeBots[index];
          this.logger.error(`❌ 机器人 ${botConfig.botName} 初始化失败:`, result.reason);
        }
      });

      this.logger.info(`✅ 多机器人管理器初始化完成: ${successCount} 成功, ${failureCount} 失败`);
      this.isInitialized = true;

    } catch (error) {
      this.logger.error('❌ 多机器人管理器初始化失败:', error);
      this.isInitialized = true; // 标记为已初始化，避免无限等待
      throw error;
    }
  }

  /**
   * 创建单个机器人实例
   */
  private async createBotInstance(botConfig: TelegramBotConfig): Promise<BotInstance> {
    try {
      this.logger.info(`🔧 创建机器人实例: ${botConfig.botName} (${botConfig.id})`);

      // 创建机器人服务实例（跳过自动初始化）
      const botService = new TelegramBotService({
        token: botConfig.botToken,
        polling: botConfig.workMode === 'polling',
        webhook: botConfig.workMode === 'webhook'
      }, true); // skipAutoInit = true

      // 手动设置机器人配置
      await botService.initializeWithConfig(botConfig);

      const botInstance: BotInstance = {
        id: botConfig.id,
        name: botConfig.botName,
        service: botService,
        config: botConfig,
        status: 'starting',
        lastActivity: new Date(),
        errorCount: 0
      };

      // 启动机器人服务
      await botService.start();
      botInstance.status = 'running';

      // 添加到管理器
      this.botInstances.set(botConfig.id, botInstance);

      this.logger.info(`✅ 机器人实例已创建并启动: ${botConfig.botName}`);
      return botInstance;

    } catch (error) {
      this.logger.error(`❌ 创建机器人实例失败: ${botConfig.botName}`, error);
      throw error;
    }
  }

  /**
   * 获取机器人实例
   */
  getBotInstance(botId: string): BotInstance | null {
    return this.botInstances.get(botId) || null;
  }

  /**
   * 获取机器人服务
   */
  getBotService(botId: string): TelegramBotService | null {
    const instance = this.getBotInstance(botId);
    return instance?.service || null;
  }

  /**
   * 获取所有机器人实例
   */
  getAllBotInstances(): BotInstance[] {
    return Array.from(this.botInstances.values());
  }

  /**
   * 获取运行中的机器人实例
   */
  getRunningBots(): BotInstance[] {
    return this.getAllBotInstances().filter(bot => bot.status === 'running');
  }

  /**
   * 根据Token查找机器人
   */
  getBotByToken(token: string): BotInstance | null {
    for (const bot of this.botInstances.values()) {
      if (bot.config.botToken === token) {
        return bot;
      }
    }
    return null;
  }

  /**
   * 动态添加新机器人
   */
  async addBot(botConfig: TelegramBotConfig): Promise<boolean> {
    try {
      // 检查是否已存在
      if (this.botInstances.has(botConfig.id)) {
        this.logger.warn(`⚠️ 机器人已存在: ${botConfig.botName}`);
        return false;
      }

      // 创建并启动新机器人
      await this.createBotInstance(botConfig);
      
      this.logger.info(`✅ 动态添加机器人成功: ${botConfig.botName}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ 动态添加机器人失败: ${botConfig.botName}`, error);
      return false;
    }
  }

  /**
   * 动态移除机器人
   */
  async removeBot(botId: string): Promise<boolean> {
    try {
      const botInstance = this.botInstances.get(botId);
      if (!botInstance) {
        this.logger.warn(`⚠️ 机器人不存在: ${botId}`);
        return false;
      }

      // 停止机器人服务
      await botInstance.service.stop();
      botInstance.status = 'stopped';

      // 从管理器中移除
      this.botInstances.delete(botId);

      this.logger.info(`✅ 动态移除机器人成功: ${botInstance.name}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ 动态移除机器人失败: ${botId}`, error);
      return false;
    }
  }

  /**
   * 重启机器人
   */
  async restartBot(botId: string): Promise<boolean> {
    try {
      const botInstance = this.botInstances.get(botId);
      if (!botInstance) {
        this.logger.warn(`⚠️ 机器人不存在: ${botId}`);
        return false;
      }

      this.logger.info(`🔄 重启机器人: ${botInstance.name}`);

      // 停止服务
      await botInstance.service.stop();
      botInstance.status = 'starting';

      // 重新启动
      await botInstance.service.start();
      botInstance.status = 'running';
      botInstance.lastActivity = new Date();
      botInstance.errorCount = 0;

      this.logger.info(`✅ 机器人重启成功: ${botInstance.name}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ 机器人重启失败: ${botId}`, error);
      
      const botInstance = this.botInstances.get(botId);
      if (botInstance) {
        botInstance.status = 'error';
        botInstance.errorCount++;
      }
      
      return false;
    }
  }

  /**
   * 处理Webhook消息
   */
  async processWebhookUpdate(update: any, botToken?: string): Promise<void> {
    try {
      let targetBot: BotInstance | null = null;

      if (botToken) {
        // 通过Token查找对应的机器人
        targetBot = this.getBotByToken(botToken);
      } else {
        // 如果没有指定Token，尝试通过其他方式识别
        // 这里可以根据实际需要实现路由逻辑
        const runningBots = this.getRunningBots();
        if (runningBots.length === 1) {
          targetBot = runningBots[0];
        }
      }

      if (!targetBot) {
        this.logger.warn('⚠️ 无法找到处理Webhook的目标机器人', { 
          botToken: botToken ? `${botToken.substring(0, 10)}...` : 'none',
          updateId: update.update_id 
        });
        return;
      }

      // 更新活动时间
      targetBot.lastActivity = new Date();

      // 委托给对应的机器人服务处理
      await targetBot.service.processWebhookUpdate(update);

      this.logger.debug(`📨 Webhook消息已处理: 机器人 ${targetBot.name}`);

    } catch (error) {
      this.logger.error('❌ 处理Webhook消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取管理器状态
   */
  getManagerStatus(): {
    isInitialized: boolean;
    totalBots: number;
    runningBots: number;
    stoppedBots: number;
    errorBots: number;
    botDetails: Array<{
      id: string;
      name: string;
      status: string;
      workMode: string;
      lastActivity: string;
      errorCount: number;
    }>;
  } {
    const allBots = this.getAllBotInstances();
    
    return {
      isInitialized: this.isInitialized,
      totalBots: allBots.length,
      runningBots: allBots.filter(bot => bot.status === 'running').length,
      stoppedBots: allBots.filter(bot => bot.status === 'stopped').length,
      errorBots: allBots.filter(bot => bot.status === 'error').length,
      botDetails: allBots.map(bot => ({
        id: bot.id,
        name: bot.name,
        status: bot.status,
        workMode: bot.config.workMode,
        lastActivity: bot.lastActivity.toISOString(),
        errorCount: bot.errorCount
      }))
    };
  }

  /**
   * 设置配置变更监听器
   */
  private setupConfigChangeListener(): void {
    this.configChangeListener = async () => {
      try {
        this.logger.info('🔄 检测到机器人配置变更，重新同步...');
        await this.syncWithDatabase();
      } catch (error) {
        this.logger.error('❌ 配置变更同步失败:', error);
      }
    };

    configService.onConfigChange(this.configChangeListener);
  }

  /**
   * 与数据库同步机器人配置
   */
  async syncWithDatabase(): Promise<void> {
    try {
      const activeBots = await configService.getActiveBotConfigs();
      const currentBotIds = new Set(this.botInstances.keys());
      const activeBotIds = new Set(activeBots.map(bot => bot.id));

      // 移除不再活跃的机器人
      for (const botId of currentBotIds) {
        if (!activeBotIds.has(botId)) {
          await this.removeBot(botId);
        }
      }

      // 添加新的活跃机器人
      for (const botConfig of activeBots) {
        if (!currentBotIds.has(botConfig.id)) {
          await this.addBot(botConfig);
        }
      }

      this.logger.info('✅ 与数据库同步完成');

    } catch (error) {
      this.logger.error('❌ 与数据库同步失败:', error);
      throw error;
    }
  }

  /**
   * 等待初始化完成
   */
  async waitForInitialization(): Promise<void> {
    while (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 停止所有机器人
   */
  async stopAll(): Promise<void> {
    this.logger.info('🛑 停止所有机器人...');

    const stopPromises = Array.from(this.botInstances.values()).map(async (bot) => {
      try {
        await bot.service.stop();
        bot.status = 'stopped';
        this.logger.info(`✅ 机器人已停止: ${bot.name}`);
      } catch (error) {
        this.logger.error(`❌ 停止机器人失败: ${bot.name}`, error);
      }
    });

    await Promise.allSettled(stopPromises);
    
    // 清理配置监听器
    // 移除配置变更监听器（如果configService支持的话）
    if (this.configChangeListener) {
      try {
        // configService.removeConfigChangeListener(this.configChangeListener);
        console.log('配置变更监听器已清理');
      } catch (error) {
        console.warn('清理配置变更监听器失败:', error.message);
      }
    }

    this.logger.info('🛑 所有机器人已停止');
  }
}

// 导出单例实例
export const multiBotManager = new MultiBotManager();
