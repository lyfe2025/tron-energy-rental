/**
 * Telegram机器人通知日志控制器
 * 处理通知发送记录的查询操作
 */

import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';
import type {
    GetNotificationLogsResponse
} from '../../../services/telegram-bot/types/notification.types.js';

/**
 * 获取通知发送记录
 * GET /api/telegram-bot-notifications/:botId/logs
 */
export async function getNotificationLogs(req: Request, res: Response): Promise<void> {
  try {
    const { botId } = req.params;
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');

    let whereClause = 'WHERE bot_id = $1';
    const params: any[] = [botId];
    let paramIndex = 2;

    if (start_date) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (type) {
      whereClause += ` AND notification_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM telegram_notification_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 获取日志数据
    const offset = (parseInt(page.toString()) - 1) * parseInt(limit.toString());
    const logsResult = await query(`
      SELECT 
        tnl.*,
        u.first_name as created_by_name,
        tmt.name as template_name
      FROM telegram_notification_logs tnl
      LEFT JOIN users u ON tnl.created_by = u.id
      LEFT JOIN telegram_message_templates tmt ON tnl.template_id = tmt.id
      ${whereClause}
      ORDER BY tnl.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const response: GetNotificationLogsResponse = {
      success: true,
      data: {
        logs: logsResult.rows,
        total,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString())
      }
    };

    res.json(response);

  } catch (error) {
    console.error('获取通知记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知记录失败',
      error: error.message
    });
  }
}
