/**
 * Telegram机器人相关类型定义
 */
import TelegramBot from 'node-telegram-bot-api';

// 基础消息处理器类型
export type MessageHandler = (msg: TelegramBot.Message) => Promise<void>;
export type CallbackQueryHandler = (callbackQuery: TelegramBot.CallbackQuery) => Promise<void>;

// 键盘按钮类型
export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

// 键盘配置类型
export interface InlineKeyboard {
  inline_keyboard: InlineKeyboardButton[][];
}

// 能量包信息类型
export interface EnergyPackage {
  id: string;
  name: string;
  energy: number;
  price: number;
  duration: number;
  description?: string;
}

// 订单信息类型
export interface OrderInfo {
  id: string;
  user_id: string;
  package_id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_address?: string;
  tron_address?: string;
}

// 用户余额信息类型
export interface UserBalance {
  userId: string;
  balance: number;
  frozenBalance: number;
  totalEnergy: number;
}

// 委托状态信息类型
export interface DelegationInfo {
  id: string;
  from_address: string;
  to_address: string;
  amount: number;
  status: string;
  created_at: string;
  expires_at?: string;
}

// 回调查询数据类型
export type CallbackData = 
  | 'buy_energy'
  | 'my_orders' 
  | 'check_balance'
  | 'help_support'
  | 'refresh_menu'
  | `package_${string}`
  | `confirm_package_${string}`
  | `cancel_package_${string}`
  | `confirm_order_${string}`
  | `cancel_order_${string}`
  | `delegation_status_${string}`;

// 错误消息类型
export interface BotError {
  message: string;
  code?: string;
  details?: any;
}

// 配置类型
export interface BotConfig {
  token: string;
  polling?: boolean;
  webhook?: boolean;
  webhookConfig?: {
    url: string;
    secret?: string;
    maxConnections?: number;
    port?: number;
  };
}
