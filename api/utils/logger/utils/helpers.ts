/**
 * 日志辅助函数
 */
import fs from 'fs';
import path from 'path';
import { getLogDir } from '../core/project-root';
import type { LogMetadata } from '../core/types';
import { LOG_CATEGORIES } from '../core/types';

// 获取机器人日志文件列表
export function getBotLogFiles(botId: string): Array<{name: string, path: string, size: number, mtime: Date}> {
  const logDir = getLogDir(`bots/${botId}`);
  
  if (!fs.existsSync(logDir)) {
    return [];
  }
  
  return fs.readdirSync(logDir)
    .filter(file => file.endsWith('.log'))
    .map(file => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        size: stats.size,
        mtime: stats.mtime
      };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // 按修改时间倒序
}

// 读取日志文件内容
export async function readLogFile(filePath: string): Promise<Array<{timestamp: string, level: string, message: string, action?: string, metadata?: any}>> {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      try {
        const parsed = JSON.parse(line);
        return {
          timestamp: parsed.timestamp,
          level: parsed.level,
          message: parsed.message,
          action: parsed.action,
          metadata: parsed.metadata || parsed.meta
        };
      } catch (parseError) {
        // 如果解析失败，返回原始文本
        return {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: line,
          action: 'raw_log'
        };
      }
    });
  } catch (error) {
    console.error(`读取日志文件失败 ${filePath}:`, error);
    return [];
  }
}

// 结构化日志辅助函数 - 需要在index.ts中绑定appLogger
export function createStructuredLogger(appLogger: any) {
  return {
    // 系统日志
    system: {
      info: (message: string, meta?: LogMetadata) => 
        appLogger.info(message, { category: LOG_CATEGORIES.SYSTEM, ...meta }),
      warn: (message: string, meta?: LogMetadata) => 
        appLogger.warn(message, { category: LOG_CATEGORIES.SYSTEM, ...meta }),
      error: (message: string, meta?: LogMetadata) => 
        appLogger.error(message, { category: LOG_CATEGORIES.SYSTEM, ...meta })
    },
    
    // API日志
    api: {
      request: (method: string, path: string, meta?: LogMetadata) => 
        appLogger.info(`${method} ${path}`, { category: LOG_CATEGORIES.API, action: 'request', ...meta }),
      response: (method: string, path: string, status: number, duration?: number, meta?: LogMetadata) => 
        appLogger.info(`${method} ${path} - ${status}`, { 
          category: LOG_CATEGORIES.API, 
          action: 'response', 
          duration,
          ...meta 
        }),
      error: (method: string, path: string, error: Error, meta?: LogMetadata) => 
        appLogger.error(`${method} ${path} - Error: ${error.message}`, { 
          category: LOG_CATEGORIES.API, 
          action: 'error',
          error: { code: error.name, stack: error.stack },
          ...meta 
        })
    },
    
    // 机器人日志
    bot: {
      start: (botId: string, meta?: LogMetadata) => 
        appLogger.info(`Bot started: ${botId}`, { category: LOG_CATEGORIES.BOT, action: 'start', ...meta }),
      stop: (botId: string, meta?: LogMetadata) => 
        appLogger.info(`Bot stopped: ${botId}`, { category: LOG_CATEGORIES.BOT, action: 'stop', ...meta }),
      error: (botId: string, error: Error, meta?: LogMetadata) => 
        appLogger.error(`Bot error: ${botId} - ${error.message}`, { 
          category: LOG_CATEGORIES.BOT, 
          action: 'error',
          error: { code: error.name, stack: error.stack },
          ...meta 
        })
    },
    
    // TRON网络日志
    tron: {
      transaction: (txId: string, action: string, meta?: LogMetadata) => 
        appLogger.info(`TRON ${action}: ${txId}`, { category: LOG_CATEGORIES.TRON, action, ...meta }),
      error: (action: string, error: Error, meta?: LogMetadata) => 
        appLogger.error(`TRON ${action} failed: ${error.message}`, { 
          category: LOG_CATEGORIES.TRON, 
          action: 'error',
          error: { code: error.name, stack: error.stack },
          ...meta 
        })
    },
    
    // 数据库日志
    database: {
      query: (sql: string, duration?: number, meta?: LogMetadata) => 
        appLogger.debug(`Database query executed`, { 
          category: LOG_CATEGORIES.DATABASE, 
          action: 'query',
          duration,
          context: { sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : '') },
          ...meta 
        }),
      error: (sql: string, error: Error, meta?: LogMetadata) => 
        appLogger.error(`Database query failed: ${error.message}`, { 
          category: LOG_CATEGORIES.DATABASE, 
          action: 'error',
          error: { code: error.name, stack: error.stack },
          context: { sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : '') },
          ...meta 
        })
    },
    
    // 业务日志
    business: {
      info: (action: string, message: string, meta?: LogMetadata) => 
        appLogger.info(message, { category: LOG_CATEGORIES.BUSINESS, action, ...meta }),
      warn: (action: string, message: string, meta?: LogMetadata) => 
        appLogger.warn(message, { category: LOG_CATEGORIES.BUSINESS, action, ...meta }),
      error: (action: string, error: Error, meta?: LogMetadata) => 
        appLogger.error(`Business error in ${action}: ${error.message}`, { 
          category: LOG_CATEGORIES.BUSINESS, 
          action: 'error',
          error: { code: error.name, stack: error.stack },
          ...meta 
        })
    }
  };
}
