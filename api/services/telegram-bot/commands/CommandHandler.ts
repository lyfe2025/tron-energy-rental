/**
 * Telegram机器人命令处理器 - 主入口
 * 整合所有分离的命令处理器，保持原有接口不变
 */
import TelegramBot from 'node-telegram-bot-api';
import { orderService } from '../../order.js';
import { UserService } from '../../user.js';
import { HelpCommandHandler } from './handlers/HelpCommandHandler.js';
import { MenuCommandHandler } from './handlers/MenuCommandHandler.js';
import { OrderCommandHandler } from './handlers/OrderCommandHandler.js';
import { StartCommandHandler } from './handlers/StartCommandHandler.js';
import { StatsCommandHandler } from './handlers/StatsCommandHandler.js';
import { CommandValidator } from './middleware/CommandValidator.js';
import { UserContextManager } from './middleware/UserContextManager.js';
import type { CommandHandlerConstructorParams, CommandHandlerDependencies } from './types/command.types.js';
import { MessageFormatter } from './utils/MessageFormatter.js';

export class CommandHandler {
  private bot: TelegramBot;
  private userService: UserService;
  private orderService: typeof orderService;
  private botId?: string;

  // 分离的处理器
  private startHandler: StartCommandHandler;
  private menuHandler: MenuCommandHandler;
  private helpHandler: HelpCommandHandler;
  private orderHandler: OrderCommandHandler;
  private statsHandler: StatsCommandHandler;

  constructor(params: CommandHandlerConstructorParams | TelegramBot) {
    // Handle both old style (direct bot) and new style (params object)
    if (params && typeof params === 'object' && 'bot' in params) {
      this.bot = params.bot;
      this.botId = params.botId;
    } else {
      this.bot = params as TelegramBot;
    }
    
    this.userService = new UserService();
    this.orderService = orderService;

    // 创建依赖对象
    const dependencies: CommandHandlerDependencies = {
      bot: this.bot,
      userService: this.userService,
      orderService: this.orderService,
      botId: this.botId
    };

    // 初始化分离的处理器
    this.startHandler = new StartCommandHandler(dependencies);
    this.menuHandler = new MenuCommandHandler(dependencies);
    this.helpHandler = new HelpCommandHandler(dependencies);
    this.orderHandler = new OrderCommandHandler(dependencies);
    this.statsHandler = new StatsCommandHandler(dependencies);
  }

  /**
   * 替换消息中的用户占位符 - 保持向后兼容
   * @deprecated 使用 PlaceholderReplacer.replacePlaceholders 替代
   */
  private replacePlaceholders(message: string, telegramUser: TelegramBot.User): string {
    return message
      .replace(/{first_name}/g, telegramUser.first_name || '用户')
      .replace(/{last_name}/g, telegramUser.last_name || '')
      .replace(/{username}/g, telegramUser.username || '')
      .replace(/{full_name}/g, `${telegramUser.first_name || ''}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`.trim() || '用户');
  }

  /**
   * 处理 /start 命令 - 委托给专门的处理器
   */
  async handleStartCommand(msg: TelegramBot.Message): Promise<void> {
    await this.startHandler.handleStartCommand(msg);
  }

  /**
   * 处理 /menu 命令 - 委托给专门的处理器
   */
  async handleMenuCommand(msg: TelegramBot.Message): Promise<void> {
    await this.menuHandler.handleMenuCommand(msg);
  }

  /**
   * 处理 /help 命令 - 委托给专门的处理器
   */
  async handleHelpCommand(msg: TelegramBot.Message): Promise<void> {
    await this.helpHandler.handleHelpCommand(msg);
  }

  /**
   * 处理 /balance 命令 - 委托给专门的处理器
   */
  async handleBalanceCommand(msg: TelegramBot.Message): Promise<void> {
    await this.statsHandler.handleBalanceCommand(msg);
  }

  /**
   * 处理 /orders 命令 - 委托给专门的处理器
   */
  async handleOrdersCommand(msg: TelegramBot.Message): Promise<void> {
    await this.orderHandler.handleOrdersCommand(msg);
  }

  /**
   * 获取订单状态对应的表情符号 - 保持向后兼容
   * @deprecated 使用 MessageFormatter.getOrderStatusEmoji 替代
   */
  private getOrderStatusEmoji(status: string): string {
    return MessageFormatter.getOrderStatusEmoji(status);
  }

  /**
   * 处理回复键盘消息 - 分发到各个专门的处理器
   */
  async handleReplyKeyboardMessage(message: TelegramBot.Message): Promise<boolean> {
    if (!message.text) {
      return false;
    }

    const text = message.text.trim();
    const chatId = message.chat.id;
    const telegramId = message.from?.id;

    try {
      // 更新用户上下文
      if (message.from) {
        UserContextManager.createOrUpdateContext(message, this.botId);
      }

      // 价格配置相关的按钮不在这里处理，让它们传递给 PriceConfigMessageHandler
      if (CommandValidator.isPriceConfigButton(text)) {
        return false; // 让 PriceConfigMessageHandler 处理这些按钮
      }

      // 根据按钮文本处理对应功能（非价格配置按钮）
      switch (text) {
        case '📋 我的订单':
          await this.orderHandler.handleMyOrdersButton(message);
          return true;
        case '💰 账户余额':
          await this.statsHandler.handleBalanceButton(message);
          return true;
        case '❓ 帮助支持':
          await this.helpHandler.handleHelpSupportButton(message);
          return true;
        case '🔄 刷新菜单':
          await this.menuHandler.handleRefreshMenuButton(message);
          return true;
        default:
          return false; // 不是已知的回复键盘按钮
      }
    } catch (error) {
      console.error(`处理回复键盘消息 ${text} 失败:`, error);
      return false;
    }
  }

  /**
   * 统一的命令处理方法 - 保持原有接口
   */
  async handleCommand(message: TelegramBot.Message): Promise<boolean> {
    if (!message.text) {
      return false;
    }

    // 优先处理斜杠命令
    if (message.text.startsWith('/')) {
      const command = CommandValidator.extractCommand(message);
      
      if (!command) {
        return false;
      }

      try {
        switch (command) {
          case '/start':
            await this.handleStartCommand(message);
            return true;
          case '/menu':
            await this.handleMenuCommand(message);
            return true;
          case '/help':
            await this.handleHelpCommand(message);
            return true;
          case '/orders':
            await this.handleOrdersCommand(message);
            return true;
          case '/balance':
            await this.handleBalanceCommand(message);
            return true;
          default:
            return false; // 未知命令
        }
      } catch (error) {
        console.error(`处理命令 ${command} 失败:`, error);
        return false;
      }
    } else {
      // 处理回复键盘消息
      return await this.handleReplyKeyboardMessage(message);
    }
  }

  /**
   * 处理回调查询中的命令相关回调
   */
  async handleCallbackCommands(chatId: number, data: string, telegramId?: number): Promise<boolean> {
    try {
      switch (data) {
        case 'my_orders':
          await this.orderHandler.handleMyOrdersCallback(chatId, telegramId);
          return true;
        case 'check_balance':
          await this.statsHandler.handleBalanceCallback(chatId, telegramId);
          return true;
        case 'help_support':
          await this.helpHandler.handleHelpSupportCallback(chatId);
          return true;
        case 'refresh_menu':
          await this.menuHandler.handleRefreshMenuCallback(chatId);
          return true;
        case 'user_stats':
          await this.statsHandler.handleUserStats(chatId, telegramId);
          return true;
        default:
          // 检查是否是订单详情查询
          if (data.startsWith('order_detail_')) {
            const orderId = data.replace('order_detail_', '');
            await this.orderHandler.handleOrderDetail(chatId, orderId, telegramId);
            return true;
          }
          return false;
      }
    } catch (error) {
      console.error(`处理回调命令 ${data} 失败:`, error);
      return false;
    }
  }

  /**
   * 注册所有命令处理器 - 保持原有接口
   */
  registerCommands(): void {
    // 注册各个处理器的命令
    this.startHandler.registerStartCommand();
    this.menuHandler.registerMenuCommand();
    this.helpHandler.registerHelpCommand();
    this.orderHandler.registerOrdersCommand();
    this.statsHandler.registerBalanceCommand();

    // 设置定期清理过期的用户上下文
    setInterval(() => {
      UserContextManager.cleanupExpiredContexts(24); // 24小时过期
    }, 60 * 60 * 1000); // 每小时检查一次
  }

  /**
   * 获取活跃用户统计
   */
  getActiveUserStats(): { count: number; contexts: any[] } {
    return {
      count: UserContextManager.getActiveUserCount(),
      contexts: UserContextManager.getAllContexts()
    };
  }

  /**
   * 获取用户上下文
   */
  getUserContext(telegramId: number): any {
    return UserContextManager.getUserContext(telegramId);
  }

  /**
   * 更新用户活动时间
   */
  updateUserActivity(telegramId: number): void {
    UserContextManager.updateLastActivity(telegramId);
  }

  /**
   * 获取当前处理器实例（用于测试和调试）
   */
  getHandlers() {
    return {
      start: this.startHandler,
      menu: this.menuHandler,
      help: this.helpHandler,
      order: this.orderHandler,
      stats: this.statsHandler
    };
  }

  /**
   * 以下方法保持向后兼容，但已委托给专门的处理器
   */

  /**
   * @deprecated 使用 getBotConfig() 从各个处理器获取配置
   */
  private async getBotConfig(): Promise<any> {
    console.warn('getBotConfig() is deprecated. Use specific handler\'s getBotConfig() method instead.');
    return null;
  }
}