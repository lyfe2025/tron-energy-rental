/**
 * 业务通知服务
 * 处理订单、支付、能量代理等业务相关通知
 */

import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../config/database.ts';
import type { BotNotificationConfig, SendResult } from '../../types/notification.types.ts';
import { recordDeliveryResult } from '../utils/deliveryTracker.ts';
import { formatAmount, formatEnergyAmount, formatTimestamp, formatTransactionHash, getStatusIcon } from '../utils/messageFormatter.ts';
import { renderTemplate } from '../utils/templateRenderer.ts';

export class BusinessNotificationService {
  private bot: TelegramBot;
  private botId: string;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
  }

  /**
   * 发送订单创建通知
   */
  async sendOrderCreatedNotification(
    userId: string,
    orderData: any,
    config: BotNotificationConfig
  ): Promise<SendResult> {
    if (!config.business_notifications?.enabled || !config.business_notifications?.order_created?.enabled) {
      return { success: false, reason: 'Order created notifications disabled' };
    }

    const chatId = await this.getUserChatId(userId);
    if (!chatId) {
      return { success: false, reason: 'User chat ID not found' };
    }

    try {
      const template = await this.getTemplate('order_created', config.default_language);
      
      const templateData = {
        user_name: orderData.user_name || '用户',
        order_id: orderData.order_id,
        energy_amount: formatEnergyAmount(orderData.energy_amount),
        trx_amount: formatAmount(orderData.trx_amount, 'TRX'),
        total_amount: formatAmount(orderData.total_amount, 'USDT'),
        created_at: formatTimestamp(orderData.created_at),
        status_icon: getStatusIcon('order'),
        ...orderData
      };

      const messageContent = await renderTemplate(template, templateData);
      
      // 延迟发送（如果配置了延迟）
      const delaySeconds = config.business_notifications.order_created?.delay_seconds || 0;
      if (delaySeconds > 0) {
        setTimeout(async () => {
          await this.sendMessage(chatId, messageContent, userId, 'order_created');
        }, delaySeconds * 1000);
      } else {
        await this.sendMessage(chatId, messageContent, userId, 'order_created');
      }

      return { success: true, templateId: template.id };
    } catch (error) {
      console.error('发送订单创建通知失败:', error);
      return { success: false, reason: error.message, error };
    }
  }

  /**
   * 发送支付成功通知
   */
  async sendPaymentSuccessNotification(
    userId: string,
    paymentData: any,
    config: BotNotificationConfig
  ): Promise<SendResult> {
    if (!config.business_notifications?.enabled || !config.business_notifications?.payment_success?.enabled) {
      return { success: false, reason: 'Payment success notifications disabled' };
    }

    const chatId = await this.getUserChatId(userId);
    if (!chatId) {
      return { success: false, reason: 'User chat ID not found' };
    }

    try {
      const template = await this.getTemplate('payment_success', config.default_language);
      
      const templateData = {
        user_name: paymentData.user_name || '用户',
        order_id: paymentData.order_id,
        payment_amount: formatAmount(paymentData.amount, paymentData.currency),
        transaction_hash: formatTransactionHash(paymentData.transaction_hash),
        payment_method: paymentData.payment_method || 'TRX',
        completed_at: formatTimestamp(paymentData.completed_at),
        status_icon: getStatusIcon('success'),
        ...paymentData
      };

      const messageContent = await renderTemplate(template, templateData);
      
      // 如果配置了包含图片，添加支付成功图片
      if (config.business_notifications.payment_success?.include_image && paymentData.receipt_image) {
        messageContent.image_url = paymentData.receipt_image;
      }

      await this.sendMessage(chatId, messageContent, userId, 'payment_success');

      return { success: true, templateId: template.id };
    } catch (error) {
      console.error('发送支付成功通知失败:', error);
      return { success: false, reason: error.message, error };
    }
  }

  /**
   * 发送支付失败通知
   */
  async sendPaymentFailedNotification(
    userId: string,
    paymentData: any,
    config: BotNotificationConfig
  ): Promise<SendResult> {
    if (!config.business_notifications?.enabled || !config.business_notifications?.payment_failed?.enabled) {
      return { success: false, reason: 'Payment failed notifications disabled' };
    }

    const chatId = await this.getUserChatId(userId);
    if (!chatId) {
      return { success: false, reason: 'User chat ID not found' };
    }

    try {
      const template = await this.getTemplate('payment_failed', config.default_language);
      
      const templateData = {
        user_name: paymentData.user_name || '用户',
        order_id: paymentData.order_id,
        payment_amount: formatAmount(paymentData.amount, paymentData.currency),
        failure_reason: paymentData.failure_reason || '支付处理失败',
        failed_at: formatTimestamp(paymentData.failed_at),
        status_icon: getStatusIcon('failed'),
        retry_allowed: paymentData.retry_allowed || false,
        ...paymentData
      };

      const messageContent = await renderTemplate(template, templateData);
      await this.sendMessage(chatId, messageContent, userId, 'payment_failed');

      // 如果配置了重试通知，发送重试提醒
      if (config.business_notifications.payment_failed?.retry_notification && paymentData.retry_allowed) {
        setTimeout(async () => {
          await this.sendRetryPaymentNotification(userId, paymentData, config);
        }, 5 * 60 * 1000); // 5分钟后发送重试提醒
      }

      return { success: true, templateId: template.id };
    } catch (error) {
      console.error('发送支付失败通知失败:', error);
      return { success: false, reason: error.message, error };
    }
  }

  /**
   * 发送能量代理完成通知
   */
  async sendEnergyDelegationCompleteNotification(
    userId: string,
    delegationData: any,
    config: BotNotificationConfig
  ): Promise<SendResult> {
    if (!config.business_notifications?.enabled || !config.business_notifications?.energy_delegation_complete?.enabled) {
      return { success: false, reason: 'Energy delegation complete notifications disabled' };
    }

    const chatId = await this.getUserChatId(userId);
    if (!chatId) {
      return { success: false, reason: 'User chat ID not found' };
    }

    try {
      const template = await this.getTemplate('energy_delegation_complete', config.default_language);
      
      const templateData = {
        user_name: delegationData.user_name || '用户',
        order_id: delegationData.order_id,
        energy_amount: formatEnergyAmount(delegationData.energy_amount),
        duration: delegationData.duration || '1天',
        target_address: delegationData.target_address,
        transaction_hash: formatTransactionHash(delegationData.transaction_hash),
        completed_at: formatTimestamp(delegationData.completed_at),
        status_icon: getStatusIcon('energy'),
        ...delegationData
      };

      const messageContent = await renderTemplate(template, templateData);

      // 如果配置了显示交易链接，添加交易查看按钮
      if (config.business_notifications.energy_delegation_complete?.show_tx_link && delegationData.transaction_hash) {
        if (!messageContent.reply_markup) {
          messageContent.reply_markup = { inline_keyboard: [] };
        }
        messageContent.reply_markup.inline_keyboard.push([
          {
            text: '查看交易详情',
            url: `https://tronscan.org/#/transaction/${delegationData.transaction_hash}`
          }
        ]);
      }

      await this.sendMessage(chatId, messageContent, userId, 'energy_delegation_complete');

      return { success: true, templateId: template.id };
    } catch (error) {
      console.error('发送能量代理完成通知失败:', error);
      return { success: false, reason: error.message, error };
    }
  }

  /**
   * 发送重试支付通知
   */
  private async sendRetryPaymentNotification(
    userId: string,
    paymentData: any,
    config: BotNotificationConfig
  ): Promise<void> {
    try {
      const chatId = await this.getUserChatId(userId);
      if (!chatId) return;

      const template = await this.getTemplate('payment_retry_reminder', config.default_language);
      const templateData = {
        user_name: paymentData.user_name || '用户',
        order_id: paymentData.order_id,
        payment_amount: formatAmount(paymentData.amount, paymentData.currency),
        ...paymentData
      };

      const messageContent = await renderTemplate(template, templateData);
      await this.sendMessage(chatId, messageContent, userId, 'payment_retry_reminder');
    } catch (error) {
      console.error('发送重试支付通知失败:', error);
    }
  }

  /**
   * 获取用户聊天ID
   */
  private async getUserChatId(userId: string): Promise<number | null> {
    try {
      const result = await query(
        'SELECT telegram_chat_id FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].telegram_chat_id;
    } catch (error) {
      console.error('获取用户聊天ID失败:', error);
      return null;
    }
  }

  /**
   * 获取消息模板
   */
  private async getTemplate(type: string, language: string = 'zh'): Promise<any> {
    const result = await query(`
      SELECT * FROM telegram_message_templates 
      WHERE bot_id = $1 
        AND type = $2 
        AND language = $3 
        AND is_active = true
      ORDER BY is_default DESC, updated_at DESC
      LIMIT 1
    `, [this.botId, type, language]);

    if (result.rows.length === 0) {
      throw new Error(`Template not found for type: ${type}, language: ${language}`);
    }

    return result.rows[0];
  }

  /**
   * 发送消息
   */
  private async sendMessage(
    chatId: number,
    messageContent: any,
    userId: string,
    notificationType: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      let sentMessage;
      
      if (messageContent.image_url) {
        sentMessage = await this.bot.sendPhoto(chatId, messageContent.image_url, {
          caption: messageContent.text,
          parse_mode: messageContent.parse_mode || 'Markdown',
          reply_markup: messageContent.reply_markup
        });
      } else {
        sentMessage = await this.bot.sendMessage(chatId, messageContent.text, {
          parse_mode: messageContent.parse_mode || 'Markdown',
          reply_markup: messageContent.reply_markup
        });
      }

      const responseTime = Date.now() - startTime;
      
      await recordDeliveryResult(this.botId, '', userId, {
        success: true,
        messageId: sentMessage.message_id,
        timestamp: new Date(),
        responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      await recordDeliveryResult(this.botId, '', userId, {
        success: false,
        error: error.message,
        timestamp: new Date(),
        responseTime
      });
      
      throw error;
    }
  }
}
