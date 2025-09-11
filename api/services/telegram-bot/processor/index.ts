/**
 * Telegram Bot Processor 模块统一导出
 */

// 核心处理器
export { CallbackProcessor } from './CallbackProcessor.js';
export { CommandProcessor } from './CommandProcessor.js';
export { MessageProcessor } from './MessageProcessor.js';
export { UpdateRouter } from './UpdateRouter.js';

// 消息处理器
export { TextMessageHandler } from './handlers/TextMessageHandler.js';

// 类型定义
export * from './types.js';

// 保持向后兼容，重新导出原始处理器（已重构版本）
export { TelegramBotProcessor } from './TelegramBotProcessor.js';
