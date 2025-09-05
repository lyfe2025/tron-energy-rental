/**
 * Telegram机器人服务 - 重新导出拆分后的服务模块
 */
export { TelegramBotService } from './telegram-bot/TelegramBotService.js';
export * from './telegram-bot/types/bot.types.js';

import { TelegramBotService } from './telegram-bot/TelegramBotService.js';
// 临时禁用自动创建实例以减少日志噪音
// const telegramBotService = new TelegramBotService();
// export default telegramBotService;
export default null;