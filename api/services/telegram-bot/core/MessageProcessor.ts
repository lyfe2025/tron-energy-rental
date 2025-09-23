/**
 * 消息处理器
 * 负责处理Telegram消息和回调查询的路由和分发
 */
import TelegramBot from 'node-telegram-bot-api';
import { CallbackHandler } from '../callbacks/CallbackHandler.ts';
import { CommandHandler } from '../commands/CommandHandler.ts';
import { KeyboardBuilder } from '../keyboards/KeyboardBuilder.ts';

export class MessageProcessor {
  private commandHandler: CommandHandler;
  private callbackHandler: CallbackHandler;
  private keyboardBuilder: KeyboardBuilder;
  private apiHandlers: {
    sendMessage: (chatId: number, message: string, options?: TelegramBot.SendMessageOptions) => Promise<TelegramBot.Message>;
    answerCallbackQuery: (callbackQueryId: string, options?: TelegramBot.AnswerCallbackQueryOptions) => Promise<boolean>;
  };
  private logger: {
    logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, metadata?: any) => Promise<void>;
  };
  private bot: TelegramBot;

  constructor(
    commandHandler: CommandHandler,
    callbackHandler: CallbackHandler,
    keyboardBuilder: KeyboardBuilder,
    apiHandlers: {
      sendMessage: (chatId: number, message: string, options?: TelegramBot.SendMessageOptions) => Promise<TelegramBot.Message>;
      answerCallbackQuery: (callbackQueryId: string, options?: TelegramBot.AnswerCallbackQueryOptions) => Promise<boolean>;
    },
    logger: {
      logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, metadata?: any) => Promise<void>;
    },
    bot: TelegramBot
  ) {
    this.commandHandler = commandHandler;
    this.callbackHandler = callbackHandler;
    this.keyboardBuilder = keyboardBuilder;
    this.apiHandlers = apiHandlers;
    this.logger = logger;
    this.bot = bot;
  }

  /**
   * 处理普通消息
   */
  async processMessage(message: TelegramBot.Message): Promise<void> {
    try {
      const chatId = message.chat.id;
      const messageText = message.text || '';
      
      await this.logger.logBotActivity('debug', 'message_received', `收到消息: ${messageText}`, {
        chatId,
        userId: message.from?.id,
        username: message.from?.username,
        messageId: message.message_id
      });

      // 检查是否是命令
      if (messageText.startsWith('/')) {
        await this.processCommand(message);
      } else {
        // 处理普通文本消息
        await this.processTextMessage(message);
      }
    } catch (error) {
      console.error('处理消息时出错:', error);
      await this.logger.logBotActivity('error', 'message_processing_error', `处理消息失败: ${error.message}`, {
        error: error.stack,
        messageId: message.message_id,
        chatId: message.chat.id
      });
    }
  }

  /**
   * 处理命令消息
   */
  private async processCommand(message: TelegramBot.Message): Promise<void> {
    const command = message.text?.split(' ')[0]?.substring(1); // 移除 '/' 前缀
    
    if (!command) {
      return;
    }

    await this.logger.logBotActivity('info', 'command_received', `收到命令: /${command}`, {
      chatId: message.chat.id,
      userId: message.from?.id,
      username: message.from?.username,
      command
    });

    // 路由到相应的命令处理器
    switch (command.toLowerCase()) {
      case 'start':
        await this.commandHandler.handleStartCommand(message);
        break;
      case 'help':
        await this.commandHandler.handleHelpCommand(message);
        break;
      case 'menu':
        await this.commandHandler.handleMenuCommand(message);
        break;
      case 'balance':
        await this.commandHandler.handleBalanceCommand(message);
        break;
      case 'orders':
        await this.commandHandler.handleOrdersCommand(message);
        break;
      default:
        await this.handleUnknownCommand(message, command);
        break;
    }
  }

  /**
   * 处理普通文本消息
   */
  private async processTextMessage(message: TelegramBot.Message): Promise<void> {
    const messageText = message.text || '';
    const chatId = message.chat.id;

    // 检查是否是回复键盘按钮文本
    await this.processReplyKeyboardButton(message, messageText);
  }

  /**
   * 处理回复键盘按钮
   */
  private async processReplyKeyboardButton(message: TelegramBot.Message, buttonText: string): Promise<void> {
    const chatId = message.chat.id;

    // 根据按钮文本路由到相应的处理
    switch (buttonText) {
      case '🔋 购买能量':
        await this.keyboardBuilder.showEnergyPackages(chatId);
        break;
      case '📋 我的订单':
        await this.commandHandler.handleOrdersCommand(message);
        break;
      case '💰 账户余额':
        await this.commandHandler.handleBalanceCommand(message);
        break;
      case '❓ 帮助支持':
        await this.commandHandler.handleHelpCommand(message);
        break;
      case '🔄 刷新菜单':
        await this.keyboardBuilder.showMainMenu(chatId);
        break;
      default:
        // 处理未识别的文本消息
        await this.handleUnknownText(message, buttonText);
        break;
    }
  }

  /**
   * 处理回调查询
   */
  async processCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    try {
      const chatId = callbackQuery.message?.chat.id;
      const data = callbackQuery.data || '';
      
      if (!chatId) {
        console.warn('回调查询缺少聊天ID');
        return;
      }

      await this.logger.logBotActivity('debug', 'callback_received', `收到回调查询: ${data}`, {
        chatId,
        userId: callbackQuery.from.id,
        username: callbackQuery.from.username,
        callbackId: callbackQuery.id
      });

      // 先回答回调查询
      await this.apiHandlers.answerCallbackQuery(callbackQuery.id);

      // 路由到相应的回调处理器
      await this.callbackHandler.handleCallbackQuery(callbackQuery);

    } catch (error) {
      console.error('处理回调查询时出错:', error);
      await this.logger.logBotActivity('error', 'callback_processing_error', `处理回调查询失败: ${error.message}`, {
        error: error.stack,
        callbackId: callbackQuery.id,
        data: callbackQuery.data
      });
    }
  }

  /**
   * 处理未知命令
   */
  private async handleUnknownCommand(message: TelegramBot.Message, command: string): Promise<void> {
    const chatId = message.chat.id;
    
    await this.logger.logBotActivity('warn', 'unknown_command', `未知命令: /${command}`, {
      chatId,
      userId: message.from?.id,
      command
    });

    await this.apiHandlers.sendMessage(chatId, 
      `❓ 未知命令 "/${command}"\n\n请使用 /help 查看可用命令，或点击 /menu 显示主菜单。`
    );
  }

  /**
   * 处理未识别的文本
   */
  private async handleUnknownText(message: TelegramBot.Message, text: string): Promise<void> {
    const chatId = message.chat.id;
    
    await this.logger.logBotActivity('debug', 'unknown_text', `未识别的文本: ${text}`, {
      chatId,
      userId: message.from?.id,
      text: text.substring(0, 100) // 只记录前100个字符
    });

    // 显示主菜单作为默认响应
    await this.keyboardBuilder.showMainMenu(chatId);
  }

  /**
   * 更新处理器实例
   */
  updateHandlers(
    commandHandler: CommandHandler,
    callbackHandler: CallbackHandler,
    keyboardBuilder: KeyboardBuilder
  ): void {
    this.commandHandler = commandHandler;
    this.callbackHandler = callbackHandler;
    this.keyboardBuilder = keyboardBuilder;
  }
}
