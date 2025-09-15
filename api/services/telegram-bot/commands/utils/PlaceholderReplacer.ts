/**
 * 占位符替换工具
 */
import TelegramBot from 'node-telegram-bot-api';

export class PlaceholderReplacer {
  /**
   * 替换消息中的用户占位符
   */
  static replacePlaceholders(message: string, telegramUser: TelegramBot.User): string {
    return message
      .replace(/{first_name}/g, telegramUser.first_name || '用户')
      .replace(/{last_name}/g, telegramUser.last_name || '')
      .replace(/{username}/g, telegramUser.username || '')
      .replace(/{full_name}/g, `${telegramUser.first_name || ''}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`.trim() || '用户');
  }

  /**
   * 替换通用占位符
   */
  static replaceGeneralPlaceholders(message: string, replacements: Record<string, string>): string {
    let result = message;
    for (const [placeholder, value] of Object.entries(replacements)) {
      const regex = new RegExp(`{${placeholder}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * 获取消息中的所有占位符
   */
  static extractPlaceholders(message: string): string[] {
    const regex = /{([^}]+)}/g;
    const placeholders: string[] = [];
    let match;
    
    while ((match = regex.exec(message)) !== null) {
      placeholders.push(match[1]);
    }
    
    return placeholders;
  }

  /**
   * 验证占位符是否有效
   */
  static validatePlaceholders(message: string, allowedPlaceholders: string[]): boolean {
    const foundPlaceholders = this.extractPlaceholders(message);
    return foundPlaceholders.every(placeholder => allowedPlaceholders.includes(placeholder));
  }
}
