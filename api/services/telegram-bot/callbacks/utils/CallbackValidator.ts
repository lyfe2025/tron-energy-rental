/**
 * 回调验证工具
 */
import TelegramBot from 'node-telegram-bot-api';

export class CallbackValidator {
  /**
   * 验证回调查询是否有效
   */
  static validateCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): boolean {
    const chatId = callbackQuery.message?.chat.id;
    const data = callbackQuery.data;
    
    return !!(chatId && data);
  }

  /**
   * 验证用户信息是否有效
   */
  static validateUserInfo(telegramId?: number): boolean {
    return typeof telegramId === 'number' && telegramId > 0;
  }

  /**
   * 验证包ID格式
   */
  static validatePackageId(packageId: string): boolean {
    return /^\d+$/.test(packageId);
  }

  /**
   * 验证订单ID格式
   */
  static validateOrderId(orderId: string): boolean {
    return /^\d+$/.test(orderId);
  }

  /**
   * 验证委托ID格式
   */
  static validateDelegationId(delegationId: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(delegationId);
  }

  /**
   * 从回调数据中提取ID
   */
  static extractIdFromCallbackData(data: string, prefix: string): string | null {
    if (data.startsWith(prefix)) {
      return data.replace(prefix, '');
    }
    return null;
  }
}
