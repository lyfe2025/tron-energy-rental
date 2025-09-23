/**
 * Telegram机器人通知服务主协调器
 * 负责通知服务的统一调度和管理
 */

import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../config/database.ts';
import type {
    BotNotificationConfig,
    ManualNotificationData,
    SendResult
} from '../types/notification.types.ts';
import { BusinessNotificationService } from './services/BusinessNotificationService.ts';
import { SystemNotificationService } from './services/SystemNotificationService.ts';

export class TelegramNotificationService {
  private bot: TelegramBot;
  private botId: string;
  private config: BotNotificationConfig | null = null;
  
  // 专门的服务实例
  private businessService: BusinessNotificationService;
  private systemService: SystemNotificationService;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
    
    // 初始化专门的服务
    this.businessService = new BusinessNotificationService(bot, botId);
    this.systemService = new SystemNotificationService(bot, botId);
  }

  /**
   * 获取机器人通知配置
   */
  async getBotNotificationConfig(): Promise<BotNotificationConfig> {
    if (this.config) {
      return this.config;
    }

    const result = await query(
      'SELECT * FROM telegram_bot_notification_configs WHERE bot_id = $1',
      [this.botId]
    );

    if (result.rows.length === 0) {
      // 创建默认配置
      this.config = await this.createDefaultConfig();
    } else {
      this.config = this.parseConfig(result.rows[0]);
    }

    return this.config;
  }

  /**
   * 更新通知配置
   */
  async updateNotificationConfig(config: Partial<BotNotificationConfig>): Promise<void> {
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
        updated_at = CURRENT_TIMESTAMP
      WHERE bot_id = $1
    `, [
      this.botId,
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
      config.quiet_hours ? JSON.stringify(config.quiet_hours) : null
    ]);

    // 更新缓存
    this.config = null;
  }

  /**
   * 发送业务通知（订单、支付等）
   */
  async sendBusinessNotification(
    userId: string,
    notificationType: string,
    data: any
  ): Promise<SendResult> {
    const config = await this.getBotNotificationConfig();
    
    if (!config.enabled || !config.business_notifications?.enabled) {
      return { success: false, reason: 'Business notifications disabled' };
    }

    // 检查特定通知类型是否启用
    const typeConfig = config.business_notifications[notificationType];
    if (!typeConfig?.enabled) {
      return { success: false, reason: `Notification type ${notificationType} disabled` };
    }

    // 检查发送频率限制
    const canSend = await this.checkRateLimit(userId, notificationType);
    if (!canSend) {
      return { success: false, reason: 'Rate limit exceeded' };
    }

    // 委托给业务通知服务处理
    switch (notificationType) {
      case 'order_created':
        return await this.businessService.sendOrderCreatedNotification(userId, data, config);
      case 'payment_success':
        return await this.businessService.sendPaymentSuccessNotification(userId, data, config);
      case 'payment_failed':
        return await this.businessService.sendPaymentFailedNotification(userId, data, config);
      case 'energy_delegation_complete':
        return await this.businessService.sendEnergyDelegationCompleteNotification(userId, data, config);
      default:
        return { success: false, reason: `Unsupported business notification type: ${notificationType}` };
    }
  }

  /**
   * 发送系统维护通知（管理员手动触发）
   */
  async sendMaintenanceNotification(
    maintenanceData: ManualNotificationData,
    createdBy: string
  ): Promise<string> {
    return await this.systemService.sendMaintenanceNotification(maintenanceData, createdBy);
  }

  /**
   * 发送重要公告（管理员手动触发）
   */
  async sendAnnouncement(
    announcementData: ManualNotificationData,
    createdBy: string
  ): Promise<string> {
    return await this.systemService.sendAnnouncement(announcementData, createdBy);
  }

  /**
   * 检查发送频率限制
   */
  private async checkRateLimit(userId: string, notificationType: string): Promise<boolean> {
    const config = await this.getBotNotificationConfig();
    
    if (!config.rate_limiting?.enabled) {
      return true;
    }

    const limits = config.rate_limiting;
    const typeLimit = limits.user_limits?.[notificationType] || limits.max_per_hour || 10;

    // 查询最近1小时的发送次数
    const result = await query(`
      SELECT COUNT(*) as count
      FROM telegram_notification_logs 
      WHERE bot_id = $1 
        AND notification_type = $2 
        AND created_at > NOW() - INTERVAL '1 hour'
        AND target_type = 'user'
        AND metadata->>'user_id' = $3
    `, [this.botId, notificationType, userId]);

    const currentCount = parseInt(result.rows[0].count);
    return currentCount < typeLimit;
  }

  /**
   * 创建默认配置
   */
  private async createDefaultConfig(): Promise<BotNotificationConfig> {
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
        order_status_update: { enabled: true, edit_existing_message: true },
        balance_recharged: { enabled: true, include_transaction_details: true },
        balance_insufficient: { enabled: true, suggest_recharge: true }
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
      this.botId,
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

  /**
   * 解析配置数据
   */
  private parseConfig(row: any): BotNotificationConfig {
    return {
      enabled: row.enabled,
      default_language: row.default_language,
      timezone: row.timezone,
      business_notifications: row.business_notifications,
      agent_notifications: row.agent_notifications,
      price_notifications: row.price_notifications,
      system_notifications: row.system_notifications,
      marketing_notifications: row.marketing_notifications,
      rate_limiting: row.rate_limiting,
      retry_strategy: row.retry_strategy,
      quiet_hours: row.quiet_hours,
      analytics_enabled: row.analytics_enabled,
      performance_monitoring: row.performance_monitoring
    };
  }
}
