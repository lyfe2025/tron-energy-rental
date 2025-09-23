/**
 * 菜单回调处理器
 * 处理菜单相关的回调操作
 */
import TelegramBot from 'node-telegram-bot-api';
import type { CallbackContext } from '../core/CallbackDispatcher.ts';
import { KeyboardBuilder } from '../keyboards/KeyboardBuilder.ts';
import { BaseCallbackHandler } from './BaseCallbackHandler.ts';

export class MenuCallbackHandler extends BaseCallbackHandler {
  private keyboardBuilder: KeyboardBuilder;

  constructor(bot: TelegramBot, botId: string, keyboardBuilder: KeyboardBuilder) {
    super(bot, botId);
    this.keyboardBuilder = keyboardBuilder;
  }

  /**
   * 显示主菜单
   */
  async showMainMenu(context: CallbackContext): Promise<void> {
    try {
      await this.keyboardBuilder.showMainMenu(context.chatId);
    } catch (error) {
      console.error('显示主菜单失败:', error);
      await this.bot.sendMessage(context.chatId, '❌ 菜单加载失败，请稍后重试。');
    }
  }

  /**
   * 显示能量套餐
   */
  async showEnergyPackages(context: CallbackContext): Promise<void> {
    try {
      await this.keyboardBuilder.showEnergyPackages(context.chatId);
    } catch (error) {
      console.error('显示能量套餐失败:', error);
      await this.bot.sendMessage(context.chatId, '❌ 套餐信息加载失败，请稍后重试。');
    }
  }

  /**
   * 显示笔数套餐
   */
  async showTransactionPackages(context: CallbackContext): Promise<void> {
    try {
      await this.keyboardBuilder.showTransactionPackages(context.chatId);
    } catch (error) {
      console.error('显示笔数套餐失败:', error);
      await this.bot.sendMessage(context.chatId, '❌ 套餐信息加载失败，请稍后重试。');
    }
  }

  /**
   * 显示TRX闪兑
   */
  async showTrxExchange(context: CallbackContext): Promise<void> {
    try {
      await this.keyboardBuilder.showTrxExchange(context.chatId);
    } catch (error) {
      console.error('显示TRX闪兑失败:', error);
      await this.bot.sendMessage(context.chatId, '❌ 兑换信息加载失败，请稍后重试。');
    }
  }
}
