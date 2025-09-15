/**
 * 用户上下文管理器
 * 管理用户会话状态和上下文信息
 */
import TelegramBot from 'node-telegram-bot-api';
import type { UserRegistrationData } from '../types/command.types.js';

export interface UserContext {
  telegramId: number;
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  isPremium?: boolean;
  lastActivity: Date;
  currentCommand?: string;
  botId?: string;
}

export class UserContextManager {
  private static userContexts: Map<number, UserContext> = new Map();

  /**
   * 创建或更新用户上下文
   */
  static createOrUpdateContext(
    message: TelegramBot.Message, 
    botId?: string
  ): UserContext | null {
    const user = message.from;
    const chatId = message.chat.id;

    if (!user) {
      return null;
    }

    const context: UserContext = {
      telegramId: user.id,
      chatId,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      languageCode: user.language_code,
      isPremium: (user as any).is_premium,
      lastActivity: new Date(),
      botId
    };

    this.userContexts.set(user.id, context);
    return context;
  }

  /**
   * 获取用户上下文
   */
  static getUserContext(telegramId: number): UserContext | null {
    return this.userContexts.get(telegramId) || null;
  }

  /**
   * 更新用户活动时间
   */
  static updateLastActivity(telegramId: number): void {
    const context = this.userContexts.get(telegramId);
    if (context) {
      context.lastActivity = new Date();
    }
  }

  /**
   * 设置当前命令
   */
  static setCurrentCommand(telegramId: number, command: string): void {
    const context = this.userContexts.get(telegramId);
    if (context) {
      context.currentCommand = command;
    }
  }

  /**
   * 清除当前命令
   */
  static clearCurrentCommand(telegramId: number): void {
    const context = this.userContexts.get(telegramId);
    if (context) {
      context.currentCommand = undefined;
    }
  }

  /**
   * 获取当前命令
   */
  static getCurrentCommand(telegramId: number): string | undefined {
    const context = this.userContexts.get(telegramId);
    return context?.currentCommand;
  }

  /**
   * 清理过期的用户上下文
   */
  static cleanupExpiredContexts(maxAgeHours: number = 24): void {
    const maxAge = maxAgeHours * 60 * 60 * 1000; // 转换为毫秒
    const now = new Date();

    for (const [telegramId, context] of this.userContexts.entries()) {
      if (now.getTime() - context.lastActivity.getTime() > maxAge) {
        this.userContexts.delete(telegramId);
      }
    }
  }

  /**
   * 从用户上下文生成注册数据
   */
  static createRegistrationData(context: UserContext): UserRegistrationData {
    return {
      telegram_id: context.telegramId,
      username: context.username,
      first_name: context.firstName,
      last_name: context.lastName,
      language_code: context.languageCode,
      is_premium: context.isPremium,
      bot_id: context.botId
    };
  }

  /**
   * 获取所有活跃用户数量
   */
  static getActiveUserCount(): number {
    return this.userContexts.size;
  }

  /**
   * 获取所有用户上下文
   */
  static getAllContexts(): UserContext[] {
    return Array.from(this.userContexts.values());
  }

  /**
   * 删除用户上下文
   */
  static removeUserContext(telegramId: number): void {
    this.userContexts.delete(telegramId);
  }

  /**
   * 检查用户是否存在上下文
   */
  static hasUserContext(telegramId: number): boolean {
    return this.userContexts.has(telegramId);
  }
}
