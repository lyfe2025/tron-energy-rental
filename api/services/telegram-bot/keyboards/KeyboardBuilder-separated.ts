/**
 * Telegram机器人键盘构建器 - 分离版本
 * 集成各个分离的模块，保持原有接口不变
 */
import TelegramBot from 'node-telegram-bot-api';
import type { EnergyPackage, InlineKeyboard, OrderInfo } from '../types/bot.types.js';

// 导入分离的模块
import { BaseKeyboardBuilder } from './builders/BaseKeyboardBuilder.js';
import { PriceConfigMessageBuilder } from './builders/PriceConfigMessageBuilder.js';
import { DatabaseKeyboardManager } from './managers/DatabaseKeyboardManager.js';

export class KeyboardBuilder {
  private bot: TelegramBot;
  private botId: string;
  
  // 分离后的模块实例
  private baseKeyboardBuilder: BaseKeyboardBuilder;
  private priceConfigMessageBuilder: PriceConfigMessageBuilder;
  private databaseKeyboardManager: DatabaseKeyboardManager;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
    
    // 初始化分离的模块
    this.baseKeyboardBuilder = new BaseKeyboardBuilder(bot, botId);
    this.priceConfigMessageBuilder = new PriceConfigMessageBuilder(bot, botId);
    this.databaseKeyboardManager = new DatabaseKeyboardManager(bot, botId);
  }

  // ========== 基础键盘构建方法（委托给BaseKeyboardBuilder） ==========

  /**
   * 构建主菜单键盘
   */
  buildMainMenuKeyboard(): InlineKeyboard {
    return this.baseKeyboardBuilder.buildMainMenuKeyboard();
  }

  /**
   * 构建能量套餐选择键盘
   */
  buildEnergyPackagesKeyboard(packages: EnergyPackage[]): InlineKeyboard {
    return this.baseKeyboardBuilder.buildEnergyPackagesKeyboard(packages);
  }

  /**
   * 构建套餐确认键盘
   */
  buildPackageConfirmationKeyboard(packageId: string): InlineKeyboard {
    return this.baseKeyboardBuilder.buildPackageConfirmationKeyboard(packageId);
  }

  /**
   * 构建订单确认键盘
   */
  buildOrderConfirmationKeyboard(orderId: string): InlineKeyboard {
    return this.baseKeyboardBuilder.buildOrderConfirmationKeyboard(orderId);
  }

  /**
   * 构建委托状态查看键盘
   */
  buildDelegationStatusKeyboard(delegationId: string): InlineKeyboard {
    return this.baseKeyboardBuilder.buildDelegationStatusKeyboard(delegationId);
  }

  /**
   * 构建ReplyKeyboard（回复键盘）
   */
  buildReplyKeyboard(config: any): TelegramBot.ReplyKeyboardMarkup {
    return this.baseKeyboardBuilder.buildReplyKeyboard(config);
  }

  /**
   * 构建InlineKeyboard（内嵌键盘）
   */
  buildInlineKeyboardFromConfig(config: any): InlineKeyboard {
    return this.baseKeyboardBuilder.buildInlineKeyboardFromConfig(config);
  }

  /**
   * 显示套餐确认界面
   */
  async showPackageConfirmation(chatId: number, packageId: string, tronAddress?: string): Promise<void> {
    return this.baseKeyboardBuilder.showPackageConfirmation(chatId, packageId, tronAddress);
  }

  /**
   * 显示订单支付界面
   */
  async showOrderPayment(chatId: number, orderInfo: OrderInfo): Promise<void> {
    return this.baseKeyboardBuilder.showOrderPayment(chatId, orderInfo);
  }

  // ========== 价格配置消息方法（委托给PriceConfigMessageBuilder） ==========

  /**
   * 通用方法：根据价格配置发送消息（支持图片和内嵌键盘）
   */
  async sendPriceConfigMessage(chatId: number, modeType: string): Promise<void> {
    return this.priceConfigMessageBuilder.sendPriceConfigMessage(chatId, modeType);
  }

  /**
   * 显示能量套餐（使用通用价格配置消息方法）
   */
  async showEnergyPackages(chatId: number): Promise<void> {
    return this.priceConfigMessageBuilder.showEnergyPackages(chatId);
  }

  /**
   * 显示笔数套餐（使用通用价格配置消息方法）
   */
  async showTransactionPackages(chatId: number): Promise<void> {
    return this.priceConfigMessageBuilder.showTransactionPackages(chatId);
  }

  /**
   * 显示TRX闪兑（使用通用价格配置消息方法）
   */
  async showTrxExchange(chatId: number): Promise<void> {
    return this.priceConfigMessageBuilder.showTrxExchange(chatId);
  }

  // ========== 数据库配置方法（委托给DatabaseKeyboardManager） ==========

  /**
   * 从数据库获取机器人键盘配置
   */
  private async getBotKeyboardConfig(): Promise<any> {
    return this.databaseKeyboardManager.getBotKeyboardConfig();
  }

  /**
   * 显示主菜单（支持从数据库配置读取）
   */
  async showMainMenu(chatId: number): Promise<void> {
    const defaultKeyboard = this.buildMainMenuKeyboard();
    return this.databaseKeyboardManager.showMainMenuFromConfig(chatId, defaultKeyboard);
  }
}
