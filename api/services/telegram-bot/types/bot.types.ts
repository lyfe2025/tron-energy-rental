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

// 完整消息配置（包含文本和内嵌键盘）
export interface MessageWithInlineKeyboard {
  text: string;
  reply_markup: InlineKeyboard;
  parse_mode?: 'HTML' | 'Markdown';
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
  workMode?: 'polling' | 'webhook';
  polling?: boolean;
  webhook?: boolean;
  webhookConfig?: {
    url: string;
    secret?: string;
    maxConnections?: number;
    port?: number;
  };
}

// 键盘按钮配置类型
export interface KeyboardButtonConfig {
  text: string;
  callback_data?: string;
  url?: string;
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
  is_enabled: boolean;
  price_config_dependency?: 'energy_flash' | 'transaction_package' | 'trx_exchange'; // 依赖的价格配置
  custom_action?: string; // 自定义操作
}

// 键盘行配置类型  
export interface KeyboardRowConfig {
  buttons: KeyboardButtonConfig[];
  is_enabled: boolean;
}

// 键盘类型
export type KeyboardType = 'inline' | 'reply' | 'remove';

// 键盘配置类型
export interface KeyboardConfig {
  type: KeyboardType;
  title?: string;
  description?: string;
  rows: KeyboardRowConfig[];
  is_enabled: boolean;
}

// 机器人键盘配置
export interface BotKeyboardConfiguration {
  main_menu: KeyboardConfig; // 主菜单键盘
  inline_keyboards: {
    [key: string]: KeyboardConfig; // 各种内联键盘配置
  };
  reply_keyboards: {
    [key: string]: KeyboardConfig; // 各种回复键盘配置  
  };
  quick_actions: KeyboardButtonConfig[]; // 快速操作按钮
}

// 扩展的机器人配置接口
export interface ExtendedBotConfig extends BotConfig {
  keyboard_config?: BotKeyboardConfiguration;
}
