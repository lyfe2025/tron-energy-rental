/**
 * local server entry file, for local development
 */
import app from './app.js';
import { schedulerService } from './services/scheduler.js';
import { multiBotManager } from './services/telegram-bot.js';
import { LogRotationManager, appLogger } from './utils/logger.js';

/**
 * start server with port
 */
const PORT = parseInt(process.env.PORT || '3001');
const HOST_ADDRESS = process.env.HOST_ADDRESS || '0.0.0.0';

const server = app.listen(PORT, HOST_ADDRESS, async () => {
  console.log(`🚀 Server running on ${HOST_ADDRESS}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 启动调度器服务
  schedulerService.start();
  console.log('Scheduler service started');
  
  // 启动日志轮转管理器
  const logManager = LogRotationManager.getInstance();
  logManager.startCleanupScheduler(24); // 每24小时清理一次
  appLogger.info('日志轮转管理器已启动');

  // 启动多机器人管理器
  try {
    console.log('🚀 正在启动多机器人管理器...');
    await multiBotManager.initialize();
    console.log('✅ 多机器人管理器已启动');
    
    // 输出机器人状态报告
    const status = multiBotManager.getManagerStatus();
    console.log(`📊 机器人状态: ${status.runningBots}/${status.totalBots} 个机器人正在运行`);
    
    if (status.runningBots > 0) {
      console.log('🤖 运行中的机器人:');
      status.botDetails
        .filter(bot => bot.status === 'running')
        .forEach(bot => {
          console.log(`  - ${bot.name} (${bot.workMode} 模式)`);
        });
    }
  } catch (error) {
    console.error('❌ 多机器人管理器启动失败:', error);
    console.warn('⚠️ 服务器将继续运行，但Telegram功能不可用');
  }
});

/**
 * close server
 */
async function gracefulShutdown(signal: string) {
  console.log(`${signal} signal received`);
  console.log('🛑 开始优雅关闭服务器...');
  
  try {
    // 停止多机器人管理器
    console.log('🤖 正在停止所有机器人...');
    await multiBotManager.stopAll();
    console.log('✅ 所有机器人已停止');
    
    // 停止日志轮转管理器
    console.log('📝 正在停止日志轮转管理器...');
    const logManager = LogRotationManager.getInstance();
    logManager.stopCleanupScheduler();
    console.log('✅ 日志轮转管理器已停止');
    
    // 关闭HTTP服务器
    console.log('🌐 正在关闭HTTP服务器...');
    server.close(() => {
      console.log('✅ HTTP服务器已关闭');
      console.log('🎯 进程优雅退出完成');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ 优雅关闭过程中出现错误:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;