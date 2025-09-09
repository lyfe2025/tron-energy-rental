/**
 * Telegram机器人日志记录模块
 * 负责处理机器人活动日志记录
 */
import { query } from '../../../config/database.js';
import type { LogLevel } from '../../../utils/logger';
import { isBusinessEvent } from '../../../utils/logger';

export class TelegramBotLogger {
  private botId: string | null = null;
  private fileLogger: any = null;

  constructor(botId?: string, fileLogger?: any) {
    this.botId = botId || null;
    this.fileLogger = fileLogger || null;
  }

  /**
   * 设置机器人ID
   */
  setBotId(botId: string): void {
    this.botId = botId;
  }

  /**
   * 设置文件日志记录器
   */
  setFileLogger(logger: any): void {
    this.fileLogger = logger;
  }

  /**
   * 记录机器人活动日志 - 分层日志架构
   * 业务事件写入数据库，运行日志写入文件
   */
  async logBotActivity(
    level: 'info' | 'warn' | 'error' | 'debug',
    action: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      if (!this.botId) {
        console.warn('无法记录日志：机器人ID未设置');
        return;
      }

      const logData = {
        botId: this.botId,
        level: level as LogLevel,
        action,
        message,
        metadata
      };

      // 判断是否为业务事件
      if (isBusinessEvent(action)) {
        // 业务事件：写入数据库
        try {
          const queryStr = `
            INSERT INTO bot_logs (bot_id, level, action, message, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
          `;
          
          await query(queryStr, [
            this.botId,
            level,
            action,
            message,
            metadata ? JSON.stringify(metadata) : null
          ]);
        } catch (dbError) {
          console.error('写入数据库日志失败:', dbError);
          // 数据库失败时，降级到文件日志
          if (this.fileLogger) {
            this.fileLogger[level](`[DB_FALLBACK] ${action}: ${message}`, { ...logData, dbError: dbError.message });
          }
        }
      }

      // 运行日志：写入文件（所有日志都写入文件作为完整记录）
      if (this.fileLogger) {
        this.fileLogger[level](`${action}: ${message}`, logData);
      }
      
      // 同时输出到控制台（保持向后兼容）
      const logMessage = `[Bot-${this.botId}] [${level.toUpperCase()}] ${action}: ${message}`;
      switch (level) {
        case 'error':
          console.error(logMessage, metadata);
          break;
        case 'warn':
          console.warn(logMessage, metadata);
          break;
        case 'debug':
          console.debug(logMessage, metadata);
          break;
        default:
          console.log(logMessage, metadata);
      }
      
    } catch (error) {
      console.error('记录机器人日志失败:', error);
      // 最后的降级方案：只输出到控制台
      console.error(`[FALLBACK] [Bot-${this.botId}] [${level.toUpperCase()}] ${action}: ${message}`, metadata);
    }
  }
}
