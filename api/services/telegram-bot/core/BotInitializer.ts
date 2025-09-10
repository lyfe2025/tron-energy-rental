/**
 * 机器人初始化器
 * 负责从数据库或环境变量初始化机器人配置
 */
import TelegramBot from 'node-telegram-bot-api';
import * as winston from 'winston';
import { query } from '../../../config/database.js';
import type { TelegramBotConfig, TronNetworkConfig } from '../../config/ConfigService.js';
import type { BotConfig } from '../types/bot.types.js';

export class BotInitializer {
  /**
   * 从数据库初始化机器人配置
   */
  static async initializeFromDatabase(
    config: BotConfig,
    callbacks: {
      setBotConfig: (config: TelegramBotConfig | null) => void;
      setBotId: (id: string | null) => void;
      setNetworks: (networks: TronNetworkConfig[]) => void;
      setFileLogger: (logger: winston.Logger) => void;
      setIsInitialized: (initialized: boolean) => void;
      logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, metadata?: any) => Promise<void>;
      createBotInstance: (token: string, options: any) => TelegramBot;
      createHandlers: (bot: TelegramBot, botId: string) => any;
      setupHandlers: () => void;
      setupErrorHandling: () => void;
      setupConfigChangeListener?: () => void;
      initializeFromEnv?: () => Promise<void>;
    }
  ): Promise<void> {
    try {
      console.log('🚀 正在从数据库初始化机器人配置...');

      // 从数据库获取激活的机器人配置
      const botResult = await query(
        'SELECT * FROM telegram_bots WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
      );

      if (botResult.rows.length === 0) {
        console.log('⚠️ 数据库中未找到激活的机器人配置，尝试从环境变量初始化...');
        if (callbacks.initializeFromEnv) {
          await callbacks.initializeFromEnv();
        }
        return;
      }

      const botData = botResult.rows[0];
      const botConfig: TelegramBotConfig = {
        id: botData.id,
        botName: botData.bot_name,
        botToken: botData.bot_token,
        botUsername: botData.bot_username,
        description: botData.description,
        isActive: botData.is_active,
        networkId: botData.network_id,
        workMode: botData.work_mode || 'polling',
        webhookUrl: botData.webhook_url,
        webhookSecret: botData.webhook_secret,
        maxConnections: botData.max_connections || 40,
        welcomeMessage: botData.welcome_message,
        helpMessage: botData.help_message,
        customCommands: botData.custom_commands ? 
          (typeof botData.custom_commands === 'string' ? 
            JSON.parse(botData.custom_commands) : 
            botData.custom_commands) : [],
        menuButtonEnabled: botData.menu_button_enabled || false,
        menuButtonText: botData.menu_button_text || '菜单',
        menuType: botData.menu_type || 'commands',
        webAppUrl: botData.web_app_url,
        menuCommands: botData.menu_commands ? 
          (typeof botData.menu_commands === 'string' ? 
            JSON.parse(botData.menu_commands) : 
            botData.menu_commands) : [],
        keyboardConfig: botData.keyboard_config || null,
        
        // 必需的默认属性
        networkConfig: {},
        webhookConfig: {},
        messageTemplates: {},
        rateLimits: {},
        securitySettings: {},
        config: {},
        healthStatus: 'unknown'
      };

      callbacks.setBotConfig(botConfig);
      callbacks.setBotId(botConfig.id);

      // 获取网络配置
      const networksResult = await query('SELECT * FROM tron_networks WHERE is_active = true');
      const networks: TronNetworkConfig[] = networksResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        fullNode: row.full_node,
        solidityNode: row.solidity_node,
        eventServer: row.event_server,
        privateKey: row.private_key,
        address: row.address,
        isDefault: row.is_default,
        isActive: row.is_active
      }));

      callbacks.setNetworks(networks);

      // 设置文件日志器
      const fileLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          })
        ),
        transports: [
          new winston.transports.File({ 
            filename: `logs/bots/bot-${botConfig.id}-${new Date().toISOString().split('T')[0]}.log`,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 7
          })
        ]
      });

      callbacks.setFileLogger(fileLogger);

      // 创建机器人实例
      const bot = callbacks.createBotInstance(botConfig.botToken, {
        polling: botConfig.workMode === 'polling',
        webHook: botConfig.workMode === 'webhook'
      });

      // 创建处理器
      callbacks.createHandlers(bot, botConfig.id);

      // 设置处理器和错误处理
      callbacks.setupHandlers();
      callbacks.setupErrorHandling();

      // 设置配置变更监听器
      if (callbacks.setupConfigChangeListener) {
        callbacks.setupConfigChangeListener();
      }

      callbacks.setIsInitialized(true);

      console.log(`✅ 机器人配置初始化成功: ${botConfig.botName} (@${botConfig.botUsername})`);
      await callbacks.logBotActivity('info', 'bot_initialized', `机器人配置初始化成功: ${botConfig.botName}`, {
        botId: botConfig.id,
        username: botConfig.botUsername,
        workMode: botConfig.workMode
      });

    } catch (error) {
      console.error('从数据库初始化机器人配置失败:', error);
      await callbacks.logBotActivity('error', 'initialization_failed', `机器人初始化失败: ${error.message}`, {
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 使用指定配置初始化机器人
   */
  static async initializeWithConfig(
    botConfig: TelegramBotConfig,
    config: BotConfig,
    callbacks: {
      setBotConfig: (config: TelegramBotConfig | null) => void;
      setBotId: (id: string | null) => void;
      setNetworks: (networks: TronNetworkConfig[]) => void;
      setFileLogger: (logger: winston.Logger) => void;
      setIsInitialized: (initialized: boolean) => void;
      logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, metadata?: any) => Promise<void>;
      createBotInstance: (token: string, options: any) => TelegramBot;
      createHandlers: (bot: TelegramBot, botId: string) => any;
      setupHandlers: () => void;
      setupErrorHandling: () => void;
    }
  ): Promise<void> {
    try {
      console.log(`🚀 使用指定配置初始化机器人: ${botConfig.botName}`);

      callbacks.setBotConfig(botConfig);
      callbacks.setBotId(botConfig.id);

      // 获取网络配置
      const networksResult = await query('SELECT * FROM tron_networks WHERE is_active = true');
      const networks: TronNetworkConfig[] = networksResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        fullNode: row.full_node,
        solidityNode: row.solidity_node,
        eventServer: row.event_server,
        privateKey: row.private_key,
        address: row.address,
        isDefault: row.is_default,
        isActive: row.is_active
      }));

      callbacks.setNetworks(networks);

      // 设置文件日志器
      const fileLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          })
        ),
        transports: [
          new winston.transports.File({ 
            filename: `logs/bots/bot-${botConfig.id}-${new Date().toISOString().split('T')[0]}.log`,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 7
          })
        ]
      });

      callbacks.setFileLogger(fileLogger);

      // 创建机器人实例
      const bot = callbacks.createBotInstance(botConfig.botToken, {
        polling: botConfig.workMode === 'polling',
        webHook: botConfig.workMode === 'webhook'
      });

      // 创建处理器
      callbacks.createHandlers(bot, botConfig.id);

      // 设置处理器和错误处理
      callbacks.setupHandlers();
      callbacks.setupErrorHandling();

      callbacks.setIsInitialized(true);

      console.log(`✅ 机器人配置初始化成功: ${botConfig.botName}`);
      await callbacks.logBotActivity('info', 'bot_initialized', `机器人配置初始化成功: ${botConfig.botName}`, {
        botId: botConfig.id,
        username: botConfig.botUsername,
        workMode: botConfig.workMode
      });

    } catch (error) {
      console.error('使用指定配置初始化机器人失败:', error);
      await callbacks.logBotActivity('error', 'initialization_failed', `机器人初始化失败: ${error.message}`, {
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 从环境变量初始化（回退方案）
   */
  static async initializeFromEnv(
    config: BotConfig,
    callbacks: {
      setIsInitialized: (initialized: boolean) => void;
      createBotInstance: (token: string, options: any) => TelegramBot;
      createHandlers: (bot: TelegramBot, botId: string) => any;
      setupHandlers: () => void;
      setupErrorHandling: () => void;
    }
  ): Promise<void> {
    try {
      const envToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!envToken) {
        throw new Error('未配置环境变量 TELEGRAM_BOT_TOKEN');
      }

      console.log('🔄 从环境变量初始化机器人...');
      
      // 创建机器人实例
      const bot = callbacks.createBotInstance(envToken, {
        polling: config.polling !== false
      });

      // 创建处理器
      callbacks.createHandlers(bot, 'env-bot');

      // 设置处理器和错误处理
      callbacks.setupHandlers();
      callbacks.setupErrorHandling();

      callbacks.setIsInitialized(true);

      console.log('✅ 从环境变量初始化机器人成功');

    } catch (error) {
      console.error('从环境变量初始化机器人失败:', error);
      throw error;
    }
  }

  /**
   * 等待初始化完成
   */
  static async waitForInitialization(
    getStatus: () => {
      isInitialized: boolean;
      bot: TelegramBot | null;
      token: string;
    },
    maxWaitTime: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = getStatus();
      
      if (status.isInitialized && status.bot) {
        return true;
      }
      
      if (status.token === 'temp-token') {
        console.log('⏳ 等待从数据库加载配置...');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.warn('⚠️ 机器人初始化超时');
    return false;
  }
}
