/**
 * 机器人日志处理模块
 * 负责日志记录和业务事件跟踪
 */
import { query } from '../../../config/database.js';
import type { LogLevel } from '../../../utils/logger.js';
import { isBusinessEvent } from '../../../utils/logger.js';

export class BotLogger {
  private botId: string | null;
  private fileLogger: any;

  constructor(botId: string | null, fileLogger: any) {
    this.botId = botId;
    this.fileLogger = fileLogger;
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

  /**
   * 记录同步成功日志
   */
  async logSyncSuccess(syncType: string, content: string, details?: any): Promise<void> {
    await this.logBotActivity('info', `${syncType}_sync_success`, `机器人${syncType}同步成功: ${content}`, {
      content,
      syncType,
      ...details
    });
  }

  /**
   * 记录同步失败日志
   */
  async logSyncFailure(syncType: string, content: string, error: string, details?: any): Promise<void> {
    await this.logBotActivity('error', `${syncType}_sync_failed`, `机器人${syncType}同步失败: ${error}`, {
      content,
      syncType,
      error,
      ...details
    });
  }

  /**
   * 记录机器人启动日志
   */
  async logBotStart(botName: string, workMode: string): Promise<void> {
    await this.logBotActivity('info', 'bot_started', `机器人启动成功: ${botName}`, {
      botName,
      workMode
    });
  }

  /**
   * 记录机器人停止日志
   */
  async logBotStop(botName: string): Promise<void> {
    await this.logBotActivity('info', 'bot_stopped', `机器人已停止: ${botName}`);
  }

  /**
   * 记录机器人初始化日志
   */
  async logBotInitialization(botName: string): Promise<void> {
    await this.logBotActivity('info', 'bot_initialized', `机器人已从数据库配置初始化: ${botName}`);
  }

  /**
   * 记录机器人错误日志
   */
  async logBotError(errorType: string, message: string, error?: any): Promise<void> {
    await this.logBotActivity('error', errorType, message, { error: error?.stack || error });
  }

  /**
   * 更新机器人ID和文件日志器
   */
  updateLogger(botId: string | null, fileLogger: any): void {
    this.botId = botId;
    this.fileLogger = fileLogger;
  }
}
