/**
 * 系统通知服务
 * 处理系统维护、公告等系统相关通知
 */

import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../config/database.ts';
import type { ManualNotificationData } from '../../types/notification.types.ts';
import { recordBatchDeliveryResults, updateNotificationStats, type DeliveryResult } from '../utils/deliveryTracker.ts';
import { formatTimestamp, getStatusIcon } from '../utils/messageFormatter.ts';
import { renderTemplate } from '../utils/templateRenderer.ts';

export class SystemNotificationService {
  private bot: TelegramBot;
  private botId: string;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
  }

  /**
   * 发送系统维护通知（管理员手动触发）
   */
  async sendMaintenanceNotification(
    maintenanceData: ManualNotificationData,
    createdBy: string
  ): Promise<string> {
    // 创建通知记录
    const notificationId = await this.createNotificationRecord(
      'system_maintenance',
      'system',
      maintenanceData,
      createdBy
    );

    // 获取目标用户
    const targetUsers = await this.getTargetUsers(maintenanceData.target_users);
    
    // 生成消息内容
    const template = await this.getTemplate('maintenance_notice');
    const messageContent = await renderTemplate(template, {
      title: maintenanceData.title,
      content: maintenanceData.content,
      start_time: (maintenanceData as any).start_time ? formatTimestamp((maintenanceData as any).start_time) : '',
      end_time: (maintenanceData as any).end_time ? formatTimestamp((maintenanceData as any).end_time) : '',
      affected_services: (maintenanceData as any).affected_services?.join(', ') || '全部服务',
      status_icon: getStatusIcon('maintenance'),
      ...maintenanceData
    });

    // 异步发送通知
    this.sendBulkNotification(notificationId, targetUsers, messageContent)
      .catch(error => {
        console.error('批量发送维护通知失败:', error);
      });

    return notificationId;
  }

  /**
   * 发送重要公告（管理员手动触发）
   */
  async sendAnnouncement(
    announcementData: ManualNotificationData,
    createdBy: string
  ): Promise<string> {
    const notificationId = await this.createNotificationRecord(
      'important_announcement',
      'system',
      announcementData,
      createdBy
    );

    const targetUsers = await this.getTargetUsers(announcementData.target_users);
    
    const template = await this.getTemplate('important_announcement');
    const messageContent = await renderTemplate(template, {
      title: announcementData.title,
      content: announcementData.content,
      announcement_type: announcementData.type,
      published_at: formatTimestamp(new Date()),
      status_icon: getStatusIcon('info'),
      ...announcementData
    });

    // 根据紧急程度决定发送策略
    if (announcementData.urgency === 'high') {
      // 高优先级立即发送
      this.sendBulkNotification(notificationId, targetUsers, messageContent)
        .catch(error => {
          console.error('发送紧急公告失败:', error);
        });
    } else {
      // 普通优先级智能时间发送
      await this.scheduleOptimalSend(notificationId, targetUsers, messageContent);
    }

    return notificationId;
  }

  /**
   * 批量发送通知
   */
  private async sendBulkNotification(
    notificationId: string,
    users: any[],
    messageContent: any
  ): Promise<void> {
    const batchSize = 30; // 每批30个用户，避免API限制
    const delay = 1100; // 批次间延迟1.1秒
    
    let sentCount = 0;
    let failedCount = 0;
    const deliveryResults: Array<{ userId: string; result: DeliveryResult }> = [];

    // 更新状态为发送中
    await this.updateNotificationStatus(notificationId, 'sending');

    try {
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(async (user) => {
            const startTime = Date.now();
            
            try {
              const chatId = user.telegram_chat_id || user.chat_id;
              if (!chatId) {
                throw new Error('Chat ID not found');
              }

              const sentMessage = await this.sendSingleNotification(chatId, messageContent);
              const responseTime = Date.now() - startTime;
              
              await this.delay(35); // 用户间间隔35ms
              
              const deliveryResult: DeliveryResult = {
                success: true,
                messageId: sentMessage.message_id,
                timestamp: new Date(),
                responseTime
              };
              
              deliveryResults.push({ userId: user.id, result: deliveryResult });
              
              return { success: true, userId: user.id };
            } catch (error) {
              const responseTime = Date.now() - startTime;
              
              const deliveryResult: DeliveryResult = {
                success: false,
                error: error.message,
                timestamp: new Date(),
                responseTime
              };
              
              deliveryResults.push({ userId: user.id, result: deliveryResult });
              
              return { success: false, userId: user.id, error: error.message };
            }
          })
        );

        // 统计结果
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            sentCount++;
          } else {
            failedCount++;
            const errorInfo = result.status === 'rejected' ? result.reason : result.value.error;
            console.error(`发送给用户失败:`, errorInfo);
          }
        });

        // 更新进度
        await this.updateNotificationProgress(notificationId, sentCount, failedCount);

        // 批次间延迟
        if (i + batchSize < users.length) {
          await this.delay(delay);
          console.log(`📈 通知发送进度: ${sentCount + failedCount}/${users.length}`);
        }
      }

      // 批量记录投递结果
      await recordBatchDeliveryResults(this.botId, notificationId, deliveryResults);

      // 更新最终统计
      await updateNotificationStats(notificationId, {
        totalSent: sentCount,
        totalFailed: failedCount,
        averageResponseTime: deliveryResults.reduce((sum, item) => sum + item.result.responseTime, 0) / deliveryResults.length,
        successRate: deliveryResults.length > 0 ? (sentCount / deliveryResults.length) * 100 : 0
      });

      // 标记完成
      await this.updateNotificationStatus(notificationId, 'completed');
      console.log(`✅ 批量通知发送完成: 成功${sentCount}，失败${failedCount}`);

    } catch (error) {
      console.error('批量发送通知出错:', error);
      await this.updateNotificationStatus(notificationId, 'failed');
      throw error;
    }
  }

  /**
   * 发送单个通知
   */
  private async sendSingleNotification(
    chatId: number | string,
    messageContent: any
  ): Promise<any> {
    if (messageContent.image_url) {
      return await this.bot.sendPhoto(chatId, messageContent.image_url, {
        caption: messageContent.text,
        parse_mode: messageContent.parse_mode || 'Markdown',
        reply_markup: messageContent.reply_markup
      });
    } else {
      return await this.bot.sendMessage(chatId, messageContent.text, {
        parse_mode: messageContent.parse_mode || 'Markdown',
        reply_markup: messageContent.reply_markup
      });
    }
  }

  /**
   * 创建通知记录
   */
  private async createNotificationRecord(
    notificationType: string,
    category: string,
    data: any,
    createdBy: string
  ): Promise<string> {
    const result = await query(`
      INSERT INTO telegram_notification_logs (
        bot_id, notification_type, category, title, target_type, 
        target_criteria, message_content, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      this.botId,
      notificationType,
      category,
      data.title || '',
      data.target_users || 'all',
      JSON.stringify(data.target_criteria || {}),
      JSON.stringify(data),
      JSON.stringify({ source: 'manual', ...data.metadata }),
      createdBy
    ]);

    return result.rows[0].id;
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
   * 获取目标用户
   */
  private async getTargetUsers(targetType: string = 'all'): Promise<any[]> {
    let whereClause = 'WHERE u.telegram_chat_id IS NOT NULL';
    
    switch (targetType) {
      case 'active_only':
        whereClause += ' AND u.last_login_at > NOW() - INTERVAL \'30 days\'';
        break;
      case 'agents_only':
        whereClause += ' AND u.role = \'agent\'';
        break;
      case 'vip_only':
        whereClause += ' AND u.level = \'vip\'';
        break;
      // 'all' 或其他情况不添加额外条件
    }

    const result = await query(`
      SELECT u.id, u.telegram_chat_id, u.language, u.first_name
      FROM users u 
      ${whereClause}
      AND u.is_active = true
      ORDER BY u.last_login_at DESC NULLS LAST
    `);

    return result.rows;
  }

  /**
   * 更新通知状态
   */
  private async updateNotificationStatus(
    notificationId: string,
    status: string
  ): Promise<void> {
    await query(`
      UPDATE telegram_notification_logs 
      SET status = $2, 
          started_at = CASE WHEN status = 'pending' AND $2 = 'sending' THEN CURRENT_TIMESTAMP ELSE started_at END,
          completed_at = CASE WHEN $2 IN ('completed', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $1
    `, [notificationId, status]);
  }

  /**
   * 更新通知进度
   */
  private async updateNotificationProgress(
    notificationId: string,
    sentCount: number,
    failedCount: number
  ): Promise<void> {
    await query(`
      UPDATE telegram_notification_logs 
      SET sent_count = $2, failed_count = $3
      WHERE id = $1
    `, [notificationId, sentCount, failedCount]);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 安排最优时间发送
   */
  private async scheduleOptimalSend(
    notificationId: string,
    users: any[],
    messageContent: any
  ): Promise<void> {
    // 简化实现：立即发送
    await this.sendBulkNotification(notificationId, users, messageContent);
  }
}
