/**
 * 订单回调处理器 - 重构版
 * 使用分离的专门处理器来处理不同类型的订单回调
 * 保持原有API接口不变，确保向下兼容
 */
import TelegramBot from 'node-telegram-bot-api';
import { orderService } from '../../../order.ts';
import { StateManager } from '../../core/StateManager.ts';
import type { CallbackHandlerDependencies } from '../types/callback.types.ts';
import { CurrencyHandler } from './specialized/CurrencyHandler.ts';
import { EnergyPackageHandler } from './specialized/EnergyPackageHandler.ts';
import { OrderManagementHandler } from './specialized/OrderManagementHandler.ts';
import { TransactionPackageHandler } from './specialized/TransactionPackageHandler.ts';

export class OrderCallbackHandler {
  private bot: TelegramBot;
  private stateManager?: StateManager;

  // 专门处理器
  private transactionPackageHandler: TransactionPackageHandler;
  private currencyHandler: CurrencyHandler;
  private orderManagementHandler: OrderManagementHandler;
  private energyPackageHandler: EnergyPackageHandler;

  // 索引签名以支持动态方法调用
  [methodName: string]: any;

  constructor(dependencies: CallbackHandlerDependencies) {
    this.bot = dependencies.bot;
    this.stateManager = dependencies.stateManager;

    // 初始化专门处理器
    this.transactionPackageHandler = new TransactionPackageHandler(this.bot, this.stateManager);
    this.currencyHandler = new CurrencyHandler(this.bot, this.stateManager);
    this.orderManagementHandler = new OrderManagementHandler(this.bot, orderService);
    this.energyPackageHandler = new EnergyPackageHandler(this.bot, orderService);
  }

  /**
   * 处理笔数套餐选择（transaction_package_10, transaction_package_20 等）
   */
  async handleTransactionPackageSelection(chatId: number, transactionCount: string, telegramId?: number): Promise<void> {
    return this.transactionPackageHandler.handleTransactionPackageSelection(chatId, transactionCount, telegramId);
  }

  /**
   * 处理货币切换（USDT -> TRX）
   */
  async handleCurrencySwitch(chatId: number, orderInfo: any, messageId?: number): Promise<void> {
    return this.currencyHandler.handleCurrencySwitch(chatId, orderInfo, messageId);
  }

  /**
   * 处理切换回USDT支付
   */
  async handleCurrencySwitchBack(chatId: number, orderInfo: any, messageId?: number): Promise<void> {
    return this.currencyHandler.handleCurrencySwitchBack(chatId, orderInfo, messageId);
  }

  /**
   * 处理订单取消
   */
  async handleOrderCancellation(chatId: number, orderId: string, messageId?: number): Promise<void> {
    return this.orderManagementHandler.handleOrderCancellation(chatId, orderId, messageId);
  }

  /**
   * 处理订单确认
   */
  async handleOrderConfirmation(chatId: number, orderId: string): Promise<void> {
    return this.orderManagementHandler.handleOrderConfirmation(chatId, orderId);
  }

  /**
   * 处理能量套餐选择
   */
  async handleEnergyPackageSelection(chatId: number, packageId: string, telegramId?: number): Promise<void> {
    return this.energyPackageHandler.handleEnergyPackageSelection(chatId, packageId, telegramId);
  }

  /**
   * 处理套餐确认
   */
  async handlePackageConfirmation(chatId: number, packageId: string, telegramId?: string): Promise<void> {
    return this.energyPackageHandler.handlePackageConfirmation(chatId, packageId, telegramId);
  }

  /**
   * 处理套餐取消
   */
  async handlePackageCancellation(chatId: number, packageId: string): Promise<void> {
    return this.energyPackageHandler.handlePackageCancellation(chatId, packageId);
  }
}

/*
 * 重构说明：
 * 
 * 1. 原来的OrderCallbackHandler.ts文件过于庞大（653行），包含了多种功能的处理逻辑
 * 2. 现在已经分离为以下专门处理器：
 *    - TransactionPackageHandler: 处理笔数套餐相关操作
 *    - CurrencyHandler: 处理货币切换（USDT/TRX）
 *    - OrderManagementHandler: 处理订单管理（确认、取消等）
 *    - EnergyPackageHandler: 处理能量套餐相关操作
 *    - MessageFormatter: 负责各种消息格式化
 * 
 * 3. 优势：
 *    - 代码更加模块化，易于维护
 *    - 每个处理器专注于单一职责
 *    - 保持了原有API接口不变，确保向下兼容
 *    - 方便单独测试和扩展
 * 
 * 4. 所有私有方法已经移动到相应的专门处理器中：
 *    - formatTrxConfirmation() -> MessageFormatter.formatTrxConfirmation()
 *    - formatTrxConfirmationFromUsdt() -> MessageFormatter.formatTrxConfirmationFromUsdt()
 *    - formatUsdtConfirmation() -> MessageFormatter.formatUsdtConfirmation()
 *    - getPackageInfo() -> EnergyPackageHandler.getPackageInfo()
 */
