/**
 * Logger 基础配置
 */
import fs from 'fs';
import { getLogDir } from './project-root';

// 确保日志目录存在
export function ensureLogDirectory(botId: string): string {
  const logDir = getLogDir(`bots/${botId}`);
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
