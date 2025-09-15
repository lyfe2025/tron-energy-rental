/**
 * Telegram机器人回调查询处理器 - 主入口
 * 整合所有分离的回调处理器，保持原有接口不变
 */
import TelegramBot from 'node-telegram-bot-api';
import { orderService } from '../../order.js';
import { UserService } from '../../user.js';
import { EnergyCallbackHandler } from './handlers/EnergyCallbackHandler.js';
import { MenuCallbackHandler } from './handlers/MenuCallbackHandler.js';
import { OrderCallbackHandler } from './handlers/OrderCallbackHandler.js';
import { PriceCallbackHandler } from './handlers/PriceCallbackHandler.js';
import type {
  CallbackHandlerConstructorParams,
  CallbackHandlerDependencies
} from './types/callback.types.js';
import { CallbackValidator } from './utils/CallbackValidator.js';
import { ResponseFormatter } from './utils/ResponseFormatter.js';

export class CallbackHandler {
  private bot: TelegramBot;
  private userService: UserService;
  private orderService: typeof orderService;

  // 分离的处理器
  private orderHandler: OrderCallbackHandler;
  private energyHandler: EnergyCallbackHandler;
  private menuHandler: MenuCallbackHandler;
  private priceHandler: PriceCallbackHandler;

  constructor(params: CallbackHandlerConstructorParams | TelegramBot) {
    // Handle both old style (direct bot) and new style (params object)
    if (params && typeof params === 'object' && 'bot' in params) {
      this.bot = params.bot;
    } else {
      this.bot = params as TelegramBot;
    }
    
    this.userService = new UserService();
    this.orderService = orderService;

    // 创建依赖对象
    const dependencies: CallbackHandlerDependencies = {
      bot: this.bot,
      userService: this.userService,
      orderService: this.orderService
    };

    // 初始化分离的处理器
    this.orderHandler = new OrderCallbackHandler(dependencies);
    this.energyHandler = new EnergyCallbackHandler(dependencies);
    this.menuHandler = new MenuCallbackHandler(dependencies);
    this.priceHandler = new PriceCallbackHandler(dependencies);
  }

  /**
   * 安全地发送消息 - 保持向后兼容
   */
  private async safeSendMessage(chatId: number, text: string, options?: any): Promise<boolean> {
    return ResponseFormatter.safeSendMessage(this.bot, chatId, text, options);
  }

  /**
   * 安全地回答回调查询 - 保持向后兼容
   */
  private async safeAnswerCallbackQuery(callbackQueryId: string, options?: any): Promise<boolean> {
    return ResponseFormatter.safeAnswerCallbackQuery(this.bot, callbackQueryId, options);
  }

  /**
   * 统一的回调处理方法（别名） - 保持原有接口
   */
  async handleCallback(callbackQuery: TelegramBot.CallbackQuery): Promise<boolean> {
    try {
      await this.handleCallbackQuery(callbackQuery);
      return true;
    } catch (error) {
      console.error('处理回调失败:', error);
      return false;
    }
  }

  /**
   * 处理主要的回调查询路由 - 保持原有接口
   */
  async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const chatId = callbackQuery.message?.chat.id;
    const data = callbackQuery.data;
    
    if (!chatId || !data || !CallbackValidator.validateCallbackQuery(callbackQuery)) {
      return;
    }

    try {
      // 回答回调查询
      await this.safeAnswerCallbackQuery(callbackQuery.id);

      // 路由到具体处理方法
      await this.routeCallback(chatId, data, callbackQuery);
    } catch (error) {
      console.error('Error handling callback query:', error);
      
      // 安全地发送错误消息
      await this.safeSendMessage(chatId, '❌ 处理请求时发生错误，请重试。');
    }
  }

  /**
   * 回调路由分发 - 分发到各个专门的处理器
   */
  private async routeCallback(chatId: number, data: string, callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const telegramId = callbackQuery.from?.id;

    // 基础菜单回调
    switch (data) {
      case 'buy_energy':
        await this.menuHandler.handleBuyEnergy(chatId);
        break;
      case 'energy_flash':
        await this.energyHandler.handleEnergyFlash(chatId, telegramId);
        break;
      case 'transaction_package':
        await this.energyHandler.handleTransactionPackage(chatId, telegramId);
        break;
      case 'trx_exchange':
        await this.energyHandler.handleTrxExchange(chatId, telegramId);
        break;
      case 'my_orders':
        await this.menuHandler.handleMyOrders(chatId);
        break;
      case 'check_balance':
        await this.menuHandler.handleCheckBalance(chatId);
        break;
      case 'help_support':
        await this.menuHandler.handleHelpSupport(chatId);
        break;
      case 'refresh_menu':
        await this.menuHandler.handleRefreshMenu(chatId);
        break;
      case 'exchange_rates':
        await this.priceHandler.handleExchangeRates(chatId);
        break;
      case 'exchange_history':
        await this.priceHandler.handleExchangeHistory(chatId, telegramId);
        break;
      default:
        await this.handleDynamicCallbacks(chatId, data, callbackQuery);
        break;
    }
  }

  /**
   * 处理动态回调（基于前缀的回调）
   */
  private async handleDynamicCallbacks(chatId: number, data: string, callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const telegramId = callbackQuery.from?.id;

    // 套餐相关回调
    if (data.startsWith('package_')) {
      const packageId = CallbackValidator.extractIdFromCallbackData(data, 'package_');
      if (packageId) {
        await this.orderHandler.handleEnergyPackageSelection(chatId, packageId, telegramId);
      }
    }
    // 确认套餐回调
    else if (data.startsWith('confirm_package_')) {
      const packageId = CallbackValidator.extractIdFromCallbackData(data, 'confirm_package_');
      if (packageId) {
        await this.orderHandler.handlePackageConfirmation(chatId, packageId, telegramId?.toString());
      }
    }
    // 取消套餐回调
    else if (data.startsWith('cancel_package_')) {
      const packageId = CallbackValidator.extractIdFromCallbackData(data, 'cancel_package_');
      if (packageId) {
        await this.orderHandler.handlePackageCancellation(chatId, packageId);
      }
    }
    // 确认订单回调
    else if (data.startsWith('confirm_order_')) {
      const orderId = CallbackValidator.extractIdFromCallbackData(data, 'confirm_order_');
      if (orderId) {
        await this.orderHandler.handleOrderConfirmation(chatId, orderId);
      }
    }
    // 取消订单回调
    else if (data.startsWith('cancel_order_')) {
      const orderId = CallbackValidator.extractIdFromCallbackData(data, 'cancel_order_');
      if (orderId) {
        await this.orderHandler.handleOrderCancellation(chatId, orderId);
      }
    }
    // 委托状态回调
    else if (data.startsWith('delegation_status_')) {
      const delegationId = CallbackValidator.extractIdFromCallbackData(data, 'delegation_status_');
      if (delegationId) {
        await this.energyHandler.handleDelegationStatus(chatId, delegationId);
      }
    }
    // 价格配置相关回调
    else if (data.startsWith('price_')) {
      await this.priceHandler.handlePriceConfigCallback(chatId, data, telegramId);
    }
    // 兑换相关回调
    else if (data.startsWith('exchange_')) {
      if (data === 'exchange_rates') {
        await this.priceHandler.handleExchangeRates(chatId);
      } else if (data === 'exchange_history') {
        await this.priceHandler.handleExchangeHistory(chatId, telegramId);
      }
      // 可以添加更多兑换相关的处理
    }
    else {
      // 未知回调，记录日志但不报错
      console.warn(`Unknown callback data: ${data}`);
    }
  }

  /**
   * 注册回调查询处理器 - 保持原有接口
   */
  registerCallbacks(): void {
    this.bot.on('callback_query', async (callbackQuery) => {
      try {
        await this.handleCallbackQuery(callbackQuery);
      } catch (error) {
        console.error('Error in callback query handler:', error);
        if (callbackQuery.message?.chat.id) {
          await this.safeSendMessage(callbackQuery.message.chat.id, '❌ 处理请求时发生错误，请重试。');
        }
      }
    });
  }

  /**
   * 以下方法保持向后兼容，但已委托给专门的处理器
   */

  /**
   * @deprecated 使用 orderHandler.handleEnergyPackageSelection 替代
   */
  private async handleEnergyPackageSelection(chatId: number, packageId: string, telegramId?: number): Promise<void> {
    await this.orderHandler.handleEnergyPackageSelection(chatId, packageId, telegramId);
  }

  /**
   * @deprecated 使用 orderHandler.handlePackageConfirmation 替代
   */
  private async handlePackageConfirmation(chatId: number, packageId: string, telegramId?: string): Promise<void> {
    await this.orderHandler.handlePackageConfirmation(chatId, packageId, telegramId);
  }

  /**
   * @deprecated 使用 orderHandler.handleOrderConfirmation 替代
   */
  private async handleOrderConfirmation(chatId: number, orderId: string): Promise<void> {
    await this.orderHandler.handleOrderConfirmation(chatId, orderId);
  }

  /**
   * @deprecated 使用 orderHandler.handleOrderCancellation 替代
   */
  private async handleOrderCancellation(chatId: number, orderId: string): Promise<void> {
    await this.orderHandler.handleOrderCancellation(chatId, orderId);
  }

  /**
   * @deprecated 使用 energyHandler.handleDelegationStatus 替代
   */
  private async handleDelegationStatus(chatId: number, delegationId: string): Promise<void> {
    await this.energyHandler.handleDelegationStatus(chatId, delegationId);
  }

  /**
   * @deprecated 使用 energyHandler.handleEnergyFlash 替代
   */
  private async handleEnergyFlash(chatId: number, telegramId?: number): Promise<void> {
    await this.energyHandler.handleEnergyFlash(chatId, telegramId);
  }

  /**
   * @deprecated 使用 energyHandler.handleTransactionPackage 替代
   */
  private async handleTransactionPackage(chatId: number, telegramId?: number): Promise<void> {
    await this.energyHandler.handleTransactionPackage(chatId, telegramId);
  }

  /**
   * @deprecated 使用 energyHandler.handleTrxExchange 替代
   */
  private async handleTrxExchange(chatId: number, telegramId?: number): Promise<void> {
    await this.energyHandler.handleTrxExchange(chatId, telegramId);
  }
}