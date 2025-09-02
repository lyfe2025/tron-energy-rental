/**
 * Telegram机器人服务 - 重新导出拆分后的服务模块
 */
export { TelegramBotService } from './telegram-bot/TelegramBotService.js';
export * from './telegram-bot/types/bot.types.js';

import { TelegramBotService } from './telegram-bot/TelegramBotService.js';
const telegramBotService = new TelegramBotService();
export default telegramBotService;