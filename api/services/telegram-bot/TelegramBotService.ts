/**
 * Telegram机器人主服务
 * 整合命令处理、回调处理、键盘构建等模块
 * 支持从数据库读取配置
 */
import TelegramBot from 'node-telegram-bot-api';
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

  constructor(config?: Partial<BotConfig>) {
    // 临时配置，实际配置将从数据库加载
    this.config = {
      token: config?.token || 'temp-token',
      polling: config?.polling !== false,
      webhook: false,
      ...config
    };

    // 延迟初始化，等待从数据库加载配置
    this.initializeFromDatabase();
  }

  /**
   * 从数据库初始化机器人配置
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
      this.networks = this.botConfig.networks;

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
      this.keyboardBuilder = new KeyboardBuilder(this.bot);
      this.botUtils = new BotUtils(this.bot);

      // 设置处理器
      this.setupHandlers();
      this.setupErrorHandling();
      this.setupConfigChangeListener();

      this.isInitialized = true;
      console.log(`✅ 机器人已从数据库配置初始化: ${this.botConfig.botName}`);
      
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
    this.keyboardBuilder = new KeyboardBuilder(this.bot);
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
   * 等待初始化完成
   */
  async waitForInitialization(): Promise<void> {
    while (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
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
    this.bot.on('polling_error', (error) => {
      console.error('Telegram Bot polling error:', error);
    });

    // 处理一般错误
    this.bot.on('error', (error) => {
      console.error('Telegram Bot error:', error);
    });

    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception in Telegram Bot:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection in Telegram Bot:', reason);
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
    return await this.bot.sendMessage(chatId, message, options);
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
    return await this.bot.setMyCommands(commands);
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
    } catch (error) {
      console.error('Failed to start Telegram Bot:', error);
      console.warn('⚠️ 机器人启动失败，但应用将继续运行。请检查机器人配置。');
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
    } catch (error) {
      console.error('Failed to stop Telegram Bot:', error);
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
      this.keyboardBuilder = new KeyboardBuilder(this.bot);
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
}
