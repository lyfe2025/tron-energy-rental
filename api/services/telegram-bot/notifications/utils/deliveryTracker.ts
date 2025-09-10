/**
 * 消息投递跟踪工具
 * 负责消息发送状态的跟踪和监控
 */

import { query } from '../../../../config/database.js';

export interface DeliveryResult {
  success: boolean;
  messageId?: number;
  error?: string;
  timestamp: Date;
  responseTime: number;
}

export interface BatchDeliveryStats {
  totalSent: number;
  totalFailed: number;
  averageResponseTime: number;
  successRate: number;
}

/**
 * 记录单次消息投递结果
 */
export async function recordDeliveryResult(
  botId: string,
  notificationId: string,
  userId: string,
  result: DeliveryResult
): Promise<void> {
  try {
    await query(`
      INSERT INTO telegram_delivery_logs (
        bot_id, notification_id, user_id, success, message_id, 
        error_message, response_time_ms, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      botId,
      notificationId,
      userId,
      result.success,
      result.messageId || null,
      result.error || null,
      result.responseTime,
      result.timestamp
    ]);
  } catch (error) {
    console.error('记录投递结果失败:', error);
  }
}

/**
 * 批量记录投递结果
 */
export async function recordBatchDeliveryResults(
  botId: string,
  notificationId: string,
  results: Array<{ userId: string; result: DeliveryResult }>
): Promise<void> {
  if (results.length === 0) return;

  const values = results.map((item, index) => {
    const offset = index * 8;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
  }).join(', ');

  const params = results.flatMap(item => [
    botId,
    notificationId,
    item.userId,
    item.result.success,
    item.result.messageId || null,
    item.result.error || null,
    item.result.responseTime,
    item.result.timestamp
  ]);

  try {
    await query(`
      INSERT INTO telegram_delivery_logs (
        bot_id, notification_id, user_id, success, message_id, 
        error_message, response_time_ms, created_at
      ) VALUES ${values}
    `, params);
  } catch (error) {
    console.error('批量记录投递结果失败:', error);
  }
}

/**
 * 获取投递统计信息
 */
export async function getDeliveryStats(
  botId: string,
  notificationId: string
): Promise<BatchDeliveryStats> {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as total_sent,
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as total_failed,
        COALESCE(ROUND(AVG(response_time_ms), 2), 0) as avg_response_time,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND(SUM(CASE WHEN success = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
          ELSE 0 
        END as success_rate
      FROM telegram_delivery_logs 
      WHERE bot_id = $1 AND notification_id = $2
    `, [botId, notificationId]);

    const stats = result.rows[0];
    
    return {
      totalSent: parseInt(stats.total_sent) || 0,
      totalFailed: parseInt(stats.total_failed) || 0,
      averageResponseTime: parseFloat(stats.avg_response_time) || 0,
      successRate: parseFloat(stats.success_rate) || 0
    };
  } catch (error) {
    console.error('获取投递统计失败:', error);
    return {
      totalSent: 0,
      totalFailed: 0,
      averageResponseTime: 0,
      successRate: 0
    };
  }
}

/**
 * 更新通知记录的统计信息
 */
export async function updateNotificationStats(
  notificationId: string,
  stats: BatchDeliveryStats
): Promise<void> {
  try {
    await query(`
      UPDATE telegram_notification_logs 
      SET 
        sent_count = $2,
        failed_count = $3,
        target_count = $2 + $3,
        avg_send_time_ms = $4,
        success_rate = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [
      notificationId,
      stats.totalSent,
      stats.totalFailed,
      stats.averageResponseTime,
      stats.successRate
    ]);
  } catch (error) {
    console.error('更新通知统计失败:', error);
  }
}

/**
 * 获取失败的投递记录
 */
export async function getFailedDeliveries(
  botId: string,
  notificationId: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const result = await query(`
      SELECT 
        tdl.*,
        u.first_name,
        u.last_name,
        u.telegram_chat_id
      FROM telegram_delivery_logs tdl
      LEFT JOIN users u ON tdl.user_id = u.id
      WHERE tdl.bot_id = $1 
        AND tdl.notification_id = $2 
        AND tdl.success = false
      ORDER BY tdl.created_at DESC
      LIMIT $3
    `, [botId, notificationId, limit]);

    return result.rows;
  } catch (error) {
    console.error('获取失败投递记录失败:', error);
    return [];
  }
}

/**
 * 清理过期的投递日志
 */
export async function cleanupOldDeliveryLogs(daysToKeep: number = 30): Promise<number> {
  try {
    const result = await query(`
      DELETE FROM telegram_delivery_logs 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysToKeep} days'
    `);

    return result.rowCount || 0;
  } catch (error) {
    console.error('清理投递日志失败:', error);
    return 0;
  }
}

/**
 * 计算投递性能指标
 */
export async function calculatePerformanceMetrics(
  botId: string,
  startDate: string,
  endDate: string
): Promise<any> {
  try {
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_attempts,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_deliveries,
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_deliveries,
        ROUND(AVG(response_time_ms), 2) as avg_response_time,
        MIN(response_time_ms) as min_response_time,
        MAX(response_time_ms) as max_response_time,
        ROUND(
          CASE 
            WHEN COUNT(*) > 0 
            THEN SUM(CASE WHEN success = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
            ELSE 0 
          END, 2
        ) as success_rate
      FROM telegram_delivery_logs 
      WHERE bot_id = $1 
        AND DATE(created_at) BETWEEN $2 AND $3
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [botId, startDate, endDate]);

    return result.rows;
  } catch (error) {
    console.error('计算性能指标失败:', error);
    return [];
  }
}
