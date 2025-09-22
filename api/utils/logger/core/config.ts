/**
 * Logger 基础配置
 */
import fs from 'fs';
import path from 'path';

// 确保日志目录存在
export function ensureLogDirectory(botId: string): string {
  const logDir = path.join(process.cwd(), 'logs', 'bots', botId.toString());
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

// 确保通用日志目录存在
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
