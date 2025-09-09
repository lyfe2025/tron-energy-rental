/**
 * Winston 日志配置
 * 支持分层日志：文件系统存储运行日志，数据库存储业务事件
 */
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// 日志级别定义
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// 日志级别类型
export type LogLevel = keyof typeof LOG_LEVELS;

// 业务事件类型（需要存储到数据库）
export const BUSINESS_EVENTS = [
  'bot_started',
  'bot_stopped', 
  'bot_error',
  'config_changed',
  'webhook_registered',
  'webhook_failed',
  'critical_error'
] as const;

export type BusinessEventType = typeof BUSINESS_EVENTS[number];

// 确保日志目录存在
function ensureLogDirectory(botId: string): string {
  const logDir = path.join(process.cwd(), 'logs', 'bots', botId.toString());
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

// 创建机器人专用的文件日志记录器
export function createBotLogger(botId: string): winston.Logger {
  const logDir = ensureLogDirectory(botId);
  
  return winston.createLogger({
    levels: LOG_LEVELS,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      // 运行日志 - 按日期轮转
      new DailyRotateFile({
        filename: path.join(logDir, 'runtime-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d', // 保留14天
        level: 'debug',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),
      
      // 错误日志 - 单独文件
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d', // 错误日志保留更久
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    ]
  });
}

// 全局应用日志记录器
export const appLogger = winston.createLogger({
  levels: LOG_LEVELS,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 应用运行日志
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    
    // 控制台输出（开发环境）
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// 向后兼容性导出
export const logger = appLogger;

// 判断是否为业务事件
export function isBusinessEvent(eventType: string): eventType is BusinessEventType {
  return BUSINESS_EVENTS.includes(eventType as BusinessEventType);
}

// 日志清理工具
export async function cleanupOldLogs(botId: string, daysToKeep: number = 30): Promise<void> {
  const logDir = path.join(process.cwd(), 'logs', 'bots', botId.toString());
  
  if (!fs.existsSync(logDir)) {
    return;
  }
  
  const files = fs.readdirSync(logDir);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  for (const file of files) {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filePath);
      appLogger.info(`已清理过期日志文件: ${filePath}`);
    }
  }
}

// 获取机器人日志文件列表
export function getBotLogFiles(botId: string): Array<{name: string, path: string, size: number, mtime: Date}> {
  const logDir = path.join(process.cwd(), 'logs', 'bots', botId.toString());
  
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
    appLogger.error(`读取日志文件失败 ${filePath}:`, error);
    return [];
  }
}

// 日志轮转管理器
export class LogRotationManager {
  private static instance: LogRotationManager;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private constructor() {}
  
  static getInstance(): LogRotationManager {
    if (!LogRotationManager.instance) {
      LogRotationManager.instance = new LogRotationManager();
    }
    return LogRotationManager.instance;
  }
  
  // 启动定时清理任务
  startCleanupScheduler(intervalHours: number = 24): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // 立即执行一次清理
    this.performCleanup();
    
    // 设置定时任务
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, intervalHours * 60 * 60 * 1000);
    
    appLogger.info(`日志清理调度器已启动，每${intervalHours}小时执行一次`);
  }
  
  // 停止定时清理任务
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      appLogger.info('日志清理调度器已停止');
    }
  }
  
  // 执行清理任务
  private async performCleanup(): Promise<void> {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      
      if (!fs.existsSync(logsDir)) {
        return;
      }
      
      // 清理应用日志
      await this.cleanupAppLogs();
      
      // 清理机器人日志
      const botsDir = path.join(logsDir, 'bots');
      if (fs.existsSync(botsDir)) {
        const botDirs = fs.readdirSync(botsDir);
        for (const botId of botDirs) {
          await cleanupOldLogs(botId, 30); // 保留30天
        }
      }
      
      appLogger.info('日志清理任务完成');
    } catch (error) {
      appLogger.error('日志清理任务失败:', error);
    }
  }
  
  // 清理应用日志
  private async cleanupAppLogs(): Promise<void> {
    const logsDir = path.join(process.cwd(), 'logs');
    const files = fs.readdirSync(logsDir).filter(file => file.startsWith('app-') && file.endsWith('.log'));
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14); // 应用日志保留14天
    
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        appLogger.info(`已清理过期应用日志: ${filePath}`);
      }
    }
  }
  
  // 获取日志统计信息
  getLogStats(): {totalSize: number, fileCount: number, oldestLog: Date | null, newestLog: Date | null} {
    const logsDir = path.join(process.cwd(), 'logs');
    let totalSize = 0;
    let fileCount = 0;
    let oldestLog: Date | null = null;
    let newestLog: Date | null = null;
    
    const scanDirectory = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item.endsWith('.log')) {
          totalSize += stats.size;
          fileCount++;
          
          if (!oldestLog || stats.mtime < oldestLog) {
            oldestLog = stats.mtime;
          }
          if (!newestLog || stats.mtime > newestLog) {
            newestLog = stats.mtime;
          }
        }
      }
    };
    
    scanDirectory(logsDir);
    
    return { totalSize, fileCount, oldestLog, newestLog };
  }
}