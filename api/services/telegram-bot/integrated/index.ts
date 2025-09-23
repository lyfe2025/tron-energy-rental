/**
 * Telegram机器人集成服务 - 重构后的主入口
 * 整合所有模块，提供统一的服务接口
 */
import TelegramBot from 'node-telegram-bot-api';
import { ConfigAdapter } from './adapters/ConfigAdapter.ts';
import { DatabaseAdapter } from './adapters/DatabaseAdapter.ts';
import { BotOrchestrator } from './components/BotOrchestrator.ts';
import { ModuleManager } from './components/ModuleManager.ts';
import type { BotConfig } from './types/bot.types.ts';

export class TelegramBotServiceIntegrated {
  private bot: TelegramBot;
  private config: BotConfig;
  private isInitialized: boolean = false;
  private botId: string | null = null;

  // 核心组件
  private moduleManager: ModuleManager;
  private orchestrator: BotOrchestrator;
  private configAdapter: ConfigAdapter;
  private databaseAdapter: DatabaseAdapter;

  // 模块实例（通过模块管理器获取）
  private modules: any = {};

  constructor(config?: Partial<BotConfig>) {
    // 临时配置，实际配置将从数据库加载
    this.config = {
      token: config?.token || 'temp-token',
      polling: config?.polling !== false,
      webhook: false,
      ...config
    } as BotConfig;

    // 初始化适配器
    this.configAdapter = new ConfigAdapter();
    this.databaseAdapter = DatabaseAdapter.getInstance();

    // 创建临时bot实例
    this.bot = new TelegramBot(this.config.token, { polling: false });
  }

  /**
   * 从数据库初始化机器人
   */
  async initializeFromDatabase(token: string): Promise<void> {
    try {
      console.log('🚀 开始从数据库初始化机器人...');

      // 1. 从数据库加载配置
      const dbData = await this.databaseAdapter.getBotConfigByToken(token);
      if (!dbData) {
        throw new Error('机器人配置不存在');
      }

      // 2. 转换配置格式
      this.config = ConfigAdapter.convertDatabaseConfig(dbData.bot, dbData.network);
      this.botId = this.config.botId!;

      // 3. 验证配置
      const validation = ConfigAdapter.validateConfig(this.config);
      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ 配置警告:', validation.warnings);
      }

      // 4. 创建新的bot实例
      this.bot = new TelegramBot(this.config.token, { polling: false });

      // 5. 初始化模块管理器
      this.moduleManager = new ModuleManager(this.bot, this.config);

      // 6. 初始化所有模块
      this.modules = await this.moduleManager.initializeModules();

      // 7. 创建协调器
      this.orchestrator = new BotOrchestrator(this.bot, this.config, this.modules);

      // 8. 更新状态
      this.isInitialized = true;
      await this.databaseAdapter.updateBotStatus(this.botId, 'initialized');

      console.log(`✅ 机器人初始化成功: ${this.config.name} (@${this.config.username})`);

    } catch (error) {
      console.error('❌ 机器人初始化失败:', error);
      
      if (this.botId) {
        await this.databaseAdapter.updateBotStatus(this.botId, 'error', {
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
      
      throw error;
    }
  }

  /**
   * 启动机器人
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('机器人未初始化，请先调用 initializeFromDatabase');
    }

    try {
      console.log(`🚀 启动机器人: ${this.config.name}`);

      // 启动协调器
      await this.orchestrator.start();

      // 更新状态
      await this.databaseAdapter.updateBotStatus(this.botId!, 'running');
      await this.databaseAdapter.logBotActivity(this.botId!, 'start', '机器人启动');

      console.log(`✅ 机器人启动成功: ${this.config.name}`);

    } catch (error) {
      console.error('❌ 机器人启动失败:', error);
      
      await this.databaseAdapter.updateBotStatus(this.botId!, 'error', {
        error: error instanceof Error ? error.message : '未知错误'
      });
      
      throw error;
    }
  }

  /**
   * 停止机器人
   */
  async stop(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log(`🛑 停止机器人: ${this.config.name}`);

      // 停止协调器
      if (this.orchestrator) {
        await this.orchestrator.stop();
      }

      // 关闭模块
      if (this.moduleManager) {
        await this.moduleManager.shutdownModules();
      }

      // 更新状态
      if (this.botId) {
        await this.databaseAdapter.updateBotStatus(this.botId, 'stopped');
        await this.databaseAdapter.logBotActivity(this.botId, 'stop', '机器人停止');
      }

      console.log(`✅ 机器人停止成功: ${this.config.name}`);

    } catch (error) {
      console.error('❌ 机器人停止失败:', error);
      throw error;
    }
  }

  /**
   * 重启机器人
   */
  async restart(): Promise<void> {
    console.log(`🔄 重启机器人: ${this.config.name}`);
    
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    await this.start();
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId: number, text: string, options?: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('机器人未初始化');
    }

    try {
      const result = await this.bot.sendMessage(chatId, text, options);
      
      // 记录活动
      await this.databaseAdapter.updateLastActivity(this.botId!);
      await this.databaseAdapter.incrementMessageCount(this.botId!);
      
      return result;
    } catch (error) {
      await this.databaseAdapter.incrementErrorCount(this.botId!);
      throw error;
    }
  }

  /**
   * 编辑消息
   */
  async editMessageText(text: string, options?: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('机器人未初始化');
    }

    try {
      const result = await this.bot.editMessageText(text, options);
      await this.databaseAdapter.updateLastActivity(this.botId!);
      return result;
    } catch (error) {
      await this.databaseAdapter.incrementErrorCount(this.botId!);
      throw error;
    }
  }

  /**
   * 回答回调查询
   */
  async answerCallbackQuery(callbackQueryId: string, options?: any): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('机器人未初始化');
    }

    try {
      const result = await this.bot.answerCallbackQuery(callbackQueryId, options);
      await this.databaseAdapter.updateLastActivity(this.botId!);
      return result;
    } catch (error) {
      await this.databaseAdapter.incrementErrorCount(this.botId!);
      throw error;
    }
  }

  /**
   * 获取机器人信息
   */
  async getMe(): Promise<any> {
    return this.bot.getMe();
  }

  /**
   * 获取配置
   */
  getConfig(): BotConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: Partial<BotConfig>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('机器人未初始化');
    }

    await this.orchestrator.updateConfig(newConfig);
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取键盘构建器
   */
  getKeyboardBuilder(): any {
    return this.modules.keyboardBuilder;
  }

  /**
   * 获取命令处理器
   */
  getCommandHandler(): any {
    return this.modules.commandHandler;
  }

  /**
   * 获取回调处理器
   */
  getCallbackHandler(): any {
    return this.modules.callbackHandler;
  }

  /**
   * 检查是否初始化
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 检查是否运行中
   */
  isServiceRunning(): boolean {
    return this.orchestrator?.isOrchestratorRunning() || false;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<any> {
    if (!this.isInitialized) {
      return { initialized: false };
    }

    const [orchestratorStats, moduleStats, dbStats] = await Promise.all([
      this.orchestrator.getStats(),
      Promise.resolve(this.moduleManager.getModuleStats()),
      this.databaseAdapter.getBotStats(this.botId!)
    ]);

    return {
      initialized: true,
      running: this.isServiceRunning(),
      orchestrator: orchestratorStats,
      modules: moduleStats,
      database: dbStats,
      config: ConfigAdapter.sanitizeConfig(this.config)
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      if (!this.isInitialized) {
        return {
          status: 'unhealthy',
          details: { error: '机器人未初始化' }
        };
      }

      const [orchestratorHealth, moduleHealth, dbHealth] = await Promise.all([
        this.orchestrator.healthCheck(),
        this.moduleManager.getAllModulesHealth(),
        this.databaseAdapter.healthCheck()
      ]);

      const isHealthy = orchestratorHealth.status === 'healthy' && 
                       dbHealth.connected &&
                       Object.values(moduleHealth).every(health => health === 'healthy');

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          orchestrator: orchestratorHealth,
          modules: moduleHealth,
          database: dbHealth,
          lastCheck: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        }
      };
    }
  }

  /**
   * 刷新配置
   */
  async refreshConfig(): Promise<void> {
    if (!this.isInitialized || !this.botId) {
      throw new Error('机器人未初始化');
    }

    try {
      // 从数据库重新加载配置
      const dbData = await this.databaseAdapter.getBotConfigById(this.botId);
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
      const changes = this.configAdapter.detectConfigChanges(this.config, newConfig);
      
      if (changes.hasChanges) {
        console.log(`🔄 检测到配置变更: ${changes.changes.join(', ')}`);
        
        // 如果有关键变更，需要重启
        if (changes.criticalChanges.length > 0) {
          console.log(`⚠️ 检测到关键配置变更，将重启机器人: ${changes.criticalChanges.join(', ')}`);
          
          this.config = newConfig;
          await this.restart();
        } else {
          // 非关键变更，只更新配置
          await this.updateConfig(newConfig);
        }
      }

    } catch (error) {
      console.error('刷新配置失败:', error);
      throw error;
    }
  }
}

// 兼容性导出
export { TelegramBotServiceIntegrated as TelegramBotService };
