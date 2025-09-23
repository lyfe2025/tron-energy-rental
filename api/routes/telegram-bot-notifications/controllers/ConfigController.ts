/**
 * Telegram机器人通知配置控制器
 * 处理通知配置的获取和更新操作
 */

import { type Request, type Response } from 'express';
import { query } from '../../../config/database.ts';
import type {
    GetNotificationConfigResponse,
    UpdateNotificationConfigRequest,
    UpdateNotificationConfigResponse
} from '../../../services/telegram-bot/types/notification.types.ts';

/**
 * 获取机器人通知配置
 * GET /api/telegram-bot-notifications/:botId/config
 */
export async function getNotificationConfig(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;

    // 验证机器人是否存在
    const botResult = await query('SELECT id FROM telegram_bots WHERE id = $1', [botId]);
    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }

    // 获取通知配置
    const configResult = await query(
      'SELECT * FROM telegram_bot_notification_configs WHERE bot_id = $1',
      [botId]
    );

    let config;
    if (configResult.rows.length === 0) {
      // 创建默认配置
      config = await createDefaultNotificationConfig(botId);
    } else {
      config = configResult.rows[0];
    }

    const response: GetNotificationConfigResponse = {
      success: true,
      data: {
        enabled: config.enabled,
        default_language: config.default_language,
        timezone: config.timezone,
        business_notifications: config.business_notifications,
        agent_notifications: config.agent_notifications,
        price_notifications: config.price_notifications,
        system_notifications: config.system_notifications,
        marketing_notifications: config.marketing_notifications,
        rate_limiting: config.rate_limiting,
        retry_strategy: config.retry_strategy,
        quiet_hours: config.quiet_hours,
        analytics_enabled: config.analytics_enabled,
        performance_monitoring: config.performance_monitoring
      }
    };

    res.json(response);

  } catch (error) {
    console.error('获取通知配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知配置失败',
      error: error.message
    });
  }
}

/**
 * 更新机器人通知配置
 * PUT /api/telegram-bot-notifications/:botId/config
 */
export async function updateNotificationConfig(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const { config } = req.body as UpdateNotificationConfigRequest;

    // 验证机器人是否存在
    const botResult = await query('SELECT id FROM telegram_bots WHERE id = $1', [botId]);
    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }

    // 更新配置
    await query(`
      UPDATE telegram_bot_notification_configs 
      SET 
        enabled = COALESCE($2, enabled),
        default_language = COALESCE($3, default_language),
        timezone = COALESCE($4, timezone),
        business_notifications = COALESCE($5, business_notifications),
        agent_notifications = COALESCE($6, agent_notifications),
        price_notifications = COALESCE($7, price_notifications),
        system_notifications = COALESCE($8, system_notifications),
        marketing_notifications = COALESCE($9, marketing_notifications),
        rate_limiting = COALESCE($10, rate_limiting),
        retry_strategy = COALESCE($11, retry_strategy),
        quiet_hours = COALESCE($12, quiet_hours),
        analytics_enabled = COALESCE($13, analytics_enabled),
        performance_monitoring = COALESCE($14, performance_monitoring),
        updated_at = CURRENT_TIMESTAMP
      WHERE bot_id = $1
    `, [
      botId,
      config.enabled,
      config.default_language,
      config.timezone,
      config.business_notifications ? JSON.stringify(config.business_notifications) : null,
      config.agent_notifications ? JSON.stringify(config.agent_notifications) : null,
      config.price_notifications ? JSON.stringify(config.price_notifications) : null,
      config.system_notifications ? JSON.stringify(config.system_notifications) : null,
      config.marketing_notifications ? JSON.stringify(config.marketing_notifications) : null,
      config.rate_limiting ? JSON.stringify(config.rate_limiting) : null,
      config.retry_strategy ? JSON.stringify(config.retry_strategy) : null,
      config.quiet_hours ? JSON.stringify(config.quiet_hours) : null,
      config.analytics_enabled,
      config.performance_monitoring
    ]);

    const response: UpdateNotificationConfigResponse = {
      success: true,
      message: '通知配置更新成功'
    };

    res.json(response);

  } catch (error) {
    console.error('更新通知配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新通知配置失败',
      error: error.message
    });
  }
}

/**
 * 创建默认通知配置
 */
async function createDefaultNotificationConfig(botId: string) {
  const defaultConfig = {
    enabled: true,
    default_language: 'zh',
    timezone: 'Asia/Shanghai',
    business_notifications: {
      enabled: true,
      order_created: { enabled: true, delay_seconds: 5 },
      payment_success: { enabled: true, include_image: true },
      payment_failed: { enabled: true, retry_notification: true },
      energy_delegation_complete: { enabled: true, show_tx_link: true },
      energy_delegation_failed: { enabled: true, include_support_contact: true },
      order_status_update: { enabled: true, edit_existing_message: true }
    },
    agent_notifications: {
      enabled: true,
      application_submitted: { enabled: true },
      application_approved: { enabled: true, include_welcome_guide: true },
      application_rejected: { enabled: true, include_feedback: true },
      commission_earned: { enabled: true, min_amount: 1 },
      level_upgrade: { enabled: true, include_benefits: true },
      withdrawal_completed: { enabled: true },
      monthly_summary: { enabled: true, send_on_day: 1 }
    },
    price_notifications: {
      enabled: true,
      price_increase: { enabled: true, threshold_percent: 5 },
      price_decrease: { enabled: true, threshold_percent: 5 },
      new_package: { enabled: true, target_all_users: true },
      limited_offer: { enabled: true, urgency_indicators: true },
      stock_warning: { enabled: false, admin_only: true }
    },
    system_notifications: {
      enabled: true,
      maintenance_notice: { enabled: true, advance_hours: 24 },
      maintenance_start: { enabled: true },
      maintenance_complete: { enabled: true },
      system_alert: { enabled: true, admin_only: true },
      security_warning: { enabled: true },
      daily_report: { enabled: false, admin_only: true }
    },
    marketing_notifications: {
      enabled: true,
      new_feature: { enabled: true, target_active_users: true },
      user_reactivation: { enabled: true, inactive_days: 30 },
      satisfaction_survey: { enabled: true, frequency_days: 90 },
      birthday_greeting: { enabled: false },
      vip_exclusive: { enabled: true, vip_only: true }
    },
    rate_limiting: {
      enabled: true,
      max_per_hour: 10,
      max_per_day: 50,
      user_limits: {
        transaction: 5,
        order_status: 3,
        price_change: 2,
        marketing: 1,
        system: 3
      }
    },
    retry_strategy: {
      enabled: true,
      max_attempts: 3,
      delay_seconds: [30, 300, 1800],
      exponential_backoff: true
    },
    quiet_hours: {
      enabled: false,
      start_time: '23:00',
      end_time: '07:00',
      timezone: 'Asia/Shanghai'
    },
    analytics_enabled: true,
    performance_monitoring: true
  };

  await query(`
    INSERT INTO telegram_bot_notification_configs (
      bot_id, enabled, default_language, timezone,
      business_notifications, agent_notifications, price_notifications,
      system_notifications, marketing_notifications, rate_limiting,
      retry_strategy, quiet_hours, analytics_enabled, performance_monitoring
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `, [
    botId,
    defaultConfig.enabled,
    defaultConfig.default_language,
    defaultConfig.timezone,
    JSON.stringify(defaultConfig.business_notifications),
    JSON.stringify(defaultConfig.agent_notifications),
    JSON.stringify(defaultConfig.price_notifications),
    JSON.stringify(defaultConfig.system_notifications),
    JSON.stringify(defaultConfig.marketing_notifications),
    JSON.stringify(defaultConfig.rate_limiting),
    JSON.stringify(defaultConfig.retry_strategy),
    JSON.stringify(defaultConfig.quiet_hours),
    defaultConfig.analytics_enabled,
    defaultConfig.performance_monitoring
  ]);

  return defaultConfig;
}
