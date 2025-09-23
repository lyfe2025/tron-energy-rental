/**
 * 回调查询类型定义
 */
import TelegramBot from 'node-telegram-bot-api';
import { orderService } from '../../../order.ts';
import { UserService } from '../../../user.ts';

export interface CallbackHandlerDependencies {
  bot: TelegramBot;
  userService: UserService;
  orderService: typeof orderService;
}

export interface CallbackConfig {
  config?: any;
  logger?: any;
  configManager?: any;
  keyboardBuilder?: any;
}

export interface CallbackHandlerParams extends CallbackConfig {
  bot: TelegramBot;
}

export interface CallbackHandlerConstructorParams extends CallbackHandlerParams {
  // 兼容性：支持旧式直接传入bot的方式
}

export interface MessageSendOptions {
  reply_markup?: any;
  parse_mode?: 'Markdown' | 'HTML';
}

export interface CallbackResult {
  success: boolean;
  error?: string;
}

export interface DelegationResult {
  success: boolean;
  txId?: string;
  delegationId?: string;
  error?: string;
}
