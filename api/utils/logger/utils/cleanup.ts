/**
 * 日志清理工具
 */
import fs from 'fs';
import path from 'path';
// 避免循环引用，不导入 systemLogger

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
      // 避免循环引用，直接使用console
      console.log(`已清理过期日志文件: ${filePath}`);
    }
  }
}

// 清理应用日志
export async function cleanupAppLogs(): Promise<void> {
  const logsDir = path.join(process.cwd(), 'logs');
  const files = fs.readdirSync(logsDir).filter(file => file.startsWith('app-') && file.endsWith('.log'));
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 14); // 应用日志保留14天
  
  for (const file of files) {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filePath);
      console.log(`已清理过期应用日志: ${filePath}`);
    }
  }
}
