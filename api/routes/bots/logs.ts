/**
 * 机器人日志管理路由
 * 包含：获取机器人运行日志、记录日志等功能
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../../config/database.ts';
import { authenticateToken } from '../../middleware/auth.ts';
import { requirePermission } from '../../middleware/rbac.ts';
import type { RouteHandler } from './types.ts';
import { getBotLogFiles, readLogFile } from '../../utils/logger.ts';
import type { LogLevel } from '../../utils/logger.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

const router: Router = Router();

/**
 * 获取机器人运行日志 - 支持分层日志架构
 * 从数据库获取业务事件日志，从文件系统获取运行日志，并合并返回
 * GET /api/bots/:id/logs
 */
const getBotLogs: RouteHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      limit = 100, 
      offset = 0, 
      level, 
      start_date, 
      end_date,
      source = 'all' // 新增参数：'all', 'database', 'file'
    } = req.query;

    // 验证机器人是否存在
    const botResult = await query(
      'SELECT id, bot_name FROM telegram_bots WHERE id = $1',
      [id]
    );

    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }

    let allLogs: any[] = [];
    let dbTotal = 0;
    let fileTotal = 0;

    // 获取数据库日志（业务事件）
    if (source === 'all' || source === 'database') {
      try {
        // 构建查询条件
        let whereClause = 'WHERE bot_id = $1';
        const queryParams: any[] = [id];
        let paramIndex = 2;

        if (level) {
          whereClause += ` AND level = $${paramIndex}`;
          queryParams.push(level);
          paramIndex++;
        }

        if (start_date) {
          whereClause += ` AND created_at >= $${paramIndex}`;
          queryParams.push(start_date);
          paramIndex++;
        }

        if (end_date) {
          whereClause += ` AND created_at <= $${paramIndex}`;
          queryParams.push(end_date);
          paramIndex++;
        }

        // 获取数据库日志总数
        const countResult = await query(
          `SELECT COUNT(*) as total FROM bot_logs ${whereClause}`,
          queryParams
        );
        dbTotal = parseInt(countResult.rows[0].total);

        // 获取数据库日志列表
        const logsResult = await query(
          `SELECT 
            id,
            bot_id,
            level,
            action,
            message,
            metadata as context,
            created_at
          FROM bot_logs 
          ${whereClause}
          ORDER BY created_at DESC`,
          queryParams
        );

        const dbLogs = logsResult.rows.map(log => ({
          ...log,
          source: 'database',
          timestamp: log.created_at,
          context: log.context ? (typeof log.context === 'string' ? JSON.parse(log.context) : log.context) : null
        }));

        allLogs.push(...dbLogs);
      } catch (dbError) {
        console.error('获取数据库日志失败:', dbError);
      }
    }

    // 获取文件日志（运行日志）
    if (source === 'all' || source === 'file') {
      try {
        const logFiles = await getBotLogFiles(id);
        
        for (const logFile of logFiles) {
          try {
            const fileContent = await readLogFile(logFile.path);
            const fileLogs = fileContent
              .filter(log => {
                // 应用过滤条件
                if (level && log.level !== level) return false;
                if (start_date && new Date(log.timestamp) < new Date(start_date as string)) return false;
                if (end_date && new Date(log.timestamp) > new Date(end_date as string)) return false;
                return true;
              })
              .map(log => ({
                id: `file_${log.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
                bot_id: id,
                level: log.level,
                action: log.action || 'runtime',
                message: log.message,
                context: log.metadata || null,
                created_at: log.timestamp,
                timestamp: log.timestamp,
                source: 'file',
                file: logFile.name
              }));
            
            allLogs.push(...fileLogs);
            fileTotal += fileLogs.length;
          } catch (fileError) {
            console.error(`读取日志文件失败 ${logFile.path}:`, fileError);
          }
        }
      } catch (fileError) {
        console.error('获取文件日志失败:', fileError);
      }
    }

    // 按时间戳排序（最新的在前）
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 应用分页
    const total = allLogs.length;
    const startIndex = parseInt(offset as string);
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedLogs = allLogs.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          has_more: endIndex < total
        },
        summary: {
          database_logs: dbTotal,
          file_logs: fileTotal,
          total_logs: total,
          source: source as string
        }
      }
    });
  } catch (error: any) {
    console.error('获取机器人日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取日志失败',
      error: error.message
    });
  }
};

/**
 * 记录机器人日志
 * POST /api/bots/:id/logs
 */
const createBotLog: RouteHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { level, message, context } = req.body;

    // 验证必填字段
    if (!level || !message) {
      res.status(400).json({
        success: false,
        message: '日志级别和消息内容不能为空'
      });
      return;
    }

    // 验证日志级别
    const validLevels = ['info', 'warn', 'error', 'debug'];
    if (!validLevels.includes(level)) {
      res.status(400).json({
        success: false,
        message: '无效的日志级别，支持的级别：' + validLevels.join(', ')
      });
      return;
    }

    // 验证机器人是否存在
    const botResult = await query(
      'SELECT id FROM telegram_bots WHERE id = $1',
      [id]
    );

    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }

    // 插入日志记录
    const result = await query(
      `INSERT INTO bot_logs (bot_id, level, message, context, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, created_at`,
      [id, level, message, context ? JSON.stringify(context) : null]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.rows[0].id,
        bot_id: id,
        level,
        message,
        context,
        created_at: result.rows[0].created_at
      },
      message: '日志记录成功'
    });
  } catch (error: any) {
    console.error('记录机器人日志失败:', error);
    res.status(500).json({
      success: false,
      message: '记录日志失败',
      error: error.message
    });
  }
};

// 注册路由
router.get('/:id/logs', authenticateToken, requirePermission('bot:list'), getBotLogs);
router.post('/:id/logs', authenticateToken, requirePermission('bot:list'), createBotLog);

export default router;