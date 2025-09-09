/**
 * Telegram机器人主服务
 * 整合命令处理、回调处理、键盘构建等模块
 * 支持从数据库读取配置
 */
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../config/database.js';
import type { LogLevel } from '../../utils/logger';
import { createBotLogger, isBusinessEvent } from '../../utils/logger';
import { configService, type TelegramBotConfig, type TronNetworkConfig } from '../config/ConfigService.js';
import { CallbackHandler } from './callbacks/CallbackHandler.js';
import { CommandHandler } from './commands/CommandHandler.js';
import { KeyboardBuilder } from './keyboards/KeyboardBuilder.js';
import type { BotConfig } from './types/bot.types.js';
import { BotUtils } from './utils/BotUtils.js';

export class TelegramBotService {
  private bot: TelegramBot;
  private commandHandler: CommandHandler;
  private callbackHandler: CallbackHandler;
  private keyboardBuilder: KeyboardBuilder;
  private botUtils: BotUtils;
  private config: BotConfig;
  private botConfig: TelegramBotConfig | null = null;
  private networks: TronNetworkConfig[] = [];
  private isInitialized: boolean = false;
  private botId: string | null = null;
  private fileLogger: any = null; // winston logger instance

  constructor(config?: Partial<BotConfig>, skipAutoInit?: boolean) {
    // 临时配置，实际配置将从数据库加载
    this.config = {
      token: config?.token || 'temp-token',
      polling: config?.polling !== false,
      webhook: false,
      ...config
    };

    // 如果不跳过自动初始化，则使用原有逻辑（向后兼容）
    if (!skipAutoInit) {
      // 延迟初始化，等待从数据库加载配置
      this.initializeFromDatabase();
    }
  }

  /**
   * 使用指定配置初始化机器人（多机器人支持）
   */
  async initializeWithConfig(botConfig: TelegramBotConfig): Promise<void> {
    try {
      console.log(`🔧 使用指定配置初始化机器人: ${botConfig.botName}`);
      
      // 设置机器人配置
      this.botConfig = botConfig;
      this.botId = botConfig.id;
      this.networks = botConfig.networks || [];
      
      // 创建文件日志记录器
      this.fileLogger = createBotLogger(this.botId);

      // 更新配置
      this.config.token = botConfig.botToken;
      
      // 根据工作模式配置机器人
      const workMode = botConfig.workMode || 'polling';
      
      if (workMode === 'webhook') {
        this.config.polling = false;
        this.config.webhook = true;
        // Webhook模式下不启用轮询
        this.bot = new TelegramBot(this.config.token, { 
          polling: false,
          webHook: false  // 暂不自动设置webhook，由管理员手动配置
        });
      } else {
        this.config.polling = true;
        this.config.webhook = false;
        // Polling模式
        this.bot = new TelegramBot(this.config.token, { 
          polling: this.config.polling 
        });
      }

      // 初始化各个处理模块
      this.commandHandler = new CommandHandler(this.bot);
      this.callbackHandler = new CallbackHandler(this.bot);
      this.keyboardBuilder = new KeyboardBuilder(this.bot, this.botId || 'unknown');
      this.botUtils = new BotUtils(this.bot);

      // 设置处理器
      this.setupHandlers();
      this.setupErrorHandling();

      this.isInitialized = true;
      console.log(`✅ 机器人已使用指定配置初始化: ${botConfig.botName}`);
      
      // 记录机器人启动日志
      await this.logBotActivity('info', 'bot_initialized_with_config', `机器人已使用指定配置初始化: ${botConfig.botName}`);
      
    } catch (error) {
      console.error(`❌ 使用指定配置初始化机器人失败: ${botConfig.botName}`, error);
      throw error;
    }
  }

  /**
   * 从数据库初始化机器人配置（单机器人模式，向后兼容）
   */
  private async initializeFromDatabase(): Promise<void> {
    try {
      // 获取活跃的机器人配置
      const activeBots = await configService.getActiveBotConfigs();
      
      if (activeBots.length === 0) {
        console.warn('未找到活跃的机器人配置，使用环境变量配置');
        await this.initializeFromEnv();
        return;
      }

      // 使用第一个活跃的机器人配置
      this.botConfig = activeBots[0];
      this.botId = this.botConfig.id;
      this.networks = this.botConfig.networks;
      
      // 创建文件日志记录器
      this.fileLogger = createBotLogger(this.botId);

      // 更新配置
      this.config.token = this.botConfig.botToken;
      
      // 根据工作模式配置机器人
      const workMode = this.botConfig.workMode || 'polling';
      
      if (workMode === 'webhook') {
        this.config.polling = false;
        this.config.webhook = true;
        // Webhook模式下不启用轮询
        this.bot = new TelegramBot(this.config.token, { 
          polling: false,
          webHook: false  // 暂不自动设置webhook，由管理员手动配置
        });
      } else {
        this.config.polling = true;
        this.config.webhook = false;
        // Polling模式
        this.bot = new TelegramBot(this.config.token, { 
          polling: this.config.polling 
        });
      }

      // 初始化各个处理模块
      this.commandHandler = new CommandHandler(this.bot);
      this.callbackHandler = new CallbackHandler(this.bot);
      this.keyboardBuilder = new KeyboardBuilder(this.bot, this.botId || 'unknown');
      this.botUtils = new BotUtils(this.bot);

      // 设置处理器
      this.setupHandlers();
      this.setupErrorHandling();
      this.setupConfigChangeListener();

      this.isInitialized = true;
      console.log(`✅ 机器人已从数据库配置初始化: ${this.botConfig.botName}`);
      
      // 记录机器人启动日志
      await this.logBotActivity('info', 'bot_initialized', `机器人已从数据库配置初始化: ${this.botConfig.botName}`);
      
    } catch (error) {
      console.error('从数据库初始化机器人配置失败:', error);
      console.log('回退到环境变量配置...');
      try {
        await this.initializeFromEnv();
      } catch (envError) {
        console.error('环境变量配置也失败:', envError);
        console.warn('⚠️ 机器人服务完全不可用，但应用将继续运行');
        this.isInitialized = true; // 标记为已初始化，避免无限等待
      }
    }
  }

  /**
   * 从环境变量初始化（回退方案）
   */
  private async initializeFromEnv(): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('⚠️ 未找到TELEGRAM_BOT_TOKEN环境变量，机器人服务将不可用');
      this.isInitialized = true; // 标记为已初始化，避免无限等待
      return;
    }

    this.config.token = token;

    // 初始化机器人实例
    this.bot = new TelegramBot(token, { 
      polling: this.config.polling 
    });

    // 初始化各个处理模块
    this.commandHandler = new CommandHandler(this.bot);
    this.callbackHandler = new CallbackHandler(this.bot);
    this.keyboardBuilder = new KeyboardBuilder(this.bot, this.botId || 'unknown');
    this.botUtils = new BotUtils(this.bot);

    // 设置处理器
    this.setupHandlers();
    this.setupErrorHandling();

    this.isInitialized = true;
    console.log('✅ 机器人已从环境变量配置初始化');
  }

  /**
   * 设置配置变更监听器
   */
  private setupConfigChangeListener(): void {
    configService.onConfigChange(async (event) => {
      if (event.type === 'telegram_bots') {
        console.log('检测到机器人配置变更，重新加载配置...');
        await this.reloadConfiguration();
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
        await this.stop();
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
   * 等待初始化完成并返回服务实例
   */
  async waitForInitialization(): Promise<TelegramBotService | null> {
    while (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 检查机器人是否正确初始化
    if (!this.bot || this.config.token === 'temp-token') {
      return null;
    }
    
    return this;
  }

  /**
   * 记录机器人活动日志 - 分层日志架构
   * 业务事件写入数据库，运行日志写入文件
   */
  async logBotActivity(
    level: 'info' | 'warn' | 'error' | 'debug',
    action: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      if (!this.botId) {
        console.warn('无法记录日志：机器人ID未设置');
        return;
      }

      const logData = {
        botId: this.botId,
        level: level as LogLevel,
        action,
        message,
        metadata
      };

      // 判断是否为业务事件
      if (isBusinessEvent(action)) {
        // 业务事件：写入数据库
        try {
          const queryStr = `
            INSERT INTO bot_logs (bot_id, level, action, message, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
          `;
          
          await query(queryStr, [
            this.botId,
            level,
            action,
            message,
            metadata ? JSON.stringify(metadata) : null
          ]);
        } catch (dbError) {
          console.error('写入数据库日志失败:', dbError);
          // 数据库失败时，降级到文件日志
          if (this.fileLogger) {
            this.fileLogger[level](`[DB_FALLBACK] ${action}: ${message}`, { ...logData, dbError: dbError.message });
          }
        }
      }

      // 运行日志：写入文件（所有日志都写入文件作为完整记录）
      if (this.fileLogger) {
        this.fileLogger[level](`${action}: ${message}`, logData);
      }
      
      // 同时输出到控制台（保持向后兼容）
      const logMessage = `[Bot-${this.botId}] [${level.toUpperCase()}] ${action}: ${message}`;
      switch (level) {
        case 'error':
          console.error(logMessage, metadata);
          break;
        case 'warn':
          console.warn(logMessage, metadata);
          break;
        case 'debug':
          console.debug(logMessage, metadata);
          break;
        default:
          console.log(logMessage, metadata);
      }
      
    } catch (error) {
      console.error('记录机器人日志失败:', error);
      // 最后的降级方案：只输出到控制台
      console.error(`[FALLBACK] [Bot-${this.botId}] [${level.toUpperCase()}] ${action}: ${message}`, metadata);
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

  /**
   * 获取机器人信息
   */
  async getBotInfo(): Promise<TelegramBot.User> {
    return await this.bot.getMe();
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId: number, message: string, options?: TelegramBot.SendMessageOptions): Promise<TelegramBot.Message> {
    try {
      const result = await this.bot.sendMessage(chatId, message, options);
      await this.logBotActivity('info', 'send_message', `发送消息到聊天 ${chatId}`, { 
        chatId, 
        messageLength: message.length,
        messageId: result.message_id 
      });
      return result;
    } catch (error) {
      await this.logBotActivity('error', 'send_message_failed', `发送消息失败到聊天 ${chatId}: ${error.message}`, { 
        chatId, 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * 发送照片
   */
  async sendPhoto(chatId: number, photo: string | Buffer, options?: TelegramBot.SendPhotoOptions): Promise<TelegramBot.Message> {
    return await this.bot.sendPhoto(chatId, photo, options);
  }

  /**
   * 发送文档
   */
  async sendDocument(chatId: number, document: string | Buffer, options?: TelegramBot.SendDocumentOptions): Promise<TelegramBot.Message> {
    return await this.bot.sendDocument(chatId, document, options);
  }

  /**
   * 编辑消息
   */
  async editMessageText(text: string, options: TelegramBot.EditMessageTextOptions): Promise<TelegramBot.Message | boolean> {
    return await this.bot.editMessageText(text, options);
  }

  /**
   * 删除消息
   */
  async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
    return await this.bot.deleteMessage(chatId, messageId);
  }

  /**
   * 回答回调查询
   */
  async answerCallbackQuery(callbackQueryId: string, options?: TelegramBot.AnswerCallbackQueryOptions): Promise<boolean> {
    return await this.bot.answerCallbackQuery(callbackQueryId, options);
  }

  /**
   * 设置机器人命令菜单
   */
  async setMyCommands(commands: TelegramBot.BotCommand[]): Promise<boolean> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，跳过命令菜单同步');
        return false;
      }
      
      const response = await this.bot.setMyCommands(commands);
      console.log('✅ 命令菜单已设置');
      
      // 记录同步成功日志
      await this.logBotActivity('info', 'commands_sync_success', `机器人命令菜单同步成功`, {
        commands,
        syncType: 'commands',
        commandCount: commands.length
      });
      
      return response;
    } catch (error) {
      console.error('❌ 设置命令菜单失败:', error);
      
      // 记录同步失败日志
      await this.logBotActivity('error', 'commands_sync_failed', `机器人命令菜单同步失败: ${error.message}`, {
        commands,
        syncType: 'commands',
        error: error.message
      });
      
      // 不抛出错误，避免影响数据库更新
      return false;
    }
  }

  /**
   * 调用Telegram Bot API的通用方法
   */
  private async callTelegramAPI(method: string, params: any = {}): Promise<any> {
    if (!this.config.token || this.config.token === 'temp-token') {
      throw new Error('Bot Token无效');
    }

    const url = `https://api.telegram.org/bot${this.config.token}/${method}`;
    
    try {
      const response = await axios.post(url, params, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10秒超时
      });

      if (response.data.ok) {
        return response.data.result;
      } else {
        throw new Error(`Telegram API错误: ${response.data.description || '未知错误'}`);
      }
    } catch (error: any) {
      if (error.response) {
        // HTTP错误响应
        const errorData = error.response.data;
        throw new Error(`Telegram API错误 (${error.response.status}): ${errorData.description || error.message}`);
      } else if (error.request) {
        // 网络错误
        throw new Error('网络错误: 无法连接到Telegram API');
      } else {
        // 其他错误
        throw error;
      }
    }
  }

  /**
   * 设置机器人名称
   */
  async setMyName(name: string): Promise<boolean> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，跳过名称同步');
        return false;
      }
      
      await this.callTelegramAPI('setMyName', { name });
      console.log(`✅ 机器人名称已同步到Telegram: ${name}`);
      
      // 记录同步成功日志
      await this.logBotActivity('info', 'name_sync_success', `机器人名称同步成功: ${name}`, {
        name,
        syncType: 'name'
      });
      
      return true;
    } catch (error) {
      console.error('❌ 同步机器人名称失败:', error);
      
      // 记录同步失败日志
      await this.logBotActivity('error', 'name_sync_failed', `机器人名称同步失败: ${error.message}`, {
        name,
        syncType: 'name',
        error: error.message
      });
      
      // 不抛出错误，避免影响数据库更新
      return false;
    }
  }

  /**
   * 设置机器人描述
   */
  async setMyDescription(description: string): Promise<boolean> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，跳过描述同步');
        return false;
      }
      
      await this.callTelegramAPI('setMyDescription', { description });
      console.log(`✅ 机器人描述已同步到Telegram: ${description}`);
      
      // 记录同步成功日志
      await this.logBotActivity('info', 'description_sync_success', `机器人描述同步成功: ${description}`, {
        description,
        syncType: 'description'
      });
      
      return true;
    } catch (error) {
      console.error('❌ 同步机器人描述失败:', error);
      
      // 记录同步失败日志
      await this.logBotActivity('error', 'description_sync_failed', `机器人描述同步失败: ${error.message}`, {
        description,
        syncType: 'description',
        error: error.message
      });
      
      // 不抛出错误，避免影响数据库更新
      return false;
    }
  }

  /**
   * 从Telegram获取机器人名称
   */
  async getMyName(): Promise<string | null> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，无法获取名称');
        return null;
      }
      
      const response = await this.callTelegramAPI('getMyName');
      return response.name || null;
    } catch (error) {
      console.error('获取机器人名称失败:', error);
      return null;
    }
  }

  /**
   * 从Telegram获取机器人描述
   */
  async getMyDescription(): Promise<string | null> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，无法获取描述');
        return null;
      }
      
      const response = await this.callTelegramAPI('getMyDescription');
      return response.description || null;
    } catch (error) {
      console.error('获取机器人描述失败:', error);
      return null;
    }
  }

  /**
   * 从Telegram获取机器人命令列表
   */
  async getMyCommands(): Promise<TelegramBot.BotCommand[] | null> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，无法获取命令列表');
        return null;
      }
      
      const commands = await this.bot.getMyCommands();
      return commands;
    } catch (error) {
      console.error('获取机器人命令列表失败:', error);
      return null;
    }
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
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        // 尝试重新初始化机器人
        console.log('机器人未初始化，尝试重新初始化...');
        try {
          await this.initializeFromDatabase();
          if (!this.bot) {
            return {
              success: false,
              error: '机器人初始化失败，请检查Token是否有效'
            };
          }
        } catch (initError) {
          console.error('重新初始化机器人失败:', initError);
          return {
            success: false,
            error: `机器人初始化失败: ${initError.message}`
          };
        }
      }

      // 获取机器人基本信息
      const botInfo = await this.getBotInfo();
      
      // 获取机器人名称
      const name = await this.getMyName();
      
      // 获取机器人描述
      const description = await this.getMyDescription();
      
      // 获取机器人命令列表
      const commands = await this.getMyCommands();

      console.log('✅ 从Telegram获取机器人信息成功:', {
        botInfo: { id: botInfo.id, username: botInfo.username, first_name: botInfo.first_name },
        name,
        description,
        commands: commands?.length || 0
      });

      return {
        success: true,
        data: {
          name,
          description,
          commands,
          botInfo
        }
      };
    } catch (error) {
      console.error('从Telegram同步机器人信息失败:', error);
      
      // 提供更详细的错误信息
      let errorMessage = error.message;
      if (error.code === 'ETELEGRAM') {
        if (error.response?.body?.error_code === 401) {
          errorMessage = 'Bot Token无效，请检查Token是否正确';
        } else if (error.response?.body?.description) {
          errorMessage = `Telegram API错误: ${error.response.body.description}`;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 设置Webhook
   */
  async setWebhook(url: string, options?: TelegramBot.SetWebHookOptions): Promise<boolean> {
    return await this.bot.setWebHook(url, options);
  }

  /**
   * 获取Webhook信息
   */
  async getWebhookInfo(): Promise<TelegramBot.WebhookInfo> {
    return await this.bot.getWebHookInfo();
  }

  /**
   * 删除Webhook
   */
  async deleteWebhook(): Promise<boolean> {
    return await this.bot.deleteWebHook();
  }

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
      const botName = this.botConfig?.botName || 'Unknown';
      console.log(`Telegram Bot started: @${botInfo.username} (${botName})`);

      // 设置机器人命令菜单
      await this.setMyCommands([
        { command: 'start', description: '启动机器人' },
        { command: 'menu', description: '显示主菜单' },
        { command: 'help', description: '获取帮助' },
        { command: 'balance', description: '查询余额' },
        { command: 'orders', description: '查看订单' }
      ]);

      console.log('Telegram Bot commands menu set successfully');
      
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
      const botName = this.botConfig?.botName || 'Unknown';
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

  /**
   * 动态切换机器人工作模式
   */
  async switchWorkMode(mode: 'polling' | 'webhook', webhookConfig?: {
    url?: string;
    secret?: string;
    maxConnections?: number;
  }): Promise<boolean> {
    try {
      console.log(`🔄 切换机器人工作模式到: ${mode}`);
      
      // 如果当前有机器人实例，先停止
      if (this.bot) {
        try {
          if (this.config.polling) {
            await this.bot.stopPolling();
            console.log('✅ 已停止轮询模式');
          }
          if (this.config.webhook && webhookConfig?.url) {
            await this.bot.deleteWebHook();
            console.log('✅ 已删除Webhook');
          }
        } catch (error) {
          console.warn('⚠️ 停止当前模式时出现警告:', error);
        }
      }
      
      // 更新配置
      this.config.polling = mode === 'polling';
      this.config.webhook = mode === 'webhook';
      
      // 重新创建机器人实例
      if (mode === 'webhook') {
        this.bot = new TelegramBot(this.config.token, {
          polling: false,
          webHook: false
        });
        
        // 如果提供了webhook配置，设置webhook
        if (webhookConfig?.url) {
          const options: any = {
            max_connections: webhookConfig.maxConnections || 40,
            allowed_updates: ['message', 'callback_query'],
            drop_pending_updates: true
          };
          
          if (webhookConfig.secret) {
            options.secret_token = webhookConfig.secret;
          }
          
          await this.bot.setWebHook(webhookConfig.url, options);
          console.log('✅ Webhook已设置:', webhookConfig.url);
        }
      } else {
        // Polling模式
        this.bot = new TelegramBot(this.config.token, {
          polling: true
        });
        console.log('✅ 轮询模式已启动');
      }
      
      // 重新初始化处理器
      this.commandHandler = new CommandHandler(this.bot);
      this.callbackHandler = new CallbackHandler(this.bot);
      this.keyboardBuilder = new KeyboardBuilder(this.bot, this.botId || 'unknown');
      this.botUtils = new BotUtils(this.bot);
      
      // 重新设置处理器
      this.setupHandlers();
      this.setupErrorHandling();
      
      console.log(`✅ 机器人已成功切换到 ${mode} 模式`);
      return true;
      
    } catch (error) {
      console.error(`❌ 切换到 ${mode} 模式失败:`, error);
      return false;
    }
  }

  /**
   * 获取当前工作模式
   */
  getCurrentWorkMode(): 'polling' | 'webhook' | 'unknown' {
    if (this.config.polling) return 'polling';
    if (this.config.webhook) return 'webhook';
    return 'unknown';
  }

  /**
   * 检查机器人是否支持某种工作模式
   */
  async canSwitchToMode(mode: 'polling' | 'webhook'): Promise<{ canSwitch: boolean; reason?: string }> {
    try {
      if (!this.bot) {
        return { canSwitch: false, reason: '机器人实例未初始化' };
      }
      
      if (mode === 'webhook') {
        // 检查是否有有效的Token
        if (!this.config.token || this.config.token === 'temp-token') {
          return { canSwitch: false, reason: '无效的Bot Token' };
        }
        
        // 测试Token是否有效
        try {
          await this.bot.getMe();
        } catch (error) {
          return { canSwitch: false, reason: 'Bot Token无效或已过期' };
        }
      }
      
      return { canSwitch: true };
      
    } catch (error) {
      return { canSwitch: false, reason: `检查失败: ${error.message}` };
    }
  }

  /**
   * 获取Webhook信息（增强版，支持模式检查）
   */
  async getWebhookInfoEnhanced(): Promise<any> {
    if (!this.bot) {
      throw new Error('机器人实例未初始化');
    }
    
    if (this.getCurrentWorkMode() !== 'webhook') {
      throw new Error('当前不是Webhook模式');
    }
    
    return await this.bot.getWebHookInfo();
  }

  /**
   * 设置Webhook（仅webhook模式）
   */
  async setWebhookUrl(url: string, options?: {
    secret?: string;
    maxConnections?: number;
    allowedUpdates?: string[];
  }): Promise<boolean> {
    if (!this.bot) {
      throw new Error('机器人实例未初始化');
    }
    
    const webhookOptions: any = {
      max_connections: options?.maxConnections || 40,
      allowed_updates: options?.allowedUpdates || ['message', 'callback_query'],
      drop_pending_updates: true
    };
    
    if (options?.secret) {
      webhookOptions.secret_token = options.secret;
    }
    
    return await this.bot.setWebHook(url, webhookOptions);
  }

  /**
   * 处理webhook接收的更新消息
   * 这个方法将webhook消息路由到相应的处理器
   */
  async processWebhookUpdate(update: any): Promise<void> {
    try {
      console.log('🔄 TelegramBotService处理webhook更新:', {
        updateId: update.update_id,
        hasMessage: !!update.message,
        hasCallback: !!update.callback_query
      });

      // 处理文本消息和命令
      if (update.message) {
        await this.processMessage(update.message);
      }

      // 处理回调查询
      if (update.callback_query) {
        await this.processCallbackQuery(update.callback_query);
      }

    } catch (error) {
      console.error('❌ 处理webhook更新失败:', error);
      await this.logBotActivity('error', 'webhook_update_failed', `处理webhook更新失败: ${error.message}`, {
        error: error.stack,
        update
      });
      throw error;
    }
  }

  /**
   * 处理消息（支持webhook和polling两种模式）
   */
  private async processMessage(message: any): Promise<void> {
    try {
      const isCommand = message.text && message.text.startsWith('/');
      
      console.log('📨 处理消息:', {
        chatId: message.chat.id,
        text: message.text?.substring(0, 50),
        isCommand,
        from: message.from?.username
      });

      // 记录用户消息
      await this.logBotActivity('info', 'user_message_received', `用户消息: ${message.text?.substring(0, 100)}`, {
        chatId: message.chat.id,
        userId: message.from?.id,
        username: message.from?.username,
        messageType: isCommand ? 'command' : 'text',
        messageLength: message.text?.length || 0
      });

      if (isCommand) {
        // 处理命令
        const command = message.text.split(' ')[0].substring(1);
        await this.handleCommand(command, message);
      } else if (message.text) {
        // 处理普通文本消息
        await this.handleTextMessage(message);
      }

    } catch (error) {
      console.error('❌ 处理消息失败:', error);
      await this.logBotActivity('error', 'message_processing_failed', `消息处理失败: ${error.message}`, {
        error: error.stack,
        message
      });
    }
  }

  /**
   * 处理回调查询（支持webhook和polling两种模式）
   */
  private async processCallbackQuery(callbackQuery: any): Promise<void> {
    try {
      const data = callbackQuery.data;
      const chatId = callbackQuery.message?.chat.id;

      console.log('🔘 处理回调查询:', {
        data,
        chatId,
        from: callbackQuery.from?.username
      });

      // 记录用户回调查询
      await this.logBotActivity('info', 'user_callback_received', `用户回调: ${data}`, {
        chatId,
        userId: callbackQuery.from?.id,
        username: callbackQuery.from?.username,
        callbackData: data
      });

      // 先回应回调查询
      await this.answerCallbackQuery(callbackQuery.id);

      // 委托给回调处理器的路由方法
      if (this.callbackHandler && (this.callbackHandler as any).routeCallback) {
        await (this.callbackHandler as any).routeCallback(chatId, data, callbackQuery);
      } else {
        console.warn(`回调处理器未正确初始化或缺少routeCallback方法`);
      }

    } catch (error) {
      console.error('❌ 处理回调查询失败:', error);
      
      // 尝试回应回调查询，避免用户界面卡住
      try {
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: '操作失败，请稍后重试',
          show_alert: true
        });
      } catch (answerError) {
        console.error('回应回调查询失败:', answerError);
      }

      await this.logBotActivity('error', 'callback_processing_failed', `回调查询处理失败: ${error.message}`, {
        error: error.stack,
        callbackQuery
      });
    }
  }

  /**
   * 处理具体的命令
   */
  private async handleCommand(command: string, message: any): Promise<void> {
    try {
      console.log(`🎯 处理命令: /${command}`);

      switch (command) {
        case 'start':
          await this.commandHandler.handleStartCommand(message);
          // 显示主菜单键盘
          await this.keyboardBuilder.showMainMenu(message.chat.id);
          break;
        case 'menu':
          await this.keyboardBuilder.showMainMenu(message.chat.id);
          break;
        case 'help':
          await this.commandHandler.handleHelpCommand(message);
          break;
        case 'balance':
          await this.commandHandler.handleBalanceCommand(message);
          break;
        case 'orders':
          await this.commandHandler.handleOrdersCommand(message);
          break;
        default:
          // 处理未知命令
          await this.sendMessage(
            message.chat.id,
            `未知命令: /${command}\n\n发送 /help 查看可用命令`
          );
          break;
      }

      await this.logBotActivity('info', 'command_handled', `命令处理成功: /${command}`, {
        command,
        chatId: message.chat.id,
        userId: message.from?.id
      });

    } catch (error) {
      console.error(`❌ 命令处理失败: /${command}`, error);
      
      try {
        await this.sendMessage(
          message.chat.id,
          '抱歉，命令处理时出现错误，请稍后重试。'
        );
      } catch (sendError) {
        console.error('发送错误提示失败:', sendError);
      }

      await this.logBotActivity('error', 'command_handling_failed', `命令处理失败: /${command} - ${error.message}`, {
        command,
        chatId: message.chat.id,
        userId: message.from?.id,
        error: error.stack
      });
    }
  }

  /**
   * 处理普通文本消息
   */
  private async handleTextMessage(message: any): Promise<void> {
    try {
      const text = message.text.toLowerCase();
      
      console.log('💬 处理文本消息:', text.substring(0, 100));

      let responseAction = 'text_response';
      let responseDescription = '默认响应';

      // 简单的关键词响应
      if (text.includes('帮助') || text.includes('help')) {
        await this.commandHandler.handleHelpCommand(message);
        responseAction = 'help_response';
        responseDescription = '帮助响应';
      } else if (text.includes('菜单') || text.includes('menu')) {
        await this.keyboardBuilder.showMainMenu(message.chat.id);
        responseAction = 'menu_response';
        responseDescription = '菜单响应';
      } else if (text.includes('余额') || text.includes('balance')) {
        await this.commandHandler.handleBalanceCommand(message);
        responseAction = 'balance_response';
        responseDescription = '余额查询响应';
      } else {
        // 默认响应
        await this.sendMessage(
          message.chat.id,
          '您好！我是TRON能量租赁机器人。\n\n' +
          '发送 /menu 查看主菜单\n' +
          '发送 /help 获取帮助\n' +
          '发送 /start 重新开始'
        );
      }

      // 记录机器人响应
      await this.logBotActivity('info', responseAction, `机器人响应: ${responseDescription}`, {
        chatId: message.chat.id,
        userId: message.from?.id,
        userMessage: message.text.substring(0, 100),
        responseType: responseAction
      });

    } catch (error) {
      console.error('❌ 文本消息处理失败:', error);
      await this.logBotActivity('error', 'text_message_failed', `文本消息处理失败: ${error.message}`, {
        error: error.stack,
        message
      });
    }
  }
}
