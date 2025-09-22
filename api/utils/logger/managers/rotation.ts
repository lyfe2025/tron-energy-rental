/**
 * 日志轮转管理器
 */
import fs from 'fs';
import path from 'path';
import { cleanupAppLogs, cleanupOldLogs } from '../utils/cleanup';

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
    
    console.log(`日志清理调度器已启动，每${intervalHours}小时执行一次`);
  }
  
  // 停止定时清理任务
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('日志清理调度器已停止');
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
      await cleanupAppLogs();
      
      // 清理机器人日志
      const botsDir = path.join(logsDir, 'bots');
      if (fs.existsSync(botsDir)) {
        const botDirs = fs.readdirSync(botsDir);
        for (const botId of botDirs) {
          await cleanupOldLogs(botId, 30); // 保留30天
        }
      }
      
      console.log('日志清理任务完成');
    } catch (error) {
      console.error('日志清理任务失败:', error);
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
