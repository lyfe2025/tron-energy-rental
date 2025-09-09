/**
 * Telegram机器人主服务
 * 整合命令处理、回调处理、键盘构建等模块
 * 支持从数据库读取配置
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../config/database.js';
import { type TelegramBotConfig, type TronNetworkConfig } from '../config/ConfigService.js';
import { CallbackHandler } from './callbacks/CallbackHandler.js';
import { CommandHandler } from './commands/CommandHandler.js';
import { KeyboardBuilder } from './keyboards/KeyboardBuilder.js';
import type { BotConfig } from './types/bot.types.js';
import { BotUtils } from './utils/BotUtils.js';

// 导入各个模块
import { TelegramBotAPI } from './modules/TelegramBotAPI.js';
import { TelegramBotConfigManager } from './modules/TelegramBotConfigManager.js';
import { TelegramBotInitializer } from './modules/TelegramBotInitializer.js';
import { TelegramBotLogger } from './modules/TelegramBotLogger.js';
import { TelegramBotProcessor } from './modules/TelegramBotProcessor.js';
import { TelegramBotWebhook } from './modules/TelegramBotWebhook.js';
import { TelegramBotWorkMode } from './modules/TelegramBotWorkMode.js';

export class TelegramBotService {
  private bot: TelegramBot;
  private commandHandler: CommandHandler;
  private callbackHandler: CallbackHandler;
  private keyboardBuilder: KeyboardBuilder;
  private botUtils: BotUtils;
  private config: BotConfig;
  private isInitialized: boolean = false;

  // 各个功能模块
  private configManager: TelegramBotConfigManager;
  private logger: TelegramBotLogger;
  private api: TelegramBotAPI;
  private webhook: TelegramBotWebhook;
  private processor: TelegramBotProcessor;
  private workMode: TelegramBotWorkMode;

  constructor(config?: Partial<BotConfig>, skipAutoInit?: boolean) {
    // 临时配置，实际配置将从数据库加载
    this.config = {
      token: config?.token || 'temp-token',
      polling: config?.polling !== false,
      webhook: false,
      ...config
    };

    // 初始化配置管理器
    this.configManager = new TelegramBotConfigManager({
      stop: () => this.stop()
    });

    // 初始化日志记录器
    this.logger = new TelegramBotLogger();

    // 如果不跳过自动初始化，则使用原有逻辑（向后兼容）
    if (!skipAutoInit) {
      // 延迟初始化，等待从数据库加载配置
      this.initializeFromDatabase();
    }
  }

  /**
   * 创建机器人实例的辅助方法
   */
  private createBotInstance(token: string, options: any): TelegramBot {
    this.bot = new TelegramBot(token, options);
    return this.bot;
  }

  /**
   * 创建处理器的辅助方法
   */
  private createHandlers(bot: TelegramBot, botId: string): {
    commandHandler: CommandHandler;
    callbackHandler: CallbackHandler;
    keyboardBuilder: KeyboardBuilder;
    botUtils: BotUtils;
  } {
    this.commandHandler = new CommandHandler(bot);
    this.callbackHandler = new CallbackHandler(bot);
    this.keyboardBuilder = new KeyboardBuilder(bot, botId);
    this.botUtils = new BotUtils(bot);

    return {
      commandHandler: this.commandHandler,
      callbackHandler: this.callbackHandler,
      keyboardBuilder: this.keyboardBuilder,
      botUtils: this.botUtils
    };
  }

  /**
   * 初始化其他模块
   */
  private initializeModules(): void {
    // 初始化API模块
    this.api = new TelegramBotAPI(this.bot, this.config, {
      logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action, message, metadata) => this.logger.logBotActivity(level, action, message, metadata)
    });

    // 初始化消息处理器
    this.processor = new TelegramBotProcessor(
      this.commandHandler,
      this.callbackHandler,
      this.keyboardBuilder,
      {
        sendMessage: (chatId, message, options) => this.api.sendMessage(chatId, message, options),
        answerCallbackQuery: (callbackQueryId, options) => this.api.answerCallbackQuery(callbackQueryId, options)
      },
      {
        logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action, message, metadata) => this.logger.logBotActivity(level, action, message, metadata)
      },
      this.bot
    );

    // 初始化Webhook处理器
    this.webhook = new TelegramBotWebhook(
      this.bot,
      { webhook: this.config.webhook || false, polling: this.config.polling || false },
      {
        logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action, message, metadata) => this.logger.logBotActivity(level, action, message, metadata)
      },
      {
        processMessage: (message) => this.processor.processMessage(message),
        processCallbackQuery: (callbackQuery) => this.processor.processCallbackQuery(callbackQuery)
      }
    );

    // 初始化工作模式管理器
    this.workMode = new TelegramBotWorkMode(
      { polling: this.config.polling || false, webhook: this.config.webhook || false, token: this.config.token || '' }, 
      {
      getBot: () => this.bot,
      setBot: (bot) => { 
        this.bot = bot;
        this.updateAllModuleBotInstances(bot);
      },
      getBotId: () => this.configManager.getBotConfig()?.id || 'unknown',
      createHandlers: (bot, botId) => this.createHandlers(bot, botId),
      setHandlers: (handlers) => {
        this.commandHandler = handlers.commandHandler;
        this.callbackHandler = handlers.callbackHandler;
        this.keyboardBuilder = handlers.keyboardBuilder;
        this.botUtils = handlers.botUtils;
        this.updateProcessorHandlers();
      },
      setupHandlers: () => this.setupHandlers(),
      setupErrorHandling: () => this.setupErrorHandling()
    });
  }

  /**
   * 更新所有模块的bot实例
   */
  private updateAllModuleBotInstances(bot: TelegramBot): void {
    if (this.api) this.api.updateBot(bot);
    if (this.webhook) this.webhook.updateBot(bot);
  }

  /**
   * 更新处理器模块的处理器实例
   */
  private updateProcessorHandlers(): void {
    if (this.processor) {
      this.processor.updateHandlers(this.commandHandler, this.callbackHandler, this.keyboardBuilder);
    }
  }

  /**
   * 使用指定配置初始化机器人（多机器人支持）
   */
  async initializeWithConfig(botConfig: TelegramBotConfig): Promise<void> {
    await TelegramBotInitializer.initializeWithConfig(
      botConfig,
      this.config,
      {
        setBotConfig: (config) => this.configManager.setBotConfig(config),
        setBotId: (id) => this.logger.setBotId(id),
        setNetworks: (networks) => this.configManager.setNetworks(networks),
        setFileLogger: (logger) => this.logger.setFileLogger(logger),
        setIsInitialized: (initialized) => this.isInitialized = initialized,
        logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action, message, metadata) => this.logger.logBotActivity(level, action, message, metadata),
        createBotInstance: (token, options) => this.createBotInstance(token, options),
        createHandlers: (bot, botId) => this.createHandlers(bot, botId),
        setupHandlers: () => this.setupHandlers(),
        setupErrorHandling: () => this.setupErrorHandling()
      }
    );

    // 初始化其他模块
    this.initializeModules();
  }

  /**
   * 从数据库初始化机器人配置（单机器人模式，向后兼容）
   */
  private async initializeFromDatabase(): Promise<void> {
    await TelegramBotInitializer.initializeFromDatabase(
      this.config,
      {
        setBotConfig: (config) => this.configManager.setBotConfig(config),
        setBotId: (id) => this.logger.setBotId(id),
        setNetworks: (networks) => this.configManager.setNetworks(networks),
        setFileLogger: (logger) => this.logger.setFileLogger(logger),
        setIsInitialized: (initialized) => this.isInitialized = initialized,
        logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action, message, metadata) => this.logger.logBotActivity(level, action, message, metadata),
        createBotInstance: (token, options) => this.createBotInstance(token, options),
        createHandlers: (bot, botId) => this.createHandlers(bot, botId),
        setupHandlers: () => this.setupHandlers(),
        setupErrorHandling: () => this.setupErrorHandling(),
        setupConfigChangeListener: () => this.setupConfigChangeListener(),
        initializeFromEnv: () => this.initializeFromEnv()
      }
    );

    // 初始化其他模块
    this.initializeModules();
  }

  /**
   * 从环境变量初始化（回退方案）
   */
  private async initializeFromEnv(): Promise<void> {
    await TelegramBotInitializer.initializeFromEnv(
      this.config,
      {
        setIsInitialized: (initialized) => this.isInitialized = initialized,
        createBotInstance: (token, options) => this.createBotInstance(token, options),
        createHandlers: (bot, botId) => this.createHandlers(bot, botId),
        setupHandlers: () => this.setupHandlers(),
        setupErrorHandling: () => this.setupErrorHandling()
      }
    );

    // 初始化其他模块
    this.initializeModules();
  }

  /**
   * 设置配置变更监听器
   */
  private setupConfigChangeListener(): void {
    this.configManager.setupConfigChangeListener(() => this.reloadConfiguration());
  }

  /**
   * 重新加载配置
   */
  async reloadConfiguration(): Promise<void> {
    await this.configManager.reloadConfiguration();
  }

  /**
   * 等待初始化完成并返回服务实例
   */
  async waitForInitialization(): Promise<TelegramBotService | null> {
    const isReady = await TelegramBotInitializer.waitForInitialization(() => ({
      isInitialized: this.isInitialized,
      bot: this.bot,
      token: this.config.token
    }));
    
    return isReady ? this : null;
  }

  /**
   * 记录机器人活动日志
   */
  async logBotActivity(
    level: 'info' | 'warn' | 'error' | 'debug',
    action: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    await this.logger.logBotActivity(level, action, message, metadata);
  }

  /**
   * 获取当前机器人配置
   */
  getBotConfig(): TelegramBotConfig | null {
    return this.configManager.getBotConfig();
  }

  /**
   * 获取当前网络配置
   */
  getNetworks(): TronNetworkConfig[] {
    return this.configManager.getNetworks();
  }

  /**
   * 获取默认网络配置
   */
  getDefaultNetwork(): TronNetworkConfig | null {
    return this.configManager.getDefaultNetwork();
  }

  /**
   * 根据网络类型获取网络配置
   */
  getNetworkByType(networkType: string): TronNetworkConfig | null {
    return this.configManager.getNetworkByType(networkType);
  }

  /**
   * 设置所有处理器
   */
  private setupHandlers(): void {
    // 注册命令处理器
    this.commandHandler.registerCommands();
    
    // 注册回调查询处理器
    this.callbackHandler.registerCallbacks();

    // 重写命令处理器中需要调用键盘构建器的方法
    this.overrideCommandHandlerMethods();
    
    // 重写回调处理器中需要调用其他模块的方法
    this.overrideCallbackHandlerMethods();
  }

  /**
   * 重写命令处理器的方法，以便调用键盘构建器
   */
  private overrideCommandHandlerMethods(): void {
    // 重写 /start 命令的后续处理
    const originalHandleStart = this.commandHandler.handleStartCommand.bind(this.commandHandler);
    this.commandHandler.handleStartCommand = async (msg: TelegramBot.Message) => {
      await originalHandleStart(msg);
      // 显示主菜单
      await this.keyboardBuilder.showMainMenu(msg.chat.id);
    };

    // 重写 /menu 命令处理
    this.commandHandler.handleMenuCommand = async (msg: TelegramBot.Message) => {
      await this.keyboardBuilder.showMainMenu(msg.chat.id);
    };
  }

  /**
   * 重写回调处理器的方法，以便调用其他模块
   */
  private overrideCallbackHandlerMethods(): void {
    // 保存原始的路由方法
    const originalRouteCallback = (this.callbackHandler as any).routeCallback.bind(this.callbackHandler);
    
    // 重写路由方法
    (this.callbackHandler as any).routeCallback = async (chatId: number, data: string, callbackQuery: TelegramBot.CallbackQuery) => {
      switch (data) {
        case 'buy_energy':
          await this.keyboardBuilder.showEnergyPackages(chatId);
          break;
        case 'my_orders':
          await this.commandHandler.handleOrdersCommand({ 
            chat: { id: chatId }, 
            from: callbackQuery.from 
          } as TelegramBot.Message);
          break;
        case 'check_balance':
          await this.commandHandler.handleBalanceCommand({ 
            chat: { id: chatId }, 
            from: callbackQuery.from 
          } as TelegramBot.Message);
          break;
        case 'help_support':
          await this.commandHandler.handleHelpCommand({ 
            chat: { id: chatId }, 
            from: callbackQuery.from 
          } as TelegramBot.Message);
          break;
        case 'refresh_menu':
          await this.keyboardBuilder.showMainMenu(chatId);
          break;
        default:
          // 调用原始的路由处理
          await originalRouteCallback(chatId, data, callbackQuery);
          break;
      }
    };
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    // 处理轮询错误
    this.bot.on('polling_error', async (error) => {
      console.error('Telegram Bot polling error:', error);
      await this.logBotActivity('error', 'polling_error', `轮询错误: ${error.message}`, { error: error.stack });
    });

    // 处理一般错误
    this.bot.on('error', async (error) => {
      console.error('Telegram Bot error:', error);
      await this.logBotActivity('error', 'bot_error', `机器人错误: ${error.message}`, { error: error.stack });
    });

    // 处理未捕获的异常
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception in Telegram Bot:', error);
      await this.logBotActivity('error', 'uncaught_exception', `未捕获异常: ${error.message}`, { error: error.stack });
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled Rejection in Telegram Bot:', reason);
      await this.logBotActivity('error', 'unhandled_rejection', `未处理的Promise拒绝: ${reason}`, { reason, promise });
    });
  }

  // ========== API 相关方法 ==========

  /**
   * 获取机器人信息
   */
  async getBotInfo(): Promise<TelegramBot.User> {
    return await this.api.getBotInfo();
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId: number, message: string, options?: TelegramBot.SendMessageOptions): Promise<TelegramBot.Message> {
    return await this.api.sendMessage(chatId, message, options);
  }

  /**
   * 发送照片
   */
  async sendPhoto(chatId: number, photo: string | Buffer, options?: TelegramBot.SendPhotoOptions): Promise<TelegramBot.Message> {
    return await this.api.sendPhoto(chatId, photo, options);
  }

  /**
   * 发送文档
   */
  async sendDocument(chatId: number, document: string | Buffer, options?: TelegramBot.SendDocumentOptions): Promise<TelegramBot.Message> {
    return await this.api.sendDocument(chatId, document, options);
  }

  /**
   * 编辑消息
   */
  async editMessageText(text: string, options: TelegramBot.EditMessageTextOptions): Promise<TelegramBot.Message | boolean> {
    return await this.api.editMessageText(text, options);
  }

  /**
   * 删除消息
   */
  async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
    return await this.api.deleteMessage(chatId, messageId);
  }

  /**
   * 回答回调查询
   */
  async answerCallbackQuery(callbackQueryId: string, options?: TelegramBot.AnswerCallbackQueryOptions): Promise<boolean> {
    return await this.api.answerCallbackQuery(callbackQueryId, options);
  }

  /**
   * 从数据库配置获取启用的命令
   */
  private async getEnabledCommandsFromConfig(): Promise<TelegramBot.BotCommand[]> {
    try {
      const botConfig = this.configManager.getBotConfig();
      if (!botConfig || !botConfig.id) {
        console.log('⚠️ 机器人配置未找到，使用空命令列表');
        return [];
      }

      // 从数据库获取键盘配置（包含commands配置）
      const result = await query(
        'SELECT keyboard_config FROM telegram_bots WHERE id = $1',
        [botConfig.id]
      );

      if (result.rows.length === 0) {
        console.log('⚠️ 未找到机器人键盘配置，使用空命令列表');
        return [];
      }

      const keyboardConfig = result.rows[0].keyboard_config;
      if (!keyboardConfig || !keyboardConfig.commands) {
        console.log('⚠️ 键盘配置中未找到commands配置，使用空命令列表');
        return [];
      }

      // 过滤启用的命令
      const enabledCommands = keyboardConfig.commands
        .filter((cmd: any) => cmd.is_enabled === true)
        .map((cmd: any) => ({
          command: cmd.command,
          description: cmd.description
        }));

      console.log(`✅ 从数据库配置获取到 ${enabledCommands.length} 个启用的命令:`, 
                  enabledCommands.map((cmd: any) => `/${cmd.command}`).join(', '));

      return enabledCommands;
    } catch (error) {
      console.error('❌ 获取命令配置失败:', error);
      return [];
    }
  }

  /**
   * 设置机器人命令菜单
   */
  async setMyCommands(commands: TelegramBot.BotCommand[]): Promise<boolean> {
    return await this.api.setMyCommands(commands);
  }

  /**
   * 设置机器人名称
   */
  async setMyName(name: string): Promise<boolean> {
    return await this.api.setMyName(name);
  }

  /**
   * 设置机器人描述
   */
  async setMyDescription(description: string): Promise<boolean> {
    return await this.api.setMyDescription(description);
  }

  /**
   * 从Telegram获取机器人名称
   */
  async getMyName(): Promise<string | null> {
    return await this.api.getMyName();
  }

  /**
   * 从Telegram获取机器人描述
   */
  async getMyDescription(): Promise<string | null> {
    return await this.api.getMyDescription();
  }

  /**
   * 从Telegram获取机器人命令列表
   */
  async getMyCommands(): Promise<TelegramBot.BotCommand[] | null> {
    return await this.api.getMyCommands();
  }

  /**
   * 从Telegram同步机器人信息到数据库
   */
  async syncFromTelegram(): Promise<{
    success: boolean;
    data?: {
      name: string | null;
      description: string | null;
      commands: TelegramBot.BotCommand[] | null;
      botInfo: any;
    };
    error?: string;
  }> {
    return await this.api.syncFromTelegram({
      initializeFromDatabase: () => this.initializeFromDatabase()
    });
  }

  // ========== Webhook 相关方法 ==========

  /**
   * 设置Webhook
   */
  async setWebhook(url: string, options?: TelegramBot.SetWebHookOptions): Promise<boolean> {
    return await this.webhook.setWebhook(url, options);
  }

  /**
   * 获取Webhook信息
   */
  async getWebhookInfo(): Promise<TelegramBot.WebhookInfo> {
    return await this.webhook.getWebhookInfo();
  }

  /**
   * 删除Webhook
   */
  async deleteWebhook(): Promise<boolean> {
    return await this.webhook.deleteWebhook();
  }

  /**
   * 获取Webhook信息（增强版，支持模式检查）
   */
  async getWebhookInfoEnhanced(): Promise<any> {
    return await this.webhook.getWebhookInfoEnhanced();
  }

  /**
   * 设置Webhook（仅webhook模式）
   */
  async setWebhookUrl(url: string, options?: {
    secret?: string;
    maxConnections?: number;
    allowedUpdates?: string[];
  }): Promise<boolean> {
    return await this.webhook.setWebhookUrl(url, options);
  }

  /**
   * 处理webhook接收的更新消息
   */
  async processWebhookUpdate(update: any): Promise<void> {
    await this.webhook.processWebhookUpdate(update);
  }

  // ========== 工作模式相关方法 ==========

  /**
   * 获取当前工作模式
   */
  getCurrentWorkMode(): 'polling' | 'webhook' | 'unknown' {
    return this.workMode.getCurrentWorkMode();
  }

  /**
   * 检查机器人是否支持某种工作模式
   */
  async canSwitchToMode(mode: 'polling' | 'webhook'): Promise<{ canSwitch: boolean; reason?: string }> {
    return await this.workMode.canSwitchToMode(mode);
  }

  /**
   * 动态切换机器人工作模式
   */
  async switchWorkMode(mode: 'polling' | 'webhook', webhookConfig?: {
    url?: string;
    secret?: string;
    maxConnections?: number;
  }): Promise<boolean> {
    return await this.workMode.switchWorkMode(mode, webhookConfig);
  }

  // ========== 启动和停止方法 ==========

  /**
   * 启动机器人
   */
  async start(): Promise<void> {
    try {
      // 等待初始化完成
      await this.waitForInitialization();
      
      // 检查机器人是否正确初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未正确初始化，跳过启动');
        return;
      }
      
      const botInfo = await this.getBotInfo();
      const botName = this.configManager.getBotConfig()?.botName || 'Unknown';
      console.log(`Telegram Bot started: @${botInfo.username} (${botName})`);

      // 设置机器人命令菜单（基于数据库配置）
      const enabledCommands = await this.getEnabledCommandsFromConfig();
      if (enabledCommands.length > 0) {
        await this.setMyCommands(enabledCommands);
        console.log('✅ Telegram Bot commands menu set successfully');
      } else {
        console.log('⚠️ 没有启用的命令，跳过命令菜单设置');
      }
      
      // 记录机器人启动成功日志
      await this.logBotActivity('info', 'bot_started', `机器人启动成功: @${botInfo.username} (${botName})`, {
        username: botInfo.username,
        botName,
        workMode: this.getCurrentWorkMode()
      });
    } catch (error) {
      console.error('Failed to start Telegram Bot:', error);
      console.warn('⚠️ 机器人启动失败，但应用将继续运行。请检查机器人配置。');
      
      // 记录启动失败日志
      await this.logBotActivity('error', 'bot_start_failed', `机器人启动失败: ${error.message}`, {
        error: error.stack
      });
      
      // 不抛出错误，让应用继续运行
    }
  }

  /**
   * 停止机器人
   */
  async stop(): Promise<void> {
    try {
      if (this.bot) {
        await this.bot.stopPolling();
      }
      const botName = this.configManager.getBotConfig()?.botName || 'Unknown';
      console.log(`Telegram Bot stopped: ${botName}`);
      
      // 记录机器人停止日志
      await this.logBotActivity('info', 'bot_stopped', `机器人已停止: ${botName}`);
      
    } catch (error) {
      console.error('Failed to stop Telegram Bot:', error);
      
      // 记录停止失败日志
      await this.logBotActivity('error', 'bot_stop_failed', `机器人停止失败: ${error.message}`, {
        error: error.stack
      });
      
      throw error;
    }
  }

  // ========== 获取实例方法 ==========

  /**
   * 获取机器人实例（用于高级操作）
   */
  getBotInstance(): TelegramBot {
    return this.bot;
  }

  /**
   * 获取命令处理器实例
   */
  getCommandHandler(): CommandHandler {
    return this.commandHandler;
  }

  /**
   * 获取回调处理器实例
   */
  getCallbackHandler(): CallbackHandler {
    return this.callbackHandler;
  }

  /**
   * 获取键盘构建器实例
   */
  getKeyboardBuilder(): KeyboardBuilder {
    return this.keyboardBuilder;
  }

  /**
   * 获取工具类实例
   */
  getBotUtils(): BotUtils {
    return this.botUtils;
  }

  // ========== 其他方法 ==========

  /**
   * 广播消息给所有用户（管理员功能）
   */
  async broadcastMessage(message: string, userIds?: number[]): Promise<void> {
    // 这里需要实现广播逻辑
    // 如果没有指定用户ID，则需要从数据库获取所有活跃用户
    console.log('Broadcast message:', message);
  }

  /**
   * 获取机器人统计信息
   */
  async getStats(): Promise<any> {
    // 这里可以返回机器人的使用统计
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      // 其他统计信息...
    };
  }
}