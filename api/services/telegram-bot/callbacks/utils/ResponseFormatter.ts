/**
 * 响应格式化工具
 */
import TelegramBot from 'node-telegram-bot-api';
import type { MessageSendOptions } from '../types/callback.types.js';

export class ResponseFormatter {
  /**
   * 安全地发送消息
   */
  static async safeSendMessage(
    bot: TelegramBot, 
    chatId: number, 
    text: string, 
    options?: MessageSendOptions
  ): Promise<boolean> {
    try {
      if (!bot) {
        console.error('Bot instance is null or undefined');
        return false;
      }

      if (typeof bot.sendMessage !== 'function') {
        console.error('Bot sendMessage method is not available');
        return false;
      }

      await bot.sendMessage(chatId, text, options);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * 安全地回答回调查询
   */
  static async safeAnswerCallbackQuery(
    bot: TelegramBot, 
    callbackQueryId: string, 
    options?: any
  ): Promise<boolean> {
    try {
      if (!bot) {
        console.error('Bot instance is null or undefined');
        return false;
      }

      if (typeof bot.answerCallbackQuery !== 'function') {
        console.error('Bot answerCallbackQuery method is not available');
        return false;
      }

      await bot.answerCallbackQuery(callbackQueryId, options);
      return true;
    } catch (error) {
      console.error('Failed to answer callback query:', error);
      return false;
    }
  }

  /**
   * 创建内联键盘
   */
  static createInlineKeyboard(buttons: Array<Array<{ text: string; callback_data: string }>>) {
    return {
      inline_keyboard: buttons
    };
  }

  /**
   * 格式化数字显示
   */
  static formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * 格式化地址显示
   */
  static formatAddress(address: string, maxLength: number = 10): string {
    if (address.length <= maxLength * 2) {
      return address;
    }
    return `${address.slice(0, maxLength)}...${address.slice(-maxLength)}`;
  }
}
