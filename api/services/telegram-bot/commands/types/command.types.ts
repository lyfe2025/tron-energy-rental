/**
 * 命令处理器类型定义
 */
import TelegramBot from 'node-telegram-bot-api';
import { orderService } from '../../../order.js';
import { UserService } from '../../../user.js';

export interface CommandHandlerDependencies {
  bot: TelegramBot;
  userService: UserService;
  orderService: typeof orderService;
  botId?: string;
}

export interface CommandHandlerConstructorParams {
  bot: TelegramBot;
  botId?: string;
}

export interface BotConfig {
  welcome_message?: string;
  help_message?: string;
  keyboard_config?: {
    main_menu?: {
      is_enabled: boolean;
      type: 'reply' | 'inline';
      rows: Array<{
        is_enabled: boolean;
        buttons: Array<{
          is_enabled: boolean;
          text: string;
          callback_data?: string;
        }>;
      }>;
    };
  };
}

export interface MessageOptions {
  reply_markup?: any;
  parse_mode?: 'Markdown' | 'HTML';
}

export interface UserRegistrationData {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
  bot_id?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues?: string[];
}
