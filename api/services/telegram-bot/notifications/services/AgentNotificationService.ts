/**
 * 代理通知服务
 * 处理代理申请、佣金、等级升级等代理相关通知
 */

import TelegramBot from 'node-telegram-bot-api';
import type { BotNotificationConfig, SendResult } from '../../types/notification.types.ts';

export class AgentNotificationService {
  private bot: TelegramBot;
  private botId: string;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
  }

  /**
   * 发送代理申请提交通知
   */
  async sendApplicationSubmittedNotification(
    userId: string,
    applicationData: any,
    config: BotNotificationConfig
  ): Promise<SendResult> {
    // 代理通知的具体实现
    // 这里是简化版本，实际实现类似 BusinessNotificationService
    return { success: true, reason: 'Agent notification service placeholder' };
  }

  /**
   * 发送佣金到账通知
   */
  async sendCommissionEarnedNotification(
    userId: string,
    commissionData: any,
    config: BotNotificationConfig
  ): Promise<SendResult> {
    // 佣金通知的具体实现
    return { success: true, reason: 'Commission notification service placeholder' };
  }

  /**
   * 发送等级升级通知
   */
  async sendLevelUpgradeNotification(
    userId: string,
    upgradeData: any,
    config: BotNotificationConfig
  ): Promise<SendResult> {
    // 等级升级通知的具体实现
    return { success: true, reason: 'Level upgrade notification service placeholder' };
  }
}
