/**
 * Telegram机器人手动通知控制器
 * 处理手动发送通知和通知状态查询
 */

import { type Request, type Response } from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../config/database.js';
import { TelegramNotificationService } from '../../../services/telegram-bot/NotificationService.js';
import type {
    ManualNotificationData,
    SendManualNotificationRequest,
    SendManualNotificationResponse
} from '../../../services/telegram-bot/types/notification.types.js';

/**
 * 发送手动通知
 * POST /api/telegram-bot-notifications/:botId/send
 */
export async function sendManualNotification(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { notification_data } = req.body as SendManualNotificationRequest;
    const userId = req.user?.id;

    // 验证机器人是否存在且活跃
    const botResult = await query(
      'SELECT * FROM telegram_bots WHERE id = $1 AND is_active = true',
      [botId]
    );

    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在或未激活'
      });
      return;
    }

    // 从数据库获取机器人配置
    const botConfigResult = await query(
      'SELECT token, enabled FROM telegram_bots WHERE id = $1',
      [botId]
    );
    
    if (botConfigResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    const botConfig = botConfigResult.rows[0];
    if (!botConfig.enabled) {
      res.status(400).json({
        success: false,
        message: '机器人未启用'
      });
      return;
    }

    // 创建临时bot实例用于发送通知
    const tempBot = new TelegramBot(botConfig.token, { polling: false });

    // 创建通知服务
    const notificationService = new TelegramNotificationService(tempBot, botId);

    let notificationId: string;

    // 根据通知类型选择发送方法
    switch (notification_data.type) {
      case 'maintenance_notice':
      case 'maintenance_start':
      case 'maintenance_complete':
        notificationId = await notificationService.sendMaintenanceNotification(
          notification_data as ManualNotificationData,
          userId
        );
        break;

      case 'important_announcement':
      case 'policy_change':
      case 'security_alert':
      case 'holiday_greeting':
        notificationId = await notificationService.sendAnnouncement(
          notification_data,
          userId
        );
        break;

      default:
        res.status(400).json({
          success: false,
          message: '不支持的通知类型'
        });
        return;
    }

    const response: SendManualNotificationResponse = {
      success: true,
      notification_id: notificationId,
      message: '通知发送任务已创建，正在后台处理'
    };

    res.json(response);

  } catch (error) {
    console.error('发送手动通知失败:', error);
    res.status(500).json({
      success: false,
      message: '发送通知失败',
      error: error.message
    });
  }
}

/**
 * 获取通知状态（WebSocket支持实时更新）
 * GET /api/telegram-bot-notifications/status/:notificationId
 */
export async function getNotificationStatus(req: Request, res: Response): Promise<void> {
  try {
    const { notificationId } = req.params;

    const result = await query(
      'SELECT * FROM telegram_notification_logs WHERE id = $1',
      [notificationId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '通知记录不存在'
      });
      return;
    }

    const log = result.rows[0];
    const progress = log.target_count > 0 ? 
      Math.round(((log.sent_count + log.failed_count) / log.target_count) * 100) : 0;

    res.json({
      success: true,
      data: {
        id: log.id,
        status: log.status,
        progress,
        sent_count: log.sent_count,
        failed_count: log.failed_count,
        target_count: log.target_count,
        created_at: log.created_at,
        started_at: log.started_at,
        completed_at: log.completed_at,
        error_details: log.error_details
      }
    });

  } catch (error) {
    console.error('获取通知状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知状态失败',
      error: error.message
    });
  }
}
