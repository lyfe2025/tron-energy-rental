/**
 * 项目根目录定位工具
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 查找项目根目录（包含package.json的目录）
 * @param startDir 开始查找的目录，默认为当前文件所在目录
 * @returns 项目根目录的绝对路径
 */
export function findProjectRoot(startDir?: string): string {
  const __dirname = startDir || path.dirname(fileURLToPath(import.meta.url));
  
  let currentDir = __dirname;
  
  // 向上查找包含 package.json 的目录
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  // 如果找不到，抛出错误
  throw new Error(`无法找到项目根目录 (package.json)，起始目录: ${__dirname}`);
}

/**
 * 获取日志目录路径
 * @param subPath 日志子路径，如 'api', 'bots/botId', 'system' 等
 * @returns 日志目录的绝对路径
 */
export function getLogDir(subPath: string): string {
  const projectRoot = findProjectRoot();
  return path.join(projectRoot, 'logs', subPath);
}

/**
 * 获取项目根目录下的路径
 * @param subPath 相对于项目根目录的路径
 * @returns 绝对路径
 */
export function getProjectPath(subPath: string): string {
  const projectRoot = findProjectRoot();
  return path.join(projectRoot, subPath);
}
