/**
 * 日志管理路由
 * 提供日志查看、下载、清理等功能
 */
import express, { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { authenticateToken } from '../../middleware/auth.ts';
import { LogRotationManager, structuredLogger } from '../../utils/logger.ts';
import { getProjectPath } from '../../utils/logger/core/project-root';

const router: Router = express.Router();

// 日志文件类型映射
const LOG_FILE_TYPES = {
  app: { pattern: /^app-\d{4}-\d{2}-\d{2}\.log$/, description: '应用日志' },
  'app-error': { pattern: /^app-error-\d{4}-\d{2}-\d{2}\.log$/, description: '应用错误日志' },
  bot: { pattern: /^runtime-\d{4}-\d{2}-\d{2}\.log$/, description: '机器人运行日志' },
  'bot-error': { pattern: /^error-\d{4}-\d{2}-\d{2}\.log$/, description: '机器人错误日志' }
};

// 获取日志文件列表
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const { category, botId, limit = 20 } = req.query;
    // 使用项目根目录的绝对路径，避免工作目录变化导致的路径问题
    // 从当前文件位置计算项目根目录: api/routes/system/logs.ts -> ../../
    const logsDir = getProjectPath('logs');
    
    let targetDir = logsDir;
    if (botId && category === 'bot') {
      targetDir = path.join(logsDir, 'bots', botId as string);
    }

    // 检查目录是否存在
    try {
      await fs.access(targetDir);
    } catch {
      return res.json({
        success: true,
        data: {
          files: [],
          total: 0,
          directory: targetDir
        }
      });
    }

    const files = await fs.readdir(targetDir);
    
    // 过滤和排序日志文件
    const logFiles = [];
    for (const file of files) {
      const filePath = path.join(targetDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile() && file.endsWith('.log')) {
        // 确定文件类型
        let fileType = 'unknown';
        let description = '未知日志';
        
        for (const [type, config] of Object.entries(LOG_FILE_TYPES)) {
          if (config.pattern.test(file)) {
            fileType = type;
            description = config.description;
            break;
          }
        }

        logFiles.push({
          name: file,
          type: fileType,
          description,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modified: stats.mtime,
          modifiedFormatted: stats.mtime.toLocaleString('zh-CN'),
          path: filePath
        });
      }
    }

    // 按修改时间倒序排序
    logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());

    // 应用分页
    const limitNum = parseInt(limit as string);
    const paginatedFiles = logFiles.slice(0, limitNum);

    res.json({
      success: true,
      data: {
        files: paginatedFiles,
        total: logFiles.length,
        directory: targetDir
      }
    });

  } catch (error) {
    structuredLogger.api.error('GET', '/api/system/logs/files', error as Error);
    res.status(500).json({
      success: false,
      error: '获取日志文件列表失败'
    });
  }
});

// 获取日志文件内容
router.get('/content/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const { 
      botId, 
      lines = 100, 
      level,
      category,
      search,
      tail = true 
    } = req.query;

    // 确定文件路径
    let filePath: string;
    if (botId) {
      // 使用项目根目录的绝对路径，避免工作目录变化导致的路径问题
      filePath = getProjectPath(path.join('logs', 'bots', botId as string, filename));
    } else {
      filePath = getProjectPath(path.join('logs', filename));
    }

    // 安全检查：确保文件在日志目录内
    // 使用项目根目录的绝对路径，避免工作目录变化导致的路径问题
    // 从当前文件位置计算项目根目录: api/routes/system/logs.ts -> ../../
    const logsDir = getProjectPath('logs');
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(logsDir))) {
      return res.status(403).json({
        success: false,
        error: '访问被拒绝'
      });
    }

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: '日志文件不存在'
      });
    }

    // 读取文件内容
    const content = await fs.readFile(filePath, 'utf-8');
    const allLines = content.split('\n').filter(line => line.trim());

    // 解析日志行
    const parsedLines = allLines.map((line, index) => {
      try {
        const parsed = JSON.parse(line);
        return {
          lineNumber: index + 1,
          timestamp: parsed.timestamp,
          level: parsed.level,
          message: parsed.message,
          category: parsed.category,
          module: parsed.module,
          action: parsed.action,
          meta: parsed.meta,
          raw: line
        };
      } catch {
        return {
          lineNumber: index + 1,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: line,
          category: 'unknown',
          raw: line
        };
      }
    });

    // 应用过滤器
    let filteredLines = parsedLines;

    if (level) {
      filteredLines = filteredLines.filter(line => line.level === level);
    }

    if (category) {
      filteredLines = filteredLines.filter(line => line.category === category);
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredLines = filteredLines.filter(line => 
        line.message.toLowerCase().includes(searchTerm) ||
        (line.module && line.module.toLowerCase().includes(searchTerm))
      );
    }

    // 获取最后N行或前N行
    const linesNum = parseInt(lines as string);
    const resultLines = tail === 'true' 
      ? filteredLines.slice(-linesNum)
      : filteredLines.slice(0, linesNum);

    // 获取文件统计信息
    const stats = await fs.stat(filePath);

    res.json({
      success: true,
      data: {
        filename,
        lines: resultLines,
        totalLines: allLines.length,
        filteredLines: filteredLines.length,
        returnedLines: resultLines.length,
        fileSize: stats.size,
        lastModified: stats.mtime,
        filters: {
          level,
          category,
          search,
          tail: tail === 'true',
          limit: linesNum
        }
      }
    });

  } catch (error) {
    structuredLogger.api.error('GET', '/api/system/logs/content', error as Error);
    res.status(500).json({
      success: false,
      error: '读取日志文件失败'
    });
  }
});

// 获取日志统计信息
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const rotationManager = LogRotationManager.getInstance();
    const stats = rotationManager.getLogStats();

    // 获取各类型日志文件数量
    // 使用项目根目录的绝对路径，避免工作目录变化导致的路径问题
    // 从当前文件位置计算项目根目录: api/routes/system/logs.ts -> ../../
    const logsDir = getProjectPath('logs');
    const typeStats: Record<string, { count: number; size: number }> = {};

    for (const [type, config] of Object.entries(LOG_FILE_TYPES)) {
      typeStats[type] = { count: 0, size: 0 };
    }

    // 扫描主日志目录
    const files = await fs.readdir(logsDir);
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile() && file.endsWith('.log')) {
        for (const [type, config] of Object.entries(LOG_FILE_TYPES)) {
          if (config.pattern.test(file)) {
            typeStats[type].count++;
            typeStats[type].size += stat.size;
            break;
          }
        }
      }
    }

    // 扫描机器人日志目录
    const botsDir = path.join(logsDir, 'bots');
    try {
      const botDirs = await fs.readdir(botsDir);
      let botLogCount = 0;
      let botLogSize = 0;

      for (const botId of botDirs) {
        const botDir = path.join(botsDir, botId);
        const botStat = await fs.stat(botDir);
        
        if (botStat.isDirectory()) {
          const botFiles = await fs.readdir(botDir);
          for (const file of botFiles) {
            if (file.endsWith('.log')) {
              const botFilePath = path.join(botDir, file);
              const botFileStat = await fs.stat(botFilePath);
              botLogCount++;
              botLogSize += botFileStat.size;
            }
          }
        }
      }

      typeStats['bot-total'] = { count: botLogCount, size: botLogSize };
    } catch {
      typeStats['bot-total'] = { count: 0, size: 0 };
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalSize: stats.totalSize,
          totalSizeFormatted: formatFileSize(stats.totalSize),
          totalFiles: stats.fileCount,
          oldestLog: stats.oldestLog,
          newestLog: stats.newestLog
        },
        byType: Object.entries(typeStats).map(([type, data]) => ({
          type,
          description: LOG_FILE_TYPES[type]?.description || '机器人日志汇总',
          count: data.count,
          size: data.size,
          sizeFormatted: formatFileSize(data.size)
        }))
      }
    });

  } catch (error) {
    structuredLogger.api.error('GET', '/api/system/logs/stats', error as Error);
    res.status(500).json({
      success: false,
      error: '获取日志统计信息失败'
    });
  }
});

// 清理旧日志
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    const { daysToKeep = 7, dryRun = false } = req.body;

    if (typeof daysToKeep !== 'number' || daysToKeep < 1) {
      return res.status(400).json({
        success: false,
        error: '保留天数必须是大于0的数字'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // 使用项目根目录的绝对路径，避免工作目录变化导致的路径问题
    // 从当前文件位置计算项目根目录: api/routes/system/logs.ts -> ../../
    const logsDir = getProjectPath('logs');
    const filesToClean = [];
    let totalSizeToClean = 0;

    // 扫描主日志目录
    const files = await fs.readdir(logsDir);
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile() && file.endsWith('.log') && stat.mtime < cutoffDate) {
        filesToClean.push({
          path: filePath,
          name: file,
          size: stat.size,
          modified: stat.mtime,
          type: 'app'
        });
        totalSizeToClean += stat.size;
      }
    }

    // 扫描机器人日志目录
    const botsDir = path.join(logsDir, 'bots');
    try {
      const botDirs = await fs.readdir(botsDir);
      
      for (const botId of botDirs) {
        const botDir = path.join(botsDir, botId);
        const botStat = await fs.stat(botDir);
        
        if (botStat.isDirectory()) {
          const botFiles = await fs.readdir(botDir);
          for (const file of botFiles) {
            if (file.endsWith('.log')) {
              const botFilePath = path.join(botDir, file);
              const botFileStat = await fs.stat(botFilePath);
              
              if (botFileStat.mtime < cutoffDate) {
                filesToClean.push({
                  path: botFilePath,
                  name: `${botId}/${file}`,
                  size: botFileStat.size,
                  modified: botFileStat.mtime,
                  type: 'bot'
                });
                totalSizeToClean += botFileStat.size;
              }
            }
          }
        }
      }
    } catch {
      // 忽略机器人日志目录不存在的错误
    }

    // 如果是预览模式，只返回要清理的文件列表
    if (dryRun) {
      return res.json({
        success: true,
        data: {
          dryRun: true,
          filesToClean: filesToClean.map(f => ({
            name: f.name,
            size: f.size,
            sizeFormatted: formatFileSize(f.size),
            modified: f.modified.toLocaleString('zh-CN'),
            type: f.type
          })),
          totalFiles: filesToClean.length,
          totalSize: totalSizeToClean,
          totalSizeFormatted: formatFileSize(totalSizeToClean),
          cutoffDate: cutoffDate.toLocaleString('zh-CN')
        }
      });
    }

    // 执行实际清理
    let cleanedCount = 0;
    const errors = [];

    for (const file of filesToClean) {
      try {
        await fs.unlink(file.path);
        cleanedCount++;
        structuredLogger.system.info(`已清理过期日志文件: ${file.name}`, {
          module: 'LogCleanup',
          context: { fileSize: file.size, modifiedDate: file.modified }
        });
      } catch (error) {
        errors.push({ file: file.name, error: error.message });
        structuredLogger.system.error(`清理日志文件失败: ${file.name}`, {
          module: 'LogCleanup',
          error: { code: error.name, stack: error.stack }
        });
      }
    }

    res.json({
      success: true,
      data: {
        dryRun: false,
        cleanedCount,
        totalCount: filesToClean.length,
        cleanedSize: totalSizeToClean,
        cleanedSizeFormatted: formatFileSize(totalSizeToClean),
        errors,
        cutoffDate: cutoffDate.toLocaleString('zh-CN')
      }
    });

  } catch (error) {
    structuredLogger.api.error('POST', '/api/system/logs/cleanup', error as Error);
    res.status(500).json({
      success: false,
      error: '清理日志失败'
    });
  }
});

// 工具函数：格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;