/**
 * Telegram机器人服务 - 多机器人管理架构
 */
export { MultiBotManager, multiBotManager } from './telegram-bot/MultiBotManager.js';
export { TelegramBotService } from './telegram-bot/TelegramBotService.js';
export * from './telegram-bot/types/bot.types.js';

import { multiBotManager } from './telegram-bot/MultiBotManager.js';

// 使用多机器人管理器作为默认导出
export default multiBotManager;

// 向后兼容的接口包装器
export const telegramBotService = {
  // 获取第一个运行中的机器人服务（向后兼容）
  async waitForInitialization() {
    await multiBotManager.waitForInitialization();
    const runningBots = multiBotManager.getRunningBots();
    return runningBots.length > 0 ? runningBots[0].service : null;
  },

  // 设置Webhook
  async setWebhook(url: string) {
    const runningBots = multiBotManager.getRunningBots();
    if (runningBots.length === 0) return false;
    
    try {
      // 为所有运行中的机器人设置Webhook
      const results = await Promise.allSettled(
        runningBots.map(bot => bot.service.setWebhook(url))
      );
      
      return results.some(result => result.status === 'fulfilled' && result.value);
    } catch (error) {
      console.error('设置Webhook失败:', error);
      return false;
    }
  },

  // 获取Webhook信息
  async getWebhookInfo() {
    const runningBots = multiBotManager.getRunningBots();
    if (runningBots.length === 0) return null;
    
    try {
      return await runningBots[0].service.getWebhookInfo();
    } catch (error) {
      console.error('获取Webhook信息失败:', error);
      return null;
    }
  },

  // 删除Webhook
  async deleteWebhook() {
    const runningBots = multiBotManager.getRunningBots();
    if (runningBots.length === 0) return false;
    
    try {
      const results = await Promise.allSettled(
        runningBots.map(bot => bot.service.deleteWebhook())
      );
      
      return results.some(result => result.status === 'fulfilled' && result.value);
    } catch (error) {
      console.error('删除Webhook失败:', error);
      return false;
    }
  },

  // 记录活动日志
  async logBotActivity(level: string, action: string, message: string, metadata?: any) {
    const runningBots = multiBotManager.getRunningBots();
    if (runningBots.length === 0) return;
    
    // 使用第一个机器人记录日志
    await runningBots[0].service.logBotActivity(level as any, action, message, metadata);
  }
};