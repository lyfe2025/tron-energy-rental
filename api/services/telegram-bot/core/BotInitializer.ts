/**
 * 机器人初始化器
 * 负责机器人的初始化流程，包括配置加载、验证、实例创建等
 */
import TelegramBot from 'node-telegram-bot-api';
import { ConfigAdapter } from '../integrated/adapters/ConfigAdapter.js';
import { DatabaseAdapter } from '../integrated/adapters/DatabaseAdapter.js';
import { BotOrchestrator } from '../integrated/components/BotOrchestrator.js';
import { ModuleManager } from '../integrated/components/ModuleManager.js';
import type { BotConfig } from '../integrated/types/bot.types.js';

export interface InitializationResult {
  success: boolean;
  bot?: TelegramBot;
  config?: BotConfig;
  moduleManager?: ModuleManager;
  orchestrator?: BotOrchestrator;
  botId?: string;
  error?: string;
}

export class BotInitializer {
  private databaseAdapter: DatabaseAdapter;
  private configAdapter: ConfigAdapter;

  constructor() {
    this.databaseAdapter = DatabaseAdapter.getInstance();
    this.configAdapter = new ConfigAdapter();
  }

  /**
   * 从数据库初始化机器人
   */
  async initializeFromDatabase(token: string): Promise<InitializationResult> {
    try {
      console.log('🚀 开始从数据库初始化机器人...');

      // 1. 从数据库加载配置
      const dbData = await this.databaseAdapter.getBotConfigByToken(token);
      if (!dbData) {
        throw new Error('机器人配置不存在');
      }

      // 2. 转换配置格式
      const config = ConfigAdapter.convertDatabaseConfig(dbData.bot, dbData.network);
      const botId = config.botId!;

      // 3. 验证配置
      const validation = ConfigAdapter.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ 配置警告:', validation.warnings);
      }

      // 4. 创建新的bot实例
      const bot = new TelegramBot(config.token, { polling: false });

      // 5. 初始化模块管理器
      const moduleManager = new ModuleManager(bot, config);

      // 6. 初始化所有模块
      const modules = await moduleManager.initializeModules();

      // 7. 创建协调器
      const orchestrator = new BotOrchestrator(bot, config, modules);

      // 8. 更新状态
      await this.databaseAdapter.updateBotStatus(botId, 'initialized');

      console.log(`✅ 机器人初始化成功: ${config.name} (@${config.username})`);

      return {
        success: true,
        bot,
        config,
        moduleManager,
        orchestrator,
        botId
      };

    } catch (error) {
      console.error('❌ 机器人初始化失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 初始化基础 bot 实例（用于临时创建）
   */
  createBasicBot(token: string): TelegramBot {
    return new TelegramBot(token, { polling: false });
  }

  /**
   * 验证机器人 token 有效性
   */
  async validateToken(token: string): Promise<{ valid: boolean; botInfo?: any; error?: string }> {
    try {
      const tempBot = this.createBasicBot(token);
      const botInfo = await tempBot.getMe();
      
      return {
        valid: true,
        botInfo
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '无效的 token'
      };
    }
  }

  /**
   * 从配置对象初始化机器人（用于测试或特殊场景）
   */
  async initializeFromConfig(config: BotConfig): Promise<InitializationResult> {
    try {
      console.log('🚀 从配置对象初始化机器人...');

      // 1. 验证配置
      const validation = ConfigAdapter.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      // 2. 创建bot实例
      const bot = new TelegramBot(config.token, { polling: false });

      // 3. 初始化模块管理器
      const moduleManager = new ModuleManager(bot, config);

      // 4. 初始化所有模块
      const modules = await moduleManager.initializeModules();

      // 5. 创建协调器
      const orchestrator = new BotOrchestrator(bot, config, modules);

      console.log(`✅ 机器人从配置初始化成功: ${config.name}`);

      return {
        success: true,
        bot,
        config,
        moduleManager,
        orchestrator,
        botId: config.botId
      };

    } catch (error) {
      console.error('❌ 机器人从配置初始化失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 重新初始化机器人（用于配置更新后）
   */
  async reinitialize(
    currentBot: TelegramBot,
    currentModuleManager: ModuleManager,
    currentOrchestrator: BotOrchestrator,
    newConfig: BotConfig
  ): Promise<InitializationResult> {
    try {
      console.log('🔄 重新初始化机器人...');

      // 1. 停止当前实例
      await currentOrchestrator.stop();
      await currentModuleManager.shutdownModules();

      // 2. 使用新配置初始化
      return await this.initializeFromConfig(newConfig);

    } catch (error) {
      console.error('❌ 机器人重新初始化失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}