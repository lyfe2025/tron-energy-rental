/**
 * 菜单回调处理器
 * 处理菜单相关的回调查询
 */
import TelegramBot from 'node-telegram-bot-api';
import type { CallbackHandlerDependencies } from '../types/callback.types.js';
import { ResponseFormatter } from '../utils/ResponseFormatter.js';

export class MenuCallbackHandler {
  private bot: TelegramBot;

  // 索引签名以支持动态方法调用
  [methodName: string]: any;

  constructor(dependencies: CallbackHandlerDependencies) {
    this.bot = dependencies.bot;
  }

  /**
   * 处理购买能量按钮
   */
  async handleBuyEnergy(chatId: number): Promise<void> {
    try {
      const message = `⚡ 能量购买服务\n\n` +
        `选择您需要的服务类型：`;

      const keyboard = ResponseFormatter.createInlineKeyboard([
        [
          { text: '⚡ 能量闪租', callback_data: 'energy_flash' },
          { text: '🔥 笔数套餐', callback_data: 'transaction_package' }
        ],
        [
          { text: '💱 TRX闪兑', callback_data: 'trx_exchange' }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]);

      await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('处理购买能量失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理购买能量请求时发生错误，请重试。');
    }
  }

  /**
   * 处理我的订单按钮
   */
  async handleMyOrders(chatId: number): Promise<void> {
    try {
      // 这里会被CommandHandler处理，所以暂时只是占位
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '📋 正在加载订单信息...');
    } catch (error) {
      console.error('处理我的订单失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理订单查询请求时发生错误，请重试。');
    }
  }

  /**
   * 处理余额查询按钮
   */
  async handleCheckBalance(chatId: number): Promise<void> {
    try {
      // 这里会被CommandHandler处理，所以暂时只是占位
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '💰 正在查询账户余额...');
    } catch (error) {
      console.error('处理余额查询失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理余额查询请求时发生错误，请重试。');
    }
  }

  /**
   * 处理帮助支持按钮
   */
  async handleHelpSupport(chatId: number): Promise<void> {
    try {
      // 这里会被CommandHandler处理，所以暂时只是占位
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❓ 正在加载帮助信息...');
    } catch (error) {
      console.error('处理帮助支持失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理帮助请求时发生错误，请重试。');
    }
  }

  /**
   * 处理刷新菜单按钮
   */
  async handleRefreshMenu(chatId: number): Promise<void> {
    try {
      // 这里会被CommandHandler处理，所以暂时只是占位
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '🔄 正在刷新菜单...');
    } catch (error) {
      console.error('处理刷新菜单失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理菜单刷新请求时发生错误，请重试。');
    }
  }
}
