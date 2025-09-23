/**
 * Telegram Bot Processor 模块统一导出
 */

// 核心处理器
export { CallbackProcessor } from './CallbackProcessor.ts';
export { CommandProcessor } from './CommandProcessor.ts';
export { MessageProcessor } from './MessageProcessor.ts';
export { UpdateRouter } from './UpdateRouter.ts';

// 消息处理器
export { TextMessageHandler } from './handlers/TextMessageHandler.ts';

// 类型定义
export * from './types.ts';

// 保持向后兼容，重新导出原始处理器（已重构版本）
export { TelegramBotProcessor } from './TelegramBotProcessor.ts';
