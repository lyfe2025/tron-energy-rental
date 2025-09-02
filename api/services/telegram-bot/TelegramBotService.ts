/**
 * Telegram机器人主服务
 * 整合命令处理、回调处理、键盘构建等模块
 */
import TelegramBot from 'node-telegram-bot-api';
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

  constructor(config?: Partial<BotConfig>) {
    // 获取配置
    const token = config?.token || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    this.config = {
      token,
      polling: config?.polling !== false, // 默认启用轮询
      ...config
    };

    // 初始化机器人
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
      const botInfo = await this.getBotInfo();
      console.log(`Telegram Bot started: @${botInfo.username}`);

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
      throw error;
    }
  }

  /**
   * 停止机器人
   */
  async stop(): Promise<void> {
    try {
      await this.bot.stopPolling();
      console.log('Telegram Bot stopped');
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
}
