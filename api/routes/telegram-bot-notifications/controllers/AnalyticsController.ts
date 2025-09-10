/**
 * Telegram机器人通知分析控制器
 * 处理通知统计分析相关操作
 */

import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';
import type {
    GetAnalyticsResponse
} from '../../../services/telegram-bot/types/notification.types.js';

/**
 * 获取通知统计分析
 * GET /api/telegram-bot-notifications/:botId/analytics
 */
export async function getNotificationAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;
    const group_by = (req.query.group_by as string) || 'day';
    const type = req.query.type as string;
    const category = req.query.category as string;

    if (!start_date || !end_date) {
      res.status(400).json({
        success: false,
        message: '开始日期和结束日期为必填项'
      });
      return;
    }

    let whereClause = 'WHERE bot_id = $1 AND date BETWEEN $2 AND $3';
    const params: any[] = [botId, start_date, end_date];
    let paramIndex = 4;

    if (type) {
      whereClause += ` AND notification_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // 获取详细分析数据
    const analyticsResult = await query(`
      SELECT * FROM telegram_notification_analytics 
      ${whereClause}
      ORDER BY date DESC, notification_type
    `, params);

    // 获取汇总数据
    const summaryResult = await query(`
      SELECT 
        SUM(total_sent) as total_sent,
        SUM(total_failed) as total_failed,
        CASE 
          WHEN SUM(total_sent + total_failed) > 0 
          THEN ROUND(SUM(total_sent) * 100.0 / SUM(total_sent + total_failed), 2)
          ELSE 0 
        END as success_rate,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND(AVG(avg_send_time_ms), 0)
          ELSE 0 
        END as avg_response_time
      FROM telegram_notification_analytics 
      ${whereClause}
    `, params);

    const summary = summaryResult.rows[0];

    const response: GetAnalyticsResponse = {
      success: true,
      data: {
        analytics: analyticsResult.rows,
        summary: {
          total_sent: parseInt(summary.total_sent) || 0,
          total_failed: parseInt(summary.total_failed) || 0,
          success_rate: parseFloat(summary.success_rate) || 0,
          avg_response_time: parseInt(summary.avg_response_time) || 0
        }
      }
    };

    res.json(response);

  } catch (error) {
    console.error('获取统计分析失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计分析失败',
      error: error.message
    });
  }
}
