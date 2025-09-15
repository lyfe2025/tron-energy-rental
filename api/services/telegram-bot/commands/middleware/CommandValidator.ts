/**
 * 命令验证器
 * 验证命令的有效性和权限
 */
import TelegramBot from 'node-telegram-bot-api';

export class CommandValidator {
  /**
   * 验证消息是否包含有效命令
   */
  static isValidCommand(message: TelegramBot.Message): boolean {
    return !!(message.text && message.text.startsWith('/'));
  }

  /**
   * 验证回复键盘消息
   */
  static isValidReplyKeyboardMessage(message: TelegramBot.Message): boolean {
    return !!(message.text && !message.text.startsWith('/'));
  }

  /**
   * 提取命令名称
   */
  static extractCommand(message: TelegramBot.Message): string | null {
    if (!message.text || !message.text.startsWith('/')) {
      return null;
    }
    return message.text.split(' ')[0].toLowerCase();
  }

  /**
   * 提取命令参数
   */
  static extractCommandArgs(message: TelegramBot.Message): string[] {
    if (!message.text || !message.text.startsWith('/')) {
      return [];
    }
    const parts = message.text.split(' ');
    return parts.slice(1);
  }

  /**
   * 验证用户信息
   */
  static validateUserInfo(user?: TelegramBot.User): boolean {
    return !!(user && user.id);
  }

  /**
   * 验证聊天信息
   */
  static validateChatInfo(chatId?: number): boolean {
    return typeof chatId === 'number' && chatId !== 0;
  }

  /**
   * 检查命令是否需要用户认证
   */
  static requiresAuthentication(command: string): boolean {
    const authRequiredCommands = ['/balance', '/orders', '/setaddress'];
    return authRequiredCommands.includes(command);
  }

  /**
   * 检查命令是否为管理员命令
   */
  static isAdminCommand(command: string): boolean {
    const adminCommands = ['/admin', '/stats', '/config'];
    return adminCommands.includes(command);
  }

  /**
   * 验证TRON地址格式
   */
  static validateTronAddress(address: string): boolean {
    // TRON地址以T开头，长度为34位
    return /^T[A-Za-z0-9]{33}$/.test(address);
  }

  /**
   * 检查消息是否为价格配置按钮
   */
  static isPriceConfigButton(text: string): boolean {
    const priceConfigButtons = ['⚡ 能量闪租', '🔥 笔数套餐', '🔄 TRX闪兑'];
    return priceConfigButtons.includes(text);
  }

  /**
   * 检查消息是否为标准菜单按钮
   */
  static isStandardMenuButton(text: string): boolean {
    const standardButtons = ['📋 我的订单', '💰 账户余额', '❓ 帮助支持', '🔄 刷新菜单'];
    return standardButtons.includes(text);
  }
}