/**
 * Telegram机器人初始化模块
 * 负责处理各种初始化逻辑
 */
import TelegramBot from 'node-telegram-bot-api';
import { createBotLogger } from '../../../utils/logger';
import { configService, type TelegramBotConfig, type TronNetworkConfig } from '../../config/ConfigService.js';
import { CallbackHandler } from '../callbacks/CallbackHandler.js';
import { CommandHandler } from '../commands/CommandHandler.js';
import { KeyboardBuilder } from '../keyboards/KeyboardBuilder.js';
import type { BotConfig } from '../types/bot.types.js';
import { BotUtils } from '../utils/BotUtils.js';

export class TelegramBotInitializer {
  /**
   * 使用指定配置初始化机器人（多机器人支持）
   */
  static async initializeWithConfig(
    botConfig: TelegramBotConfig,
    config: BotConfig,
    context: {
      setBotConfig: (config: TelegramBotConfig) => void;
      setBotId: (id: string) => void;
      setNetworks: (networks: TronNetworkConfig[]) => void;
      setFileLogger: (logger: any) => void;
      setIsInitialized: (initialized: boolean) => void;
      logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
      createBotInstance: (token: string, options: any) => TelegramBot;
      createHandlers: (bot: TelegramBot, botId: string) => {
        commandHandler: CommandHandler;
        callbackHandler: CallbackHandler;
        keyboardBuilder: KeyboardBuilder;
        botUtils: BotUtils;
      };
      setupHandlers: () => void;
      setupErrorHandling: () => void;
    }
  ): Promise<void> {
    try {
      console.log(`🔧 使用指定配置初始化机器人: ${botConfig.botName}`);
      
      // 设置机器人配置
      context.setBotConfig(botConfig);
      context.setBotId(botConfig.id);
      context.setNetworks(botConfig.networks || []);
      
      // 创建文件日志记录器
      const fileLogger = createBotLogger(botConfig.id);
      context.setFileLogger(fileLogger);

      // 更新配置
      config.token = botConfig.botToken;
      
      // 根据工作模式配置机器人
      const workMode = botConfig.workMode || 'polling';
      
      let bot: TelegramBot;
      if (workMode === 'webhook') {
        config.polling = false;
        config.webhook = true;
        // Webhook模式下不启用轮询
        bot = context.createBotInstance(config.token, { 
          polling: false,
          webHook: false  // 暂不自动设置webhook，由管理员手动配置
        });
      } else {
        config.polling = true;
        config.webhook = false;
        // Polling模式
        bot = context.createBotInstance(config.token, { 
          polling: config.polling 
        });
      }

      // 创建各个处理模块
      const handlers = context.createHandlers(bot, botConfig.id);

      // 设置处理器
      context.setupHandlers();
      context.setupErrorHandling();

      context.setIsInitialized(true);
      console.log(`✅ 机器人已使用指定配置初始化: ${botConfig.botName}`);
      
      // 记录机器人启动日志
      await context.logBotActivity('info', 'bot_initialized_with_config', `机器人已使用指定配置初始化: ${botConfig.botName}`);
      
    } catch (error) {
      console.error(`❌ 使用指定配置初始化机器人失败: ${botConfig.botName}`, error);
      throw error;
    }
  }

  /**
   * 从数据库初始化机器人配置（单机器人模式，向后兼容）
   */
  static async initializeFromDatabase(
    config: BotConfig,
    context: {
      setBotConfig: (config: TelegramBotConfig) => void;
      setBotId: (id: string) => void;
      setNetworks: (networks: TronNetworkConfig[]) => void;
      setFileLogger: (logger: any) => void;
      setIsInitialized: (initialized: boolean) => void;
      logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
      createBotInstance: (token: string, options: any) => TelegramBot;
      createHandlers: (bot: TelegramBot, botId: string) => {
        commandHandler: CommandHandler;
        callbackHandler: CallbackHandler;
        keyboardBuilder: KeyboardBuilder;
        botUtils: BotUtils;
      };
      setupHandlers: () => void;
      setupErrorHandling: () => void;
      setupConfigChangeListener: () => void;
      initializeFromEnv: () => Promise<void>;
    }
  ): Promise<void> {
    try {
      // 获取活跃的机器人配置
      const activeBots = await configService.getActiveBotConfigs();
      
      if (activeBots.length === 0) {
        console.warn('未找到活跃的机器人配置，使用环境变量配置');
        await context.initializeFromEnv();
        return;
      }

      // 使用第一个活跃的机器人配置
      const botConfig = activeBots[0];
      context.setBotConfig(botConfig);
      context.setBotId(botConfig.id);
      context.setNetworks(botConfig.networks);
      
      // 创建文件日志记录器
      const fileLogger = createBotLogger(botConfig.id);
      context.setFileLogger(fileLogger);

      // 更新配置
      config.token = botConfig.botToken;
      
      // 根据工作模式配置机器人
      const workMode = botConfig.workMode || 'polling';
      
      let bot: TelegramBot;
      if (workMode === 'webhook') {
        config.polling = false;
        config.webhook = true;
        // Webhook模式下不启用轮询
        bot = context.createBotInstance(config.token, { 
          polling: false,
          webHook: false  // 暂不自动设置webhook，由管理员手动配置
        });
      } else {
        config.polling = true;
        config.webhook = false;
        // Polling模式
        bot = context.createBotInstance(config.token, { 
          polling: config.polling 
        });
      }

      // 创建各个处理模块
      const handlers = context.createHandlers(bot, botConfig.id || 'unknown');

      // 设置处理器
      context.setupHandlers();
      context.setupErrorHandling();
      context.setupConfigChangeListener();

      context.setIsInitialized(true);
      console.log(`✅ 机器人已从数据库配置初始化: ${botConfig.botName}`);
      
      // 记录机器人启动日志
      await context.logBotActivity('info', 'bot_initialized', `机器人已从数据库配置初始化: ${botConfig.botName}`);
      
    } catch (error) {
      console.error('从数据库初始化机器人配置失败:', error);
      console.log('回退到环境变量配置...');
      try {
        await context.initializeFromEnv();
      } catch (envError) {
        console.error('环境变量配置也失败:', envError);
        console.warn('⚠️ 机器人服务完全不可用，但应用将继续运行');
        context.setIsInitialized(true); // 标记为已初始化，避免无限等待
      }
    }
  }

  /**
   * 从环境变量初始化（回退方案）
   */
  static async initializeFromEnv(
    config: BotConfig,
    context: {
      setIsInitialized: (initialized: boolean) => void;
      createBotInstance: (token: string, options: any) => TelegramBot;
      createHandlers: (bot: TelegramBot, botId: string) => {
        commandHandler: CommandHandler;
        callbackHandler: CallbackHandler;
        keyboardBuilder: KeyboardBuilder;
        botUtils: BotUtils;
      };
      setupHandlers: () => void;
      setupErrorHandling: () => void;
    }
  ): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('⚠️ 未找到TELEGRAM_BOT_TOKEN环境变量，机器人服务将不可用');
      context.setIsInitialized(true); // 标记为已初始化，避免无限等待
      return;
    }

    config.token = token;

    // 初始化机器人实例
    const bot = context.createBotInstance(token, { 
      polling: config.polling 
    });

    // 创建各个处理模块
    const handlers = context.createHandlers(bot, 'unknown');

    // 设置处理器
    context.setupHandlers();
    context.setupErrorHandling();

    context.setIsInitialized(true);
    console.log('✅ 机器人已从环境变量配置初始化');
  }

  /**
   * 等待初始化完成并返回初始化状态
   */
  static async waitForInitialization(
    getInitializationStatus: () => { isInitialized: boolean; bot: TelegramBot | null; token: string }
  ): Promise<boolean> {
    while (!getInitializationStatus().isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 检查机器人是否正确初始化
    const status = getInitializationStatus();
    if (!status.bot || status.token === 'temp-token') {
      return false;
    }
    
    return true;
  }
}
