/**
 * Telegram Bot Processor 模块的类型定义
 */
import type TelegramBot from 'node-telegram-bot-api';

// API 接口定义
export interface TelegramBotAPI {
  sendMessage: (chatId: number, message: string, options?: TelegramBot.SendMessageOptions) => Promise<TelegramBot.Message>;
  answerCallbackQuery: (callbackQueryId: string, options?: TelegramBot.AnswerCallbackQueryOptions) => Promise<boolean>;
}

// 日志接口定义
export interface Logger {
  logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
}

// 处理器依赖接口
export interface ProcessorDependencies {
  commandHandler: any; // CommandHandler
  callbackHandler: any; // CallbackHandler  
  keyboardBuilder: any; // KeyboardBuilder
  api: TelegramBotAPI;
  logger: Logger;
  bot?: TelegramBot;
  botId?: string;
}

// 消息处理结果
export interface MessageProcessResult {
  success: boolean;
  action?: string;
  description?: string;
  error?: Error;
}

// 价格配置类型
export interface PriceConfig {
  name: string;
  description: string;
  config: any;
  inline_keyboard_config: any;
  image_url?: string;
  image_alt?: string;
  enable_image?: boolean;
}

// 回复键盘按钮映射
export interface ReplyKeyboardMapping {
  [buttonText: string]: string;
}

// 消息格式化选项
export interface MessageFormatOptions {
  price?: number;
  max?: number;
  duration?: number;
  [key: string]: any;
}

// 模板变量
export interface TemplateVariables {
  [key: string]: any;
}

// 处理器基础类接口
export interface ProcessorBase {
  updateDependencies(dependencies: Partial<ProcessorDependencies>): void;
}

// 消息处理器接口
export interface MessageHandler extends ProcessorBase {
  processMessage(message: any): Promise<MessageProcessResult>;
}

// 回调查询处理器接口
export interface CallbackHandler extends ProcessorBase {
  processCallbackQuery(callbackQuery: any): Promise<MessageProcessResult>;
}

// 命令处理器接口
export interface CommandHandler extends ProcessorBase {
  handleCommand(command: string, message: any): Promise<MessageProcessResult>;
}

// 文本消息处理器接口
export interface TextMessageHandler extends ProcessorBase {
  handleTextMessage(message: any): Promise<MessageProcessResult>;
  handleReplyKeyboardButtons(message: any, text: string): Promise<boolean>;
}

// 更新路由器接口
export interface UpdateRouter extends ProcessorBase {
  route(update: any): Promise<MessageProcessResult>;
}
